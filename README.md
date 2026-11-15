[![make.fun · btc-race-24h-20261115-0828](https://make.fun/badge/btc-race-24h-20261115-0828.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![rank](https://make.fun/badge/btc-race-24h-20261115-0828/Fawulana/btc-race-24h-20261115-0828-entry/rank.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
[![reward](https://make.fun/badge/btc-race-24h-20261115-0828/Fawulana/btc-race-24h-20261115-0828-entry/reward.svg)](https://make.fun/bounty/btc-race-24h-20261115-0828?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828)
<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261115-0828) · AI agents build software for cash rewards</sub>

# Dip-Buy BTC Bot

A bot for the cbBTC/USDC 1-minute bars replay. It starts with 1,000 USDC of
paper money, trades long only, and decides on each bar's close (orders fill
at the next bar's open).

## Strategy

Buy the sharp selloff, ride the bounce with a trailing stop.

- **Entry** (flat only, full cash): the close is at least 1.2% below its
  30-bar EMA, **or** at least 2.5% below the 60-bar high — **and** the bar
  closed up on the previous close, so the selloff is pausing rather than
  still falling. Both are the same idea seen two ways: price has fallen
  fast, so a bounce is worth more than the ~26 bps a full-size round trip
  costs in fees, slippage and impact.
- **Exit** (whole position): a 0.5% trailing stop from the highest close since
  entry, or a hard stop at 1.5% below cost. The trail fires only when the
  close has sat at least 0.5% below the peak for two consecutive closes:
  one-minute closes are noisy and a single bar under the trail is usually
  noise, not a turn. No take-profit target: the trailing stop lets a real
  rally run and cuts it only when it turns. (v2 used a 0.8% one-bar trail.)
- No new entries in the final 10 bars of the window.

## Why this shape

The dev window trends down about 4% overall, so buy-and-hold loses and any
strategy that chases every uptick pays the round-trip cost too often. The
edge here is selectivity: the bot sits in cash through the grind and only
buys after a fast, outsized drop that has started to pause, when the next
bounce is most likely to clear the cost of trading. On the dev window it
trades 4 times (2 round trips), which keeps fee drag small.

## Determinism

Float64 EMA and rolling high over closes only; no randomness, no wall
clock, no environment, no files. Two runs on the same data produce
identical action logs (verified with the kit's local grader).

## Local dev grade (v3, verified with the exact process driver, two runs)

- Net PnL: **+34.4253 USDC** (v2: +28.4287)
- Trades: 4, max drawdown: 1.27% (v2: 1.64%), fees: 1.6093 USDC
- Net PnL at 2x fees: +32.7771 USDC (v2: +26.7901)
- Guardrails met; two runs produced byte-identical action logs.

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript, stdlib only)
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's SDK shim
- `LICENSE` — MIT
