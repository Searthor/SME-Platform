# Implementation Roadmap

## 1. Delivery principles

- Build vertical, testable foundations in dependency order; do not generate all CRUD modules at once.
- Each phase has an exit gate and leaves deployable, documented software.
- Redis, queues, WebSockets and microservices require a measured or product need, not merely anticipated scale.
- Resolve expensive product decisions immediately before the phase that depends on them.
- Security, isolation, audit and tests are phase work, not a final hardening sprint.

## 2. Architecture approval gate (current milestone)

Deliver and review the ten documents in `docs/`. Before scaffolding, decide or explicitly defer:

1. tax inclusion and rounding sequence;
2. weighted-average versus other MVP costing (weighted-average proposed);
3. receipt/purchase numbering and legal constraints;
4. refresh-token browser transport (HttpOnly cookie proposed);
5. ID generator package for UUIDv7;
6. product deletion/key reuse behavior;
7. multi-currency remains out of MVP;
8. return/refund depth for first sales release;
9. tenant closure/retention baseline.

Exit: architecture, rules, risks and open questions accepted; ADR backlog created. No runtime code is part of this gate.

## 3. Phase 0 — Foundation

### Deliverables

- pnpm workspace with `apps/api`, `apps/web`, `packages/api-contracts`, shared TS/ESLint config;
- NestJS and Nuxt 4 applications, strict TypeScript, Tailwind and Pinia; Nuxt 4 ແທນ Nuxt 3 ເພາະ v3 ໝົດອາຍຸການຮັບ security fixes ແລ້ວ;
- PostgreSQL local setup and pinned Prisma with migration workflow;
- validated configuration, structured logging and request correlation;
- global DTO validation and consistent error filter/envelopes;
- health endpoints, OpenAPI, base `/api/v1` conventions;
- database/transaction abstraction, clocks/UUIDv7 generator;
- CI for lint/typecheck/test/build/migration validation;
- test PostgreSQL harness and two-tenant fixtures.

### Exit criteria

Both apps run through documented commands; API can migrate/connect and return health; invalid input/error envelope works; no business feature CRUD; CI passes.

## 4. Phase 1 — Identity and tenant foundation

Implement only the first foundation modules requested:

1. auth;
2. users;
3. businesses;
4. memberships;
5. branches;
6. roles;
7. permissions/access control;
8. tenant context.

### Deliverables

- email/phone identity, Argon2id password login;
- short access token and rotating hashed refresh sessions, logout/revocation/replay response;
- business onboarding with default branch/warehouse, owner membership and roles;
- membership switching and active-business scoped token/context;
- permission decorators/guards, branch grants and authorization versioning;
- tenant-scoped repository foundation and composite tenant constraints;
- audit for membership/permission changes;
- minimal Nuxt login, business/branch selection and route middleware;
- isolation and auth integration/E2E tests.

### Stop point

Stop after this phase and report files, commands, architecture decisions, migrations/tests and the recommended Phase 2 slice. Do not bulk-create later CRUD modules.

ສະຖານະ: login, public Business onboarding, business selection, TenantContext, branch-aware dashboard, PermissionGuard, tenant Role/Permission, Member/Branch administration, hashed invitation-token acceptance, audit/version invalidation ແລະ tenant settings UI ຖືກສ້າງແລ້ວ. Email/SMS delivery adapter ຍັງຖືກ defer; ປັດຈຸບັນ Owner ສາມາດສຳເນົາ invitation link ແລະສົ່ງໃຫ້ຜູ້ຮັບເອງ.

Platform `SUPERADMIN` ແລະ global-settings console ຖືກເພີ່ມເປັນ foundation ແລ້ວ. ສິດນີ້ແຍກຈາກ tenant Role/Permission ແລະບໍ່ແມ່ນການສຳເລັດ tenant Role/Permission administration ທີ່ຍັງຄ້າງຢູ່.

### Exit criteria

User can authenticate, select only an active membership and access a permitted branch. Business A/B isolation suite, token rotation/replay and deny-by-default route tests pass.

## 5. Phase 2 — Catalog

### Deliverables

- categories, units, products and always-present product variants;
- SKU/multiple barcode uniqueness within business;
- default base-currency selling price/cost, stock tracking, minimum stock and activation/archive;
- bounded search/pagination and product image metadata/storage port;
- product permissions/audit, typed web services and product screens.

### Decisions due

Tax catalog baseline, unit precision, SKU/barcode archival reuse, image policy and whether variant options UI is MVP.

### Exit criteria

Tenant-safe create/search/update/archive; foreign references rejected by app and DB; historical-safe product model; contract/E2E tests pass.

## 6. Phase 3 — Inventory

### Deliverables

- branch warehouses/default warehouse;
- stock balance and immutable movement ledger;
- opening stock and authorized adjustment documents;
- row-locking/conditional non-negative stock service;
- balance reconciliation query/tool and low-stock query;
- transfer draft/dispatch/receive if entitlement/product priority includes it.

### Decisions due

Negative inventory remains disabled, movement sign conventions, transfer discrepancies, weighted-average costing and count workflow.

### Exit criteria

Every mutation has matching movement; concurrent final-unit test passes; rollback leaves no partial ledger/balance; transfer transitions and reversals are tested.

## 7. Phase 4 — POS, sales and payments

### Deliverables

- POS sessions and cart UI;
- server-side pricing/tax/discount calculations;
- sales/items with separate lifecycle/payment statuses and snapshots;
- generalized payments/allocations with mixed tender and partial payment;
- atomic sale completion with inventory, history, audit and outbox;
- idempotency records for sale/payment;
- cancellation and agreed refund/return scope;
- receipt model/print view.

### Decisions due

Discount authority/stacking, tax/rounding ADR, receipt numbering, credit/overpayment, return rules and cash-drawer reconciliation.

### Exit criteria

Happy path, duplicate retry, concurrency, payment validation, cancellation reversal and injected rollback tests all pass. API-calculated totals match approved examples.

## 8. Phase 5 — Suppliers and purchasing

### Deliverables

- suppliers, purchase orders/items and lifecycle;
- goods receipts with partial receipt;
- transactional inventory posting and idempotency;
- outbound supplier payments/allocations and derived payable;
- purchase permissions/approval/status audit and screens.

### Exit criteria

Draft/order does not alter stock; receipt does; over-receipt is prevented; retry/rollback/isolation and payable tests pass.

## 9. Phase 6 — Customers, credit and expenses

### Deliverables

- customers and derived receivable history;
- credit views/payment allocation workflows;
- expense categories/expenses, attachments via storage abstraction;
- agreed simplified or approval-ready expense lifecycle;
- audit and correction/void behavior.

### Exit criteria

Debt/payable is derived rather than manually editable; posted expenses cannot be deleted; tenant/branch/attachment security tests pass.

## 10. Phase 7 — Reporting

### Deliverables

- dedicated query repositories for daily/monthly sales, gross profit estimate, expenses/net estimate, top products, low stock, valuation, customer outstanding and supplier payable;
- business-timezone interval handling;
- bounded exports/jobs interface and report freshness semantics;
- query/index measurement with realistic datasets.

### Exit criteria

Reports reconcile to transaction fixtures, respect tenant/branch/timezone, remain bounded and meet agreed baseline performance. Add materialized views/cache only where measurements justify them.

## 11. Phase 8 — SaaS capabilities

### Deliverables

- plans, versioned features/entitlements and business subscriptions/trials;
- centralized evaluator and atomic usage limits for branches/users/products;
- expiry/downgrade/grace behavior;
- administrative visibility and audit.

### Exit criteria

No plan-name conditionals in domains; permission and entitlement composition tested; concurrency cannot exceed hard limits unintentionally; historical data remains accessible under defined downgrade policy.

## 12. Operational maturity track

This track runs alongside product phases when deployment begins:

- managed secret/key rotation, TLS, CORS/rate/security headers;
- backup/PITR and restore drills;
- S3-compatible private storage and lifecycle rules;
- Sentry/OpenTelemetry/metrics and alerting;
- outbox dispatcher, then BullMQ/Redis workers when slow/retryable tasks exist;
- vulnerability/container/dependency management;
- data retention, privacy access and support impersonation procedures;
- capacity tests, connection pooling and disaster recovery objectives.

## 13. Scale triggers

| Change | Trigger, not calendar |
| --- | --- |
| Redis cache | repeated measured DB hot read with safe invalidation and meaningful latency/load improvement |
| BullMQ/dedicated worker | slow/retryable task impacts requests or needs independent concurrency |
| WebSocket | validated real-time UX requirement; not needed for ordinary CRUD |
| Read replica | reporting/read load affects primary; stale semantics accepted |
| Materialized view | indexed normalized query misses report target at representative volume |
| Partitioning | table/index maintenance or pruning evidence on time-series tables |
| Microservice extraction | independent ownership/scaling/reliability benefit outweighs distributed consistency/operations cost |

Likely first extraction candidates are notifications, file processing, external payment integration and analytical reporting. Sales and inventory should stay in the same consistency boundary until strong evidence supports a different model.

## 14. Risks and checkpoints

At every phase review:

- **Scope risk:** has a vertical-specific shortcut leaked into core models?
- **Isolation risk:** do all reads, writes, reports, files and jobs include tenant scope?
- **Integrity risk:** what happens on retry, concurrency and failure at each step?
- **Migration risk:** are identifiers, snapshots, precision and lifecycle stable?
- **Operational risk:** are logs/audit safe and is rollback/recovery understood?
- **Performance risk:** are indexes based on current query shapes and representative volume?

Do not proceed past the relevant phase gate with unresolved correctness rules disguised as implementation details.

## 15. Suggested first task after architecture approval

Scaffold Phase 0 only, ending with a running empty NestJS/Nuxt workspace, PostgreSQL/Prisma migration baseline, validation/error/logging foundations and CI. Review that foundation before beginning Phase 1 identity and tenant behavior.
