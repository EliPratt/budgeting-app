# Architecture Decisions

Non-obvious design choices, in the order they were made. Format: what we
did, why, what we gave up, and what else was on the table.

## Envelope rollover as a closed-form cumulative sum, not month-to-month recursion

**Decision:** `available(envelope, month)` is computed directly as
`sum(assigned_amount for month' <= month) + sum(transaction.amount for date <= end of month)`,
in one pair of aggregate queries per envelope, rather than by walking
forward from the earliest month with data and carrying `available` as
rollover.

**Why:** Rollover is defined as "this month's available = last month's
available + this month's assigned + this month's activity." Unrolling
that recurrence shows `available` at any month is just the running total
of all assigned amounts and all transaction activity up to and including
that month — there's no information in the recursive walk that isn't
already captured by summing everything ≤ that month. The closed form
gets the identical number without ever touching a month with no data,
which also means a month nobody has opened yet still resolves correctly
with zero special-casing ("first month ever," "gap months with no
EnvelopeMonth row," etc. all just fall out of the SQL).

**Trade-off:** Every month-overview request does two aggregate queries
per envelope (assigned-cumulative, activity-cumulative) instead of one
lookup plus an addition carried from a cached prior value. For a
personal budgeting app with a handful of envelopes and a few years of
transaction history at most, this is irrelevant; at meaningfully larger
scale (many envelopes × many years of transactions with no pagination
boundary) a materialized "monthly running balance" table would be worth
introducing, updated incrementally as transactions are added rather than
recomputed from scratch on every read.

**Alternatives considered:** (1) Recursive walk from the earliest month
with any activity, carrying `available` forward — rejected because it's
strictly more code for the same result and degrades on a long history.
(2) Storing `available` directly on `EnvelopeMonth` and updating it on
every transaction write — rejected for now as premature: it introduces a
write-side invariant (available must be kept in sync with every
transaction insert/update/delete/reassignment) for a performance problem
this app doesn't have yet.

## SQLite for tests, Postgres for dev/prod — and its real blind spot

**Decision:** The test suite runs against an in-memory SQLite database
(via a `get_db` dependency override), while local dev and production use
Postgres.

**Why:** Fast, fully isolated tests with no dependency on Docker being
up. This was called out as a trade-off back in Phase 1.

**What that trade-off actually cost:** Building the envelope-month
summary math, `coalesce(sum(...), 0)` over zero matching rows returned
`0.00` correctly under SQLite but the *code path* that produced it
(`Decimal(result)` where `result` is the SQL literal `0`, not `None`)
happened to format differently under Postgres — a real formatting bug
(`"0"` instead of `"0.00"`) that only surfaced when manually verifying
against the live Postgres-backed server, not in the SQLite-backed test
suite. CI's Postgres service container doesn't currently close this gap
either, since the test suite's `get_db` override always points at
SQLite regardless of the `DATABASE_URL` CI sets for that service — the
container is presently unused by the tests that run against it.

**If starting over:** Either run the same test suite twice (SQLite for
fast local iteration, Postgres in CI as the source of truth) by making
the `get_db` override configurable, or accept SQLite-only tests but treat
"verify manually against the real Postgres-backed server before calling
a phase done" as load-bearing rather than a nice-to-have — which is the
practice this project is already following per its build-order
verification steps, and which is exactly what caught this bug.

## Dedupe hash computed on every transaction, not just imported ones

**Decision:** `Transaction.dedupe_hash` — `sha256(account_id | date |
amount | normalized payee)` — is set at creation time for manual entries
too, not only for rows created by an import. Re-importing a file checks
this hash against *all* existing transactions for the account.

**Why:** The realistic failure mode isn't just "imported the same file
twice" — it's "manually entered a transaction on Monday, then imported
last month's bank export on Friday, and that export includes the same
transaction." Hashing only import-created rows would silently create a
duplicate in exactly that case. Computing the hash universally makes
dedupe checking a single lookup regardless of how the existing row got
there.

**Trade-off:** The hash is a heuristic, not a guarantee — two genuinely
different transactions on the same day, for the same amount, at the same
payee (e.g., two separate $12 coffee purchases at the same shop) collide
and the second is dropped as a "duplicate." For a personal finance tool
this is an acceptable false-negative rate; a system that had to get this
exactly right (e.g., reconciling real bank statement line items) would
need a stronger identity, such as the bank's own transaction ID from OFX
`FITID` where available.

**Alternatives considered:** (1) Only dedupe within a given import batch,
never against pre-existing manual rows — rejected as strictly weaker for
no simplicity benefit, since the hash lookup is the same either way. (2)
Use OFX `FITID` when present and fall back to the content hash otherwise
— worth doing if this app ever needs to import the same OFX file from
multiple overlapping date ranges, but out of scope for v1's CSV-first
usage pattern.

## Category rule matching is an in-process linear scan, not pushed into SQL

**Decision:** `match_envelope()` loads all `CategoryRule` rows (ordered by
priority) and evaluates each one against the payee in Python — `in`
substring check or `re.search` — rather than expressing the match as a
SQL `WHERE` clause.

**Why:** Regex matching isn't portable across SQL dialects in a form
worth maintaining (Postgres and SQLite disagree on regex syntax and
functions), and this project's test suite runs against SQLite while
production runs Postgres — a SQL-side implementation would need two code
paths just to keep dev/test parity. A handful of rules evaluated in
Python per imported row is negligible cost at personal-budgeting scale.

**Trade-off:** At 10x scale (thousands of rules, imports of tens of
thousands of rows), this becomes an O(rules × rows) hot loop done outside
the database. The rules table would need to move server-side (e.g., a
generated/indexed column for simple substrings, falling back to Python
only for regex) well before that became painful, but the personal-app
volume here is nowhere near it.

**Alternatives considered:** Postgres regex operators (`~*`) — rejected
for the SQLite/Postgres parity reason above; a rules DSL compiled to SQL
— rejected as premature engineering for two match types.

## Confirming a recurring bill records the transaction on its due date, and can skip past several missed cycles in one step

**Decision:** `confirm_bill()` creates the transaction dated at the bill's
current `next_due_date` (not "today"), then advances `next_due_date` in a
loop — `while next_due_date <= as_of: next_due_date = advance(...)` —
rather than a single fixed-size step.

**Why:** A bill is owed on its due date regardless of when the user gets
around to confirming it; backdating the transaction keeps the envelope
math and account balance correct for the month the expense actually
belongs to. The loop (instead of one `+= frequency` step) exists because
a personal budgeting app absolutely will have a bill nobody confirmed for
months — going on vacation, forgetting to open the app — and the "due
now" list should not pile up N stale rows for one forgotten bill. Live
verification confirmed this: a bill due 2026-01-01 (monthly), confirmed
in September, landed one transaction dated 2026-01-01 and jumped straight
to `next_due_date = 2026-10-01` in a single confirm.

**Trade-off:** Only one transaction is ever created per confirm, even if
several cycles were missed — this assumes a missed bill means "I forgot
to log it," not "I owe five months of rent." For a bill genuinely owed
every missed cycle (rent, not a subscription that lapses), the user would
need to confirm it once per missed month manually; the UI doesn't offer a
"catch up N cycles" bulk action.

**Alternatives considered:** Auto-creating a transaction for every missed
cycle — rejected per the project's own error-handling principle (surface
for confirmation, never silently auto-create with a guessed amount/date);
this failure mode is worse than a manual catch-up. Advancing only one
cycle per confirm click — rejected because it would take five separate
clicks to clear a five-months-overdue bill, and the flag in the "due now"
list would misleadingly persist after the user has already caught up on
the current cycle.

## A goal is a target laid on an envelope's existing balance, not a separate pot of money

**Decision:** `Goal` has no ledger of its own — `current_balance` for a
goal is just that envelope's `available` (from the same cumulative-sum
math introduced for the envelope-month view), computed fresh on every
read via `goal_progress()`. One goal per envelope, enforced by a unique
constraint on `envelope_id` plus a friendly 409 at the API layer before
that constraint would otherwise raise an unhandled `IntegrityError`.

**Why:** "Save $1,000 in the Emergency Fund envelope by December" is
naturally a property *of* that envelope's balance, not an independent
number that has to be kept in sync with it. Piggybacking on
`envelope_summary()` means a goal's progress can never drift out of sync
with the envelope it's attached to — there's no second number to update
whenever a transaction posts, gets recategorized, or an assignment
changes. Enforcing one goal per envelope keeps "the goal for this
envelope" unambiguous instead of requiring the UI to pick among several
competing targets on the same balance.

**Trade-off:** A goal can't track a sub-slice of an envelope (e.g., "of
my $2,000 Savings balance, $500 is earmarked for a vacation and the rest
is untouchable") — the whole envelope balance counts toward the one goal.
For this app's scale (a handful of personal goals), splitting further
would mean either sub-envelopes or a separate goal-ledger model, both of
which are real added complexity for a distinction most personal budgets
don't need.

**Alternatives considered:** A dedicated `goal_contributions` ledger,
summed independently of the envelope's transaction activity — rejected as
duplicating state that the envelope already tracks, for no benefit until
an envelope needs to serve more than one goal at once. Multiple goals per
envelope with contributions split by percentage — rejected as premature;
nothing in the current scope asks for it, and it can be layered on later
by relaxing the unique constraint without touching the progress math.
