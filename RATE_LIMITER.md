# Distributed Rate Limiter — FracEx Integration

## Problem

FracEx's order-placement endpoint (`POST /api/orders`) had no protection against a client
sending excessive requests. In a single-instance app this is already risky; the moment
FracEx runs behind a load balancer with multiple Node instances, an in-memory counter
per process wouldn't even work correctly — each instance would track its own separate
count, so the "real" limit would be `limit × number of instances`, or effectively no
limit at all.

## What was built

A standalone rate-limiting middleware package (`server/middleware/rateLimiter.js` +
`server/scripts/*.lua`), backed by FracEx's existing shared Redis instance, implementing
three strategies:

| Strategy | File | Best for | Key property |
|---|---|---|---|
| Fixed window | `fixedWindow.lua` | Simple cases, low-stakes reads | Simple, but allows up to 2x burst at window boundaries |
| Sliding window counter | `slidingWindowCounter.lua` | Reads needing accurate limits | Blends current + previous window by time-overlap; no boundary burst |
| Token bucket | `tokenBucket.lua` | Write-heavy, bursty traffic (used on `/api/orders`) | Continuous refill, no fixed windows, tolerates short bursts by design |

All three run as **atomic Redis Lua scripts** (`EVAL`), using Redis's own `TIME` command
rather than each Node instance's local clock. This means:
- No race condition between "check current count" and "increment it" — Redis executes
  the whole script as one indivisible unit, even under concurrent requests from multiple
  app instances.
- No clock-drift issue between instances, since the window/refill math is computed from
  Redis's clock, not `Date.now()` on whichever server happened to handle the request.

## Where it's applied

```js
// server/routes/orderRoutes.js
router.post('/', tokenBucketLimiter({ capacity: 10, refillRate: 2 }), protect, placeOrder);
```

Token bucket was chosen for order placement specifically because it's write-heavy and
should tolerate a short legitimate burst (e.g. a trader placing several orders quickly)
without the boundary-burst flaw that fixed-window has. The limiter runs **before** the
`protect` (auth) middleware, so even unauthenticated flooding is rejected cheaply before
any JWT verification or DB work happens.

## Resilience: fail-open vs fail-closed

Every strategy accepts a `failMode: 'open' | 'closed'` option (default `'open'`),
governing what happens if Redis itself becomes unreachable:

- **fail-open** — requests pass through unprotected; prioritizes availability.
- **fail-closed** — requests are rejected with `503`; prioritizes protection.

This was tested against a real Redis outage (`docker stop` on the Redis container mid-run):
the middleware correctly returned `503 Service Unavailable` while Redis was down, and
resumed normal rate-limiting automatically the moment Redis came back — no server restart
required.

## Evidence: algorithm comparison under load

Using `autocannon` (10 concurrent connections, 7s duration, spanning a window boundary)
against identical `limit: 3, windowSizeSec: 5` config:

| Run | Fixed window (`2xx` allowed) | Sliding window counter (`2xx` allowed) |
|---|---|---|
| 1 | 6 | 3 |
| 2 | 9 | 3 |
| 3 | 6 | 3 |
| 4 | 6 | 3 |
| 5 | 9 | 3 |

Fixed window let through **2-3x** the configured limit whenever the test window happened
to straddle a boundary — an inherent property of the algorithm, not a bug. Sliding window
counter held the exact limit every time under identical concurrent load.

Token bucket (`capacity: 5, refillRate: 1`) under the same style of flood: `11, 10, 9`
across three runs — consistent with the intended behavior (burst of `capacity`, then a
steady trickle for the remainder of the test duration), never over- or under-counting
despite ~28,000 concurrent requests per run.

## Evidence: before/after on the real FracEx order endpoint

Load test: 10 connections, 5s duration, against the real, authenticated
`POST /api/orders` endpoint.

| | With rate limiter | Without rate limiter |
|---|---|---|
| Total requests attempted | 22,625 | 2,480 |
| Successful (`2xx`) | 11 | 24 (capped by wallet balance, not by protection) |
| Rejected (`429`/other) | 22,614 | 2,456 |
| Avg latency | 1.67 ms | 19.64 ms (~12x higher) |

**Reading this correctly:** the "24 successes" in the unprotected run is not the endpoint
being fine under load — it's a side effect of the test wallet running out of available
funds after enough real orders were created (a business-logic limit, not evidence of
resilience). The real signal is throughput and latency: without protection, every single
request does full work (Mongo lookups, wallet checks, order creation, BullMQ enqueue),
so far fewer requests can even be attempted in the same window, and average latency rises
~12x. With the limiter in place, ~99.95% of flood traffic is rejected via a single atomic
Redis check in 1-2ms, before any expensive work happens — protecting the database and
matching engine from unnecessary load exactly as intended.

## Known limitations / honest tradeoffs

- Rate limiting is keyed by `req.ip`, not authenticated user ID. A more accurate version
  for authenticated routes would key by `req.user.id` (available after `protect` runs),
  which would require reordering the middleware or duplicating the auth check — left as
  a follow-up rather than adding complexity to this pass.
- Sliding window counter is a weighted approximation (assumes even request distribution
  within the previous window), not a perfectly exact sliding log. This is the same
  tradeoff production systems like Cloudflare's rate limiter make, and was a deliberate
  choice over sliding-window-log to avoid unbounded per-request memory growth.
- FracEx's `queue.js` and `index.js` reference `process.env.REDIS_URL`, which isn't set
  in the local `.env` (only `REDIS_HOST`/`REDIS_PORT` are). This is a pre-existing
  inconsistency, unrelated to this change, that only surfaces when running the full
  Docker Compose stack — noted here for visibility, not fixed as part of this work.