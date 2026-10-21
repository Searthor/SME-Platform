# Multi-Tenancy

## 1. Isolation model

The platform uses a shared PostgreSQL database and shared schema with row ownership by `business_id`. This is the best initial balance of operational simplicity, cross-tenant platform management and cost. Tenant isolation is enforced at multiple layers:

1. authenticated user and active membership resolution;
2. request tenant/branch context;
3. permission and resource-scope policy;
4. tenant-scoped repository APIs;
5. composite database foreign keys and tenant-aware uniqueness;
6. mandatory isolation tests;
7. optional PostgreSQL RLS later as defense in depth.

No individual layer is treated as sufficient on its own.

## 2. Ownership hierarchy

```text
Platform
└── Business (tenant)
    ├── Branch
    │   └── Warehouse
    └── BusinessMember
        ├── Role(s) -> Permission(s)
        └── Branch grant(s) or all-branches scope
```

`User` is global and can have memberships in multiple businesses. It never permanently stores `businessId`. A branch or warehouse is not a tenant: all tenant records retain `businessId`, and branch/location records add `branchId`/`warehouseId` where applicable.

## 3. Selecting active business

After authentication, `/auth/me` (or a membership endpoint) returns the user's active memberships. The client selects one membership. Recommended MVP transport:

- access token identifies the global user/session and may include a selected membership/business plus an `authorizationVersion`;
- switching business uses a server endpoint that verifies the membership before issuing a newly scoped short-lived access token;
- the API revalidates membership status/version for sensitive requests and can use a short cache later;
- any `businessId` present in a resource body is ignored/rejected as an API contract violation, not used as authority.

An alternative business header is acceptable only if every request resolves it through the authenticated user's memberships. A raw header is selection input, never proof. Scoped access tokens make accidental context confusion and logs easier to reason about, so they are preferred.

## 4. Tenant context

The resolved context contains at least:

```ts
type TenantContext = {
  requestId: string
  userId: string
  sessionId: string
  memberId: string
  businessId: string
  authorizationVersion: number
  branchScope: { kind: 'all' } | { kind: 'selected'; branchIds: string[] }
  activeBranchId?: string
}
```

NestJS guards create this context after authentication and membership verification. `AsyncLocalStorage` makes it available to structured logging and infrastructure, but application commands should still receive an explicit actor/context object. This keeps tests clear and prevents context from disappearing across timers, events or job queues.

Missing tenant context on a tenant repository is an error and fails closed. Global administration repositories are separately named and injected; they must not be a backdoor in tenant modules.

## 5. Tenant-scoped data access

Prisma is wrapped by domain repositories. Normal modules do not inject the raw global Prisma client. A scoped repository is constructed with `businessId` and automatically includes it in reads, mutations and relationship validation.

Required patterns:

- use compound keys such as `{ businessId, id }` for lookup/update/delete;
- use `updateMany/deleteMany` with tenant filters when Prisma's unique API cannot express scope, then assert affected row count;
- connect relations through composite tenant keys;
- scope counts, existence checks, uniqueness checks and reports—not only result queries;
- review every raw SQL query for tenant predicate and parameterization;
- prevent escape hatches such as a generic `findById(id)` in tenant repositories.

Prisma middleware/extensions alone are not the primary isolation guarantee: nested operations and evolving ORM behavior make automatic query rewriting easy to misunderstand. A client extension may add defense, but typed scoped repository APIs and database constraints remain explicit.

## 6. Branch scope

Branch ID is client-selected business input because many commands need a target branch, but it is never trusted. The branch guard/policy checks:

1. the branch exists under active `businessId`;
2. the active member has all-branch access or a matching branch grant;
3. every branch-owned referenced resource (warehouse, POS session, expense, sale) is compatible;
4. the required permission applies to the operation.

Cross-branch reports require an appropriate permission and either all-branch access or filtering to the intersection of requested and granted branches. Never treat omission of a branch filter as “all branches” without policy evaluation.

## 7. Creation and relation safety

The server writes tenant ownership from context:

```text
request product fields
    + tenantContext.businessId
    + validated branch/location references
    -> repository create
```

For critical relations, the database stores redundant `business_id` on child rows and enforces composite foreign keys. Thus, even a missed application check cannot attach Business A's sale item to Business B's variant. Where polymorphic references prevent a foreign key (audit/event/payment allocation reference), the owning application service validates scope and reconciliation checks detect anomalies.

## 8. Background work and events

Jobs and outbox events contain explicit `businessId`, event ID, actor or system principal, correlation ID and schema version. A worker creates a fresh tenant scope and checks business status before accessing records. It does not reuse an originating HTTP `AsyncLocalStorage` object.

Scheduling is tenant-aware: business-local schedule is converted using the saved IANA timezone, while job instants are UTC. Idempotency/deduplication includes tenant scope. Logs and metrics attach `businessId` but avoid tenant-provided sensitive labels in high-cardinality metrics.

## 9. Caches, files and searches

- Cache keys start with environment and business identity, e.g. `prod:business:{id}:permissions:{member}:{version}`.
- Cache invalidation messages include business scope. Cache misses must never broaden queries.
- Object storage keys use non-guessable IDs under a tenant prefix; downloads validate tenant ownership before signing.
- Search indexes/documents include an immutable tenant filter enforced by the server. If an external search engine is introduced, its client wrapper requires tenant context.
- Export files and report artifacts are private, expire where appropriate and retain tenant metadata.

## 10. Error behavior

- Invalid or inactive active membership: `403 BUSINESS_ACCESS_DENIED`.
- Valid business but inaccessible branch: `403 BRANCH_ACCESS_DENIED`.
- Resource ID owned by another business: generally `404 RESOURCE_NOT_FOUND` to avoid existence disclosure.
- Cross-tenant relation submitted in a write: generic domain not-found or access error; log an internal security signal without exposing foreign details.

Do not include another tenant's names, IDs, counts or uniqueness conflicts in errors.

## 11. Testing requirements

Isolation tests use at least two businesses, overlapping human-readable codes and users with different memberships. Required cases include:

- list/search/count never includes the other tenant;
- get/update/archive by foreign UUID returns no data and changes no rows;
- nested connect rejects a foreign product/branch/customer/role;
- branch-scoped member cannot access another branch;
- all-branch role behaves only within its business;
- raw reporting queries and exports remain scoped;
- idempotency keys can coincide across businesses without collision;
- cache/file/job/event paths preserve scope;
- suspended membership loses access despite an otherwise valid token;
- transaction rollback cannot leave a cross-tenant or partially written relation.

These run against real PostgreSQL in CI. A static architecture test should also forbid raw Prisma imports outside approved infrastructure directories.

## 12. RLS adoption path

RLS is deferred to avoid combining application foundation work with connection/session-policy complexity. The schema is prepared through non-null tenant columns and tenant-leading indexes.

Safe adoption steps:

1. inventory every tenant table and privileged/global flow;
2. introduce a least-privilege application DB role that cannot bypass RLS;
3. make each repository transaction set `SET LOCAL app.current_business_id`;
4. add fail-closed policies and explicit policies for global tables;
5. test connection pool reuse and missing context aggressively;
6. deploy to staging and compare policy/application outcomes;
7. enable gradually with operational escape procedures audited.

RLS does not replace authorization, branch scope, composite constraints or tests. It filters rows by tenant; it does not decide whether a cashier can refund a sale.

## 13. Operational tenant lifecycle

Business creation atomically creates its settings, default branch, default warehouse, owner membership and initial role grants. Failure rolls back onboarding.

Suspension blocks tenant writes (and possibly reads according to subscription/support policy) at context resolution. Closure is a controlled state transition with export, retention and anonymization policies; never cascade-delete the tenant root. Tenant migration or dedicated-database isolation can be introduced later behind repository/routing infrastructure if a regulatory or enterprise requirement justifies it.

