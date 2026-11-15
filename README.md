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
  30-bar EMA, **or** at least 2.5% below the 60-bar high. Both are the same
  idea seen two ways: price has fallen fast, so a bounce is worth more than
  the ~26 bps a full-size round trip costs in fees, slippage and impact.
- **Exit** (whole position): a 1% trailing stop from the highest close since
  entry, or a hard stop at 1.5% below cost. No take-profit target: the
  trailing stop lets a real rally run and cuts it only when it turns.
- No new entries in the final 10 bars of the window.

## Why this shape

The dev window trends down about 4% overall, so buy-and-hold loses and any
strategy that chases every uptick pays the round-trip cost too often. The
edge here is selectivity: the bot sits in cash through the grind and only
buys after a fast, outsized drop, when the next bounce is most likely to
clear the cost of trading. On the dev window it trades 6 times (3 round
trips), which keeps fee drag small.

## Determinism

Float64 EMA and rolling high over closes only; no randomness, no wall
clock, no environment, no files. Two runs on the same data produce
identical action logs (verified with the kit's local grader).

## Local dev grade

- Net PnL: **+21.769200 USDC**
- Trades: 6, max drawdown: 2.97%, fees: 2.395080 USDC
- Guardrails met; L1 regrade reproduced byte for byte.

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript, stdlib only)
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's SDK shim
- `LICENSE` — MIT
