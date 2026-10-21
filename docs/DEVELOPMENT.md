# Development Guide

## 1. Current repository state

Repository ປັດຈຸບັນມີ NestJS/Prisma foundation, Phase 1 Identity/Multi-Tenancy/Access Control backend ແລະ Nuxt web ສຳລັບ registration/onboarding, login, invitation acceptance, business selection, dashboard, member/branch/role administration, session security ແລະ audit activity ຕາມ `PHASE_1_IMPLEMENTATION.md` ແລະ `WEB_APP.md`. Catalog ມີ category/unit/product API ແລະ `/products` UI; Sales ແລະ inventory ຍັງບໍ່ໄດ້ສ້າງ.

## 2. Planned toolchain

- Node.js active LTS pinned in `.nvmrc`/tooling metadata at scaffold time.
- pnpm pinned through Corepack and `packageManager`.
- pnpm workspaces with `apps/api`, `apps/web` and stable shared packages.
- NestJS, Nuxt 4, TypeScript strict mode, PostgreSQL and a pinned Prisma version. Nuxt 4 ຖືກເລືອກເພາະ Nuxt 3 ໝົດອາຍຸການຮັບ security fixes ແລ້ວ.
- ESLint and Prettier from shared configuration packages.
- Docker Compose for local PostgreSQL only if the team does not standardize another local environment.

Nx/Turborepo is intentionally deferred. Workspace scripts are sufficient for two applications and a few packages. Add task graph/caching only when CI/build measurements show value.

## 3. Intended commands

Exact commands will be created and verified during Phase 0. The target developer experience is:

```bash
corepack enable
pnpm install
pnpm db:up
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
pnpm dev:api
pnpm dev:web
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
```

Do not copy these into automation until scaffold scripts exist. Production migrations run as an explicit deployment step, not during application startup.

ຄຳສັ່ງເທິງນີ້ຖືກ scaffold ແລະກວດສອບແລ້ວ. `pnpm dev` ເປີດ API ແລະ web ພ້ອມກັນ; ໃຊ້ `dev:api` ຫຼື `dev:web` ເມື່ອຕ້ອງການເປີດແຍກ.

## 4. Configuration

Configuration is schema-validated at process startup and grouped by capability. Commit `.env.example`, never real secrets. Expected groups include:

```text
APP_ENV, PORT, API_BASE_PATH
DATABASE_URL
ACCESS_TOKEN_ISSUER/AUDIENCE/TTL and signing key reference
REFRESH_TOKEN_TTL, password hashing parameters
CORS_ALLOWED_ORIGINS
LOG_LEVEL
STORAGE_DRIVER and local/S3 settings
REDIS/BULLMQ settings only when enabled
```

Production secrets come from deployment secret management. Logs must not dump configuration or process environment. Development/test databases use distinct URLs and credentials.

Web ໃຊ້ `NUXT_API_SERVER_URL` ເພື່ອ proxy `/api/v1/**` ໄປ NestJS. ຄ່າ development ປັດຈຸບັນແມ່ນ `http://localhost:3003`; ສຳເນົາ `apps/web/.env.example` ເປັນ `apps/web/.env` ເມື່ອຕ້ອງການ override.

ການ provision platform superadmin ໃຊ້ `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` ແລະ `SUPERADMIN_DISPLAY_NAME` ຈາກ `apps/api/.env`, ແລ້ວລັນ `pnpm prisma:seed` ຫຼັງ migration. Password ຕ້ອງຍາວຢ່າງໜ້ອຍ 16 ຕົວ, ບໍ່ໃຫ້ commit ຄ່າຈິງ ແລະ seed ບໍ່ log credentials. ການລັນຊ້ຳແມ່ນ idempotent; identity ທີ່ມີ credential ແລ້ວຈະຮັກສາ password ເກົ່າ.

## 5. Coding standards

- Enable all strict TypeScript checks and avoid `any`; parse `unknown` at boundaries.
- Prefer small named functions and explicit domain terms over generic helpers.
- Controllers map transport and call application use cases; no business calculations.
- Do not return Prisma models from controllers or import Prisma types into web/contracts.
- Use a decimal/money value abstraction; never coerce authoritative decimal strings to `number`.
- Define errors with stable codes and central HTTP mapping.
- Use dependency injection for clocks, ID generation, storage, event dispatch and external integrations when determinism/substitution matters.
- Avoid interfaces/repositories for trivial code solely for symmetry. Use them where they protect a domain boundary, tenant scope, complex persistence or external adapter.
- Ban circular dependencies and default use of `forwardRef`.
- Comments explain why/invariants, not restate code.

Naming guidelines:

- application commands: `CompleteSale`, `ReceivePurchase`;
- handlers/services: `CompleteSaleHandler` or focused application service;
- domain events: past tense (`SaleCompletedV1`);
- permissions: lowercase `domain.action`;
- database physical names: `snake_case`; TypeScript: `camelCase`/`PascalCase`.

## 6. Module workflow

When adding/changing a feature:

1. identify and update affected `BUSINESS_RULES.md` rule IDs;
2. define the API contract/errors/permission/idempotency behavior;
3. identify aggregate owner and transaction boundary;
4. design tenant-safe constraints/indexes and migration;
5. implement pure domain calculation/policy tests;
6. implement application use case through scoped repositories;
7. expose a thin controller and typed response mapping;
8. add PostgreSQL integration tests for constraints/transactions/isolation;
9. add E2E coverage for a representative user workflow;
10. update OpenAPI and relevant docs/ADR.

Cross-module access must use the owner's public application interface. A pull request that imports another module's Prisma repository/table-specific helper needs architecture review.

## 7. Database development

- Create migrations through Prisma, then inspect and edit reviewed SQL where needed.
- Give constraints/indexes stable descriptive names.
- Never edit a migration already applied in a shared environment.
- Seed platform permissions, currencies and development fixtures idempotently.
- Fixtures create at least Business A and Business B for every tenant integration suite.
- Tests must use PostgreSQL, not SQLite, for transactions, numeric behavior, locks and constraints.
- Raw SQL is parameterized, lives in infrastructure/query repositories and has explicit tenant-scope tests.

Migration review checklist:

- tenant column non-null and backfill plan;
- composite tenant FK and correct delete behavior;
- numeric precision/checks;
- tenant-aware uniqueness;
- index supports an actual query;
- table lock/backfill/deployment impact;
- rollback/forward-fix and backup implications.

## 8. Testing strategy

### Unit

- money rounding, discount/tax order and sale totals;
- sale/payment state transitions;
- permission and branch-scope evaluation;
- stock and purchase quantity policies;
- entitlement decisions and time-zone interval conversion.

### Integration (real PostgreSQL)

- sale completion writes sale/items/payment/stock movement/balance atomically;
- injected failure rolls the entire sale back;
- two concurrent final-unit sales yield one success;
- duplicate idempotency requests yield one result;
- purchase partial/full receipt and rollback;
- balance/movement reconciliation;
- every repository read/write rejects Business B in Business A context;
- database constraints reject cross-tenant relationships.

### E2E

- login/refresh/logout/replay handling;
- choose business and create product;
- complete/cancel sale;
- receive purchase;
- permissions and branch access across actual HTTP boundary.

Use test builders with explicit business IDs to make tenant mistakes visible. Avoid snapshots for critical numeric/domain assertions. Control clock/ID generators where deterministic.

## 9. Quality gates

Every change must pass formatting, lint, typecheck, unit and relevant integration tests. Foundation CI should also include:

- architecture dependency test (domain cannot import Nest/Prisma; raw Prisma limited to infrastructure);
- route authorization metadata coverage;
- generated OpenAPI/contract compatibility check;
- migration validation on a clean DB and upgrade fixture;
- dependency/security and secret scanning with reviewed policy;
- build of both apps and shared packages.

Coverage percentage is secondary to invariant/branch quality. Critical rules in `BUSINESS_RULES.md` must have named tests.

## 10. Logging and diagnostics

Use structured logs with `requestId`, route, status, latency, `userId`, `businessId`, `branchId` and safe entity references. Redact authorization/cookie headers, credentials, tokens and protected DTO fields. Do not log full request/response bodies by default.

Application errors are logged once at the boundary with cause chain. Expected domain rejections are lower severity than system failures. Health endpoints distinguish liveness/readiness. Add Sentry/OpenTelemetry behind adapters/configuration later; correlation context and instrumentation boundaries exist from Phase 0.

## 11. Security development checklist

- validate/normalize every external input and reject unknown fields;
- derive tenant/actor fields server-side;
- use scoped repositories and composite references;
- declare permission/branch/entitlement on endpoint and use case;
- avoid secrets and PII in log/audit/event payloads;
- use parameterized ORM/raw SQL;
- validate file size and detected type; keep objects private;
- rate-limit sensitive endpoints;
- threat-model authentication, impersonation and external callbacks;
- review dependency and container posture before production.

## 12. Definition of done

A feature is done when its behavior and non-goals are clear; applicable rules are documented; contracts/errors are explicit; tenant/authorization/entitlement checks exist; database constraints/indexes are reviewed; critical transaction and idempotency behavior is tested; observability is adequate; API docs are current; and no unrelated infrastructure is required to run it locally.
