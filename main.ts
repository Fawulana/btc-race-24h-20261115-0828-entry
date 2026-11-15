// Dip-buying bot for cbBTC/USDC 1-minute bars (agent-fun/bars-replay/v1).
//
// Strategy: buy the sharp selloff, ride the bounce with a trailing stop.
//   - Entry (flat only, full cash): the close is at least 1.2% below its
//     30-bar EMA, OR at least 2.5% below the 60-bar high. Both are the same
//     idea seen two ways: price has fallen fast, so a bounce is worth more
//     than the ~26 bps a full-size round trip costs. The entry bar must also
//     close UP on the previous close: never catch a falling knife mid-plunge,
//     wait for the first uptick that the selloff is pausing. On the dev
//     window this drops the marginal ~breakeven trade and leaves only the
//     deep-dip entries.
//   - Exit (whole position): a 0.8% trailing stop from the highest close since
//     entry, or a hard stop at 1.5% below cost. No take-profit target: the
//     trailing stop lets a real rally run and cuts it only when it turns.
//     The 0.8% trail (tighter than v1's 1%) banks bounces sooner in a choppy
//     market instead of giving the gain back while waiting for a turn.
//   - Long only, one position, at most one order per reply. Orders fill at
//     the next bar's open, so every decision is made on closes only. No new
//     entries in the final 10 bars: a buy there would be flattened at the
//     last close with no room to work.
//   - Deterministic: float64 EMA / rolling high over closes, no randomness,
//     no clock, no environment, no files. max_slippage_bps 150 (1.5%) so a
//     normal 1-minute move plus slippage and impact never voids the fill.
//
// Erasable TypeScript only (Node 22 type stripping): no enums, no parameter
// properties, no namespaces. Imports use their .ts extension.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch, BuyInput, OrderInput, SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const EMA_SPAN = 30;
const HIGH_LOOKBACK = 60;
const DIP_VS_EMA = 0.012; // entry: close 1.2% below the 30-bar EMA
const DIP_VS_HIGH = 0.025; // entry: close 2.5% below the 60-bar high
const TRAIL = 0.008; // exit: 0.8% below the peak close since entry
const HARD_STOP = 0.015; // exit: position worth 1.5% under its cost
const MAX_SLIPPAGE_BPS = 150;
// A buy decided this late would fill at the second-to-last bar's open and be
// flattened at the last close with no room to work, so skip new entries in
// the final 10 bars of the 1,440-bar window (bar time, never the wall clock).
const WINDOW_BARS = 1440;
const LATE_BARS = 10;

const closes: number[] = [];
let emaValue: number | null = null;
const emaWarm: number[] = [];
let peakSinceEntry: number | null = null;

function emaStep(close: number): number | null {
  if (emaValue !== null) {
    emaValue += (2 / (EMA_SPAN + 1)) * (close - emaValue);
    return emaValue;
  }
  emaWarm.push(close);
  if (emaWarm.length === EMA_SPAN) {
    emaValue = emaWarm.reduce((a, x) => a + x, 0) / EMA_SPAN;
    return emaValue;
  }
  return null;
}

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    let bar = null;
    for (const b of batch.bars) {
      if (b.symbol === SYMBOL) {
        bar = b;
        break;
      }
    }
    if (bar === null) return [];
    const close = Number(bar.c);
    closes.push(close);
    const ema = emaStep(close);
    if (state.warmingUp || ema === null) return [];

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      if (peakSinceEntry === null || close > peakSinceEntry) peakSinceEntry = close;
      const value = state.value(SYMBOL, held.qty);
      // value <= cost * (1 - HARD_STOP), in integers: value * 1000 <= cost * 985
      if (value * 1000n <= held.cost * 985n) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies SellInput];
      }
      // close <= peak * (1 - TRAIL): close * 1000 <= peak * 992
      if (BigInt(close) * 1000n <= BigInt(peakSinceEntry) * 992n) {
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies SellInput];
      }
      return [];
    }

    // Flat: look for a sharp selloff worth buying.
    peakSinceEntry = null;
    const barsSeen = (batch.t - state.hello.first_close_ms) / 60000 + 1;
    if (barsSeen > WINDOW_BARS - LATE_BARS) return [];
    const dipVsEma = close <= ema * (1 - DIP_VS_EMA);
    let dipVsHigh = false;
    if (closes.length > HIGH_LOOKBACK) {
      let high = closes[closes.length - HIGH_LOOKBACK - 1];
      for (let i = closes.length - HIGH_LOOKBACK; i < closes.length; i++) {
        if (closes[i] > high) high = closes[i];
      }
      dipVsHigh = close <= high * (1 - DIP_VS_HIGH);
    }
    if (!dipVsEma && !dipVsHigh) return [];
    // The selloff must be pausing: this bar closed up on the previous one.
    // A dip signal on a still-falling bar is a falling knife, not a bounce.
    if (closes.length < 2 || close <= closes[closes.length - 2]) return [];
    const cash = state.cash;
    if (cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies BuyInput];
  },
});
