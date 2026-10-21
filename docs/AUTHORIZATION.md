# Authentication and Authorization

## 1. Separation of responsibilities

Authentication answers “who is the user and session?” Authorization answers “may this active member perform this action on this tenant/branch/resource?” Subscription entitlement answers “does this business have this capability/remaining limit?” All three must pass where applicable.

Platform administration is a fourth, separate authority. `SUPERADMIN` applies only to explicitly classified global platform endpoints and never implies membership in, or access to, any business tenant.

```text
credentials -> User + AuthSession
                 |
                 v
active BusinessMember -> roles -> permissions
                 |
                 +-> branch scope + resource scope
                 +-> business entitlements/limits
```

Role labels such as Owner or Manager are administration conveniences, not conditions in business code.

## 2. Authentication design

### Identities and credentials

Email and phone are stored as normalized `UserIdentity` records. Email normalization is conservative; phone uses E.164 after country-aware validation. Duplicate verified identities are prohibited globally. Password credential is separate to allow OAuth/SSO identities later.

Passwords use Argon2id with parameters benchmarked for the production environment and upgrade-on-login when parameters change. Login responses are deliberately generic. Rate limiting considers IP and normalized identity without exposing whether an account exists.

### Access token

The short-lived JWT contains minimal claims:

```text
iss, aud, sub=userId, sid=sessionId, jti, iat, exp
selected member/business (for tenant endpoints)
authorizationVersion (optional cache/version check)
```

Do not embed the full permission list or branch list: it becomes stale and bloats tokens. Validate algorithm, signature, issuer, audience, timestamps and required claims. Signing secrets/keys are rotatable and loaded from secret management, never source control.

### Refresh session and rotation

Refresh tokens are opaque random values. The database stores a slow/secure or keyed hash, token family, session/device metadata, expiry, `replacedBy`, last use and revocation. On refresh:

1. lock/atomically consume the current token;
2. verify session, user and selected membership status;
3. mark old token rotated and create the replacement;
4. return a new access/refresh pair;
5. if a consumed token is reused, revoke the family and raise a security event.

For the Nuxt browser app, prefer an HttpOnly, Secure, SameSite refresh cookie and keep access tokens in memory; apply CSRF protections to cookie-authenticated refresh/logout endpoints. If product constraints choose another transport, record it in an ADR and threat model XSS/storage impact.

Logout revokes the current session. “Logout all” revokes all the user's sessions. Authorized business administrators may terminate sessions' access to their business by suspending membership/versioning authorization; global session revocation requires a deliberate identity-level capability.

## 3. Authorization model

### Entities

- `Permission`: stable platform code, e.g. `sale.create`.
- `Role`: tenant-owned grouping of permissions.
- `BusinessMember`: tenant participation and status.
- `MemberRole`: assigns one or more roles.
- `MemberBranchAccess`: selected branch grants, or member has all-branch scope.
- optional future resource policy: ownership/self rules where permission plus branch is insufficient.

Permissions use `domain.action` lowercase codes. Avoid ambiguous `manage` when dangerous actions deserve explicit separation. For example, `sale.cancel` and `sale.refund` remain distinct from `sale.update`.

### Initial permission catalog

```text
business.manage
branch.view, branch.manage
product.view, product.create, product.update, product.delete
sale.view, sale.create, sale.cancel, sale.refund
stock.view, stock.adjust, stock.transfer
purchase.view, purchase.create, purchase.approve, purchase.receive
supplier.view, supplier.manage
customer.view, customer.manage
expense.view, expense.create, expense.approve
report.sales, report.profit, report.inventory
user.view, user.manage
role.view, role.manage
```

Permission definitions are seeded platform data. Default role templates are copied/versioned into each business so tenant customization does not mutate global policy.

## 4. Enforcement pipeline

An endpoint declares intent:

```ts
@RequirePermissions('sale.create')
@BranchScoped()
```

The authorization guard evaluates:

1. valid authenticated user/session;
2. active selected membership for active business;
3. effective permission union from active roles;
4. active branch within the member's branch scope;
5. endpoint/resource policy if necessary;
6. required feature entitlement and atomic limit check in the use case.

Controller decorators express coarse endpoint requirements. The application use case repeats/extends checks for data-dependent actions such as “refund belongs to this sale/branch,” transition state, amount thresholds or own-record-only policy. A guard cannot authorize a resource it has not loaded safely.

Queries filter results to authorized branch scope. Authorization must not fetch a resource globally and then compare business IDs; fetch it within tenant scope first.

## 5. Branch and multiple-role semantics

Effective permissions are the union of active assigned roles. Branch scope is not inferred from role name. MVP membership has either:

- `allBranches = true`; or
- explicit member/branch grants.

This supports owner (all), manager (one), and accountant (selected branches). If future roles need different permissions per branch, evolve to scoped role assignments (`member_role_scopes`) rather than encoding branch IDs into permission strings. This migration is localized because policy evaluation is centralized.

When viewing multiple branches, requested scope is intersected with granted scope. Empty intersection denies or returns an empty collection according to endpoint semantics; it never falls back to all branches.

## 6. Entitlements and usage limits

Permissions authorize people; entitlements authorize the subscribed business. Use a centralized service:

```text
entitlements.assertFeature(businessId, 'INVENTORY_TRANSFER')
entitlements.reserveLimit(businessId, 'MAX_BRANCHES', 1)
```

Do not write `if plan === 'PRO'`. Plan-to-feature mapping is data/configuration. Race-sensitive limits are checked and reserved within or alongside the resource-creation transaction. A downgrade preserves historical records and blocks new use according to a per-feature policy.

## 7. Change propagation and caching

Each membership has `authorizationVersion`. Role assignment, permission grant, branch scope or member status changes increment affected versions and emit an audit/outbox event. Access tokens are short-lived; sensitive checks compare the token's version with authoritative/cache state.

Start with database evaluation plus request-local memoization. If measurements justify Redis, cache effective grants by `(businessId, memberId, authorizationVersion)`. Versioned keys remove complex invalidation races. A cache failure fails through to the database; it must not grant access by default.

## 8. Error semantics

- `401 AUTHENTICATION_REQUIRED`: missing, invalid or expired authentication.
- `401 SESSION_REVOKED`: session no longer valid (details kept generic externally).
- `403 BUSINESS_ACCESS_DENIED`: no active membership in selected business.
- `403 BRANCH_ACCESS_DENIED`: membership lacks branch scope.
- `403 PERMISSION_DENIED`: membership lacks action permission.
- `403 FEATURE_NOT_AVAILABLE`: business entitlement absent.
- `409 LIMIT_REACHED`: subscribed usage limit prevents creation.
- `404 RESOURCE_NOT_FOUND`: tenant-scoped resource absent, including a foreign-tenant UUID.

Do not return the role/permission details of another user or disclose foreign resource existence.

## 9. Administrative safeguards

- Prevent removal/suspension of the last active owner-capable member unless business closure/ownership transfer is underway.
- High-risk role changes require `role.manage`, audit before/after and optional reauthentication/step-up later.
- Users cannot grant permissions they are not authorized to administer under the chosen delegation policy.
- System role/template identifiers are not client authority.
- Support impersonation, if added, displays an unmistakable banner, cannot conceal actor identity and records both operator and represented member.
- Platform-superadmin endpoints require current database-backed platform role on every request. The role is not accepted from JWT/client input as authority.
- A platform superadmin without a `BusinessMember` cannot call tenant endpoints. Future support access/impersonation remains a separate time-bound audited workflow.

## 10. Testing

Unit tests cover permission union, deny defaults, branch intersections, member status, entitlement composition and last-owner rules. Integration/E2E tests cover:

- no token, expired token and revoked session;
- refresh rotation and replay-family revocation;
- multi-business user switching and suspended membership;
- branch A member accessing branch B route/resource/list;
- every critical permission decorator and data-dependent policy;
- role change invalidating old authorization version;
- permission allowed but entitlement denied, and inverse;
- foreign tenant resource returns safe result.

Use a route-policy coverage test to fail when protected controllers lack an explicit public/authenticated/permission classification.
