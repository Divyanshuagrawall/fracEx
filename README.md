# FracEx — Fractional Asset Trading Platform

A full-stack trading platform simulating fractional equity trading with a real matching engine, live price feeds, and transactional fund/share settlement — built to model the core mechanics of a real brokerage backend (order books, reservations, partial fills, and race-condition-safe settlement).

## Why this project

Most trading-app clones stop at "place an order, update a database." FracEx goes further: it implements the actual hard parts of a trading system — **price-time priority matching**, **fund/share locking to prevent overselling**, **optimistic concurrency control** for concurrent order matching, and **transactional settlement** so a trade either fully completes or fully rolls back, never leaving the system in a half-updated state.

## Tech Stack

**Frontend:** React (Vite), Tailwind CSS, Socket.io-client
**Backend:** Node.js, Express, Socket.io
**Database:** MongoDB (replica set, for multi-document transactions), Mongoose
**Queue / Matching Engine:** Redis, BullMQ (dedicated worker process)
**Infrastructure:** Docker Compose (mongo, redis, server, worker — 4 containers)

## Architecture

```
┌─────────────┐      REST + WebSocket      ┌──────────────┐
│   React     │ ─────────────────────────▶ │   Express    │
│  (client)   │ ◀───────────────────────── │   Server     │
└─────────────┘      priceUpdate/           └──────┬───────┘
                      orderFilled events            │ enqueues job
                                                     ▼
                                              ┌──────────────┐
                                              │    Redis     │
                                              │  (BullMQ)    │
                                              └──────┬───────┘
                                                     │
                                                     ▼
                                              ┌──────────────┐
                                              │    Worker    │
                                              │ (matching    │
                                              │  engine)     │
                                              └──────┬───────┘
                                                     │ transactional
                                                     ▼   settlement
                                              ┌──────────────┐
                                              │   MongoDB    │
                                              │  (replica    │
                                              │   set rs0)   │
                                              └──────────────┘
```

Order placement and order matching are deliberately decoupled: the Express server only validates and reserves funds/shares, then hands off to a dedicated BullMQ worker that runs the actual matching engine. This keeps the API responsive under load and isolates the highest-risk logic (money and share movement) in one auditable place.

## Core Features

- **Price-time priority matching engine** — incoming orders match against the best-priced resting order first; ties broken by order timestamp
- **Fund & share locking** — placing an order reserves the required cash or shares immediately, preventing double-spending across concurrent orders from the same user
- **Partial fills** — orders can match against multiple counterparties across multiple fills, with reservations adjusted incrementally as each fill occurs
- **Transactional settlement** — every trade (order updates + wallet updates on both sides) runs inside a MongoDB multi-document transaction, so a failure mid-trade rolls back cleanly instead of corrupting balances
- **Optimistic concurrency control with retry** — order and wallet documents use versioned writes; if two matches attempt to touch the same document simultaneously, the loser retries against fresh data instead of overwriting a concurrent update
- **Live price broadcasting** — trade executions push price updates to all connected clients via Socket.io, no polling
- **Portfolio valuation** — real-time total portfolio value (cash + holdings at current market price), with a live per-asset breakdown
- **Input validation & guardrails** — rejects non-positive prices, non-positive or non-integer quantities, and insufficient-funds/insufficient-holdings orders before they ever reach the matching engine

## Engineering Highlights (bugs found & fixed)

Building this surfaced several subtle correctness issues typical of real trading systems — documented here because diagnosing them was as valuable as building the feature itself:

1. **Silent schema drift across services.** The worker process kept its own copy of the Mongoose models (a consequence of running server and worker as separate containers/codebases). When `reservedCash` and `reservedQuantity` fields were added to the wallet schema, only the server's copy was updated. Mongoose silently drops any field not declared in its schema on `.save()` — so the worker's settlement logic was writing correct `quantity` changes but silently discarding `reservedQuantity` releases on every trade. The bug was invisible in normal testing because balances still looked mostly correct; it only surfaced as a slow accumulation of "phantom locked" shares/cash across many trades. Fixed by unifying the schema source of truth and syncing both copies.
2. **Orphaned wallet risk on registration.** User and wallet creation were originally two separate writes; a crash between them could leave a user with no wallet. Fixed by wrapping both in a single MongoDB transaction (`session.withTransaction`).
3. **Reservation leaks from pre-fix historical data.** Orders that filled or cancelled before the reservation-release logic existed left stale locked funds/shares on real accounts. Traced via targeted MongoDB queries cross-referencing wallets against their order history, then verified with a full-database sweep to confirm no other accounts were affected.

## Running Locally

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd fracEx

# 2. Set environment variables
# .env (root) — used by docker-compose, requires JWT_SECRET
# server/.env — PORT, MONGO_URI, JWT_SECRET, REDIS_HOST, REDIS_PORT
# worker/.env — MONGO_URI, REDIS_HOST, REDIS_PORT

# 3. Start the backend stack (mongo, redis, server, worker)
docker-compose up -d --build

# 4. Seed sample assets
docker exec -it fracex-server node seed.js

# 5. Start the frontend
cd client
npm install
npm run dev
```

## Project Structure

```
fracEx/
├── docker-compose.yml
├── server/          # Express API — auth, order placement, wallet queries
├── worker/          # BullMQ worker — matching engine & settlement
└── client/          # React/Vite frontend
```

## Possible Extensions

- Cost-basis tracking (average buy price) for realized/unrealized gain-loss reporting
- Order book depth visualization
- Multi-currency wallet support
- Market/stop order types beyond the current limit-order support

---

Built as a solo project to explore the systems-design challenges behind trading infrastructure — concurrency control, transactional consistency, and matching-engine correctness — rather than just CRUD-and-charts.