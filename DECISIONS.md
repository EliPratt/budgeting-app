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

## Spending-by-category queries categorized and uncategorized transactions separately

**Decision:** `spending_by_category()` runs two queries instead of one:
an inner join from `Envelope` to `Transaction` for categorized spending,
plus a separate `WHERE envelope_id IS NULL` query folded in as an
"Uncategorized" row — rather than a single `LEFT JOIN` grouped by
envelope.

**Why:** An inner join silently drops every transaction with a NULL
`envelope_id`, which is exactly backwards for a spending report — the
uncategorized transactions are the ones most worth surfacing, since
they're the ones the user hasn't gotten around to assigning yet. This
was caught by its own RED test before it ever reached a running server:
`test_spending_by_category_buckets_uncategorized_transactions` failed
first because a follow-on bug (the uncategorized total wasn't negated
back to a positive spending figure) returned `[]` instead of the
expected bucket — the join design was right, but the arithmetic on top
of it wasn't, and the test caught both.

**Trade-off:** Two round trips to the database instead of one `GROUP BY`
with a `LEFT JOIN` and a `COALESCE(envelope.name, 'Uncategorized')`.
Negligible for a personal budgeting app's transaction volumes; the
single-query `LEFT JOIN` form would be worth it only if this report ran
at a scale where query count actually mattered.

**Alternatives considered:** `LEFT JOIN` with `COALESCE` on the envelope
name — rejected only because two simple queries were easier to get right
and to test in isolation than getting the `LEFT JOIN`/`GROUP BY`/`COALESCE`
combination correct on the first try; revisit if this report is ever the
actual bottleneck.

## Reports panel is code-split behind React.lazy

**Decision:** `ReportsPanel` (and, transitively, the `recharts` library
it depends on) loads via `React.lazy()` + `Suspense` in `Dashboard.tsx`,
rather than a plain top-level import.

**Why:** Adding a full charting library pushed the production JS bundle
past Vite's 500KB warning threshold in one step — `recharts` alone
accounts for roughly 140KB gzipped. Every other panel on the dashboard is
needed immediately; the charts are useful but not part of the critical
first paint, so deferring their code (and its parse/compile cost) until
after the rest of the dashboard is interactive is a straightforward,
low-risk win.

**Trade-off:** One extra network request and a brief "Loading reports…"
flash the first time a session opens the dashboard — a small UX cost.
Also, the lazy boundary broke `App.test.tsx`'s dashboard test until it
was changed from a synchronous `getByRole` to an awaited `findByRole` for
the Reports heading — anything that renders inside a lazy boundary
requires tests to account for the async gap.

**Alternatives considered:** Leaving it un-split and raising or ignoring
Vite's warning threshold — rejected as papering over a real, easy-to-fix
cost rather than addressing it; the fix here is one `lazy()` call, not a
structural change.

## Cross-site cookie auth needs `SameSite=None` in production, `Lax` locally — made configurable, not hardcoded

**Decision:** `cookie_samesite` is a setting (`app/core/config.py`),
defaulting to `"lax"`, read into `Response.set_cookie()` in
`app/api/routes/auth.py` instead of a hardcoded `"lax"` string. Render
deploys it as `"none"` (paired with `COOKIE_SECURE=true`); local dev
keeps the default.

**Why:** SameSite is evaluated by *site* (registrable domain), not by
origin (scheme+host+port). `localhost:5173` and `localhost:8000` are
different origins but the same site, so `Lax` already works for local
dev — which is exactly why this was easy to not notice until deploying
for real. In production, the Vercel frontend and Render API are on
completely different domains, which is genuinely cross-site: `Lax`
cookies are withheld from cross-site `fetch`/XHR requests (they're only
sent on top-level navigations), so the login cookie would silently never
reach the API again after the first response set it. Browsers also
require `Secure` on any cookie using `SameSite=None`, which is why
`COOKIE_SECURE` and `COOKIE_SAMESITE` are set together in `render.yaml`.

**Trade-off:** `SameSite=None` cookies are more exposed to CSRF than
`Lax` in principle, since they're sent on cross-site requests generically
— mitigated here by `CORS_ORIGINS` being an explicit allow-list (never
`*`, which FastAPI's CORS middleware refuses to pair with
`allow_credentials=True` anyway) rather than a wildcard.

**Alternatives considered:** Putting the frontend and API behind the same
domain (e.g., API at `api.example.com`, frontend at `example.com`) so
`Lax` would keep working — rejected for this project because it requires
owning and configuring a custom domain across two hosting providers,
which is more infrastructure than a personal/portfolio deployment needs;
revisit if a custom domain gets added later anyway.

## DATABASE_URL scheme normalized in code, not left to manual configuration

**Decision:** `Settings` normalizes a bare `postgres://` or
`postgresql://` URL to `postgresql+psycopg://` via a Pydantic field
validator, rather than documenting "remember to add `+psycopg`" as a
manual deployment step.

**Why:** Render (like most managed Postgres providers) hands out a
connection string with a bare `postgres://` or `postgresql://` scheme.
SQLAlchemy needs the `+psycopg` dialect suffix to select the psycopg3
driver this project uses. A manual-edit instruction is the kind of step
that's easy to follow once in the README and easy to forget on the next
redeploy, database rotation, or when a teammate reads the setup docs
without reading closely — normalizing it in code means the raw
provider-supplied URL can be pasted into `DATABASE_URL` verbatim and it
just works, every time.

**Trade-off:** One additional layer of "magic" between what's configured
and what SQLAlchemy actually uses — someone debugging a connection issue
has to know this normalization exists rather than seeing the real dialect
string directly in the environment variable. Mitigated by the validator's
docstring and by `test_config.py` pinning the exact input/output
behavior.

**Alternatives considered:** Leaving it manual and documenting it in the
README — rejected as a foot-gun for a step with no benefit to doing it
by hand; there's no case where a user would want the un-normalized
scheme to reach SQLAlchemy.

## Python version pinned explicitly for Render

**Decision:** `render.yaml` sets `PYTHON_VERSION=3.12.7` on the web
service instead of letting Render pick its own default.

**Why:** The first Render deploy failed because Render's default
runtime had already moved to Python 3.14, and `pydantic-core==2.23.4`
(pinned in `requirements.txt`) has no prebuilt wheel for `cp314` yet.
Pip fell back to compiling it from source via `maturin`/Rust, which then
failed outright because Render's build sandbox has a read-only Cargo
cache directory — not something fixable by retrying or by changing
project code. Pinning the interpreter version is the same discipline as
pinning package versions: it keeps "what Render builds with" identical
to what's been tested locally and in CI, instead of drifting silently
whenever Render rolls out a new default.

**Trade-off:** One more version number to bump manually, on some future
day, when there's a reason to move to a newer Python (e.g. adopting a
feature that needs it, or wheels catching up for a newer interpreter).
That's a small, deliberate, visible cost compared to a build silently
breaking on a Render-side runtime change with no corresponding commit in
this repo to explain why.

**Alternatives considered:** Bumping pydantic/pydantic-core to a version
with `cp314` wheels — rejected for now since it's an unrelated dependency
bump with its own risk, when the simpler fix (pin the interpreter) fully
resolves the immediate failure without touching tested application code.

## CORS_ORIGINS is a plain str field, parsed in a property — not a list[str]

**Decision:** `Settings.cors_origins` is typed `str` (default a
comma-separated local-dev list), with a `cors_origins_list` property that
splits it into the `list[str]` `CORSMiddleware` actually needs. The
first attempt at this — keeping `cors_origins: list[str]` and adding a
`mode="before"` `field_validator` to tolerate non-JSON input — looked
right and passed its own tests, but still crashed in production.

**Why:** pydantic-settings JSON-decodes any list-typed field's raw env
var *before* field validators ever run (inside `EnvSettingsSource`, in
its own source-loading step) — a `field_validator`, `mode="before"` or
not, never gets a chance to intervene when the source itself raises
`SettingsError` first. A bare URL or comma-separated value pasted into
Render's plain-text env var field (the natural thing to type) failed at
that earlier stage. The bug wasn't caught locally because the first
round of tests called `Settings(cors_origins="...")` as a constructor
kwarg, which goes through `InitSettingsSource` — a different code path
that never invokes the env var's JSON pre-parsing, so the tests passed
while the real (env-var) path still crashed. Switching the field itself
to `str` sidesteps pydantic-settings' complex-type parsing entirely, and
`cors_origins_list` does the (simple) splitting in code we control.

**Trade-off:** An extra attribute (`cors_origins` vs. `cors_origins_list`)
instead of one field that's "just a list" — a caller has to know to use
the `_list` property, not the raw setting. Mitigated by there being only
one call site (`main.py`'s `CORSMiddleware`).

**Alternatives considered:** Keeping `list[str]` and trying to intercept
earlier (e.g. a custom `PydanticBaseSettingsSource`) — rejected as far
more machinery than this problem warrants. The real lesson here was
about test fidelity, not architecture: when a test exercises a different
code path than production does (kwarg vs. real env var), a green suite
proves nothing. `test_config.py` now sets `CORS_ORIGINS` via
`monkeypatch.setenv` specifically so it goes through the same
`EnvSettingsSource` path Render does.
