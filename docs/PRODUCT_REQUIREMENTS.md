# SME Business Platform — Product Requirements

## 1. Purpose

The SME Business Platform is a multi-tenant SaaS product for businesses that need a reliable operational core. The first release targets retail and point-of-sale workflows while preserving clear extension points for restaurant, service, hospitality, property, workforce, CRM, accounting, and marketplace capabilities.

The product is not a collection of generic CRUD screens. Its core value is trustworthy business operations: a sale, payment, purchase receipt, or stock adjustment must leave financial and inventory records consistent, tenant-isolated, and auditable.

## 2. Product principles

- Simple enough to ship and operate as a modular monolith.
- Secure tenant isolation is a correctness property, not a UI convention.
- Server-calculated money and immutable operational ledgers are authoritative.
- Business rules live in backend use cases and are recorded in `BUSINESS_RULES.md`.
- Transactional workflows favor consistency over asynchronous convenience.
- Optional infrastructure is added only when measurements justify it.
- Vertical modules extend the core business, branch, identity, authorization, payment, and file capabilities rather than fork them.

## 3. Actors

| Actor | Typical responsibilities |
| --- | --- |
| Platform operator | Plans, subscriptions, support, platform security; no implicit tenant data access |
| Business owner | Business setup, all branches, users, permissions, reporting |
| Branch manager | Assigned branch operations and reporting |
| Cashier | POS sessions, sales, permitted cancellations/refunds |
| Inventory worker | Receiving, transfers, counts, adjustments |
| Purchaser | Suppliers and purchase orders/receipts |
| Accountant | Expenses, payments, debts, reports across assigned branches |

A person can be a member of multiple businesses and can have different roles and branch access in each.

## 4. MVP scope

### Included product capabilities

- Identity: email or phone login, password authentication, rotating refresh sessions, logout/revocation, device metadata.
- Tenant administration: businesses, branches, memberships, custom roles, permissions, branch assignments.
- Catalog: categories, units, products, sellable SKUs/variants, barcodes, pricing, tax references, images, activation.
- Inventory: warehouses, balances, immutable movements, adjustment, low-stock querying, concurrency-safe deductions.
- POS and sales: server pricing, mixed payments, credit/outstanding balance, cancellation and reversal, receipt data.
- Purchasing: suppliers, purchase lifecycle, partial receipt, stock posting, payments/payables.
- Customers: profiles, sale history, derived outstanding balance.
- Expenses: categories, branch expense entry, attachments, workflow-ready statuses.
- Reporting: sales, gross profit estimate, expense/net estimate, top products, low stock, valuation, receivables and payables.
- Audit: security and critical business-operation change history.
- SaaS foundation: plans, features, entitlements and usage limits, without billing-gateway implementation.

### Explicitly deferred

- Restaurant, booking, hotel, apartment, payroll, CRM, accounting-ledger, and marketplace verticals.
- OAuth/SSO, external payment gateway capture, advanced tax engine, multi-currency transactions.
- Redis, BullMQ, WebSocket, object storage in production, FCM and dedicated workers.
- Data warehouse, partitioning, read replicas, microservices and distributed messaging.
- Offline-first POS conflict resolution. Network retries are supported through idempotency, but full offline operation is a separate product initiative.

## 5. Functional outcomes

### Tenant and identity

1. A user authenticates with a normalized email or phone identity.
2. The user selects only from active memberships returned by the server.
3. The server issues/accepts an active business context bound to that membership.
4. Branch-scoped operations require an allowed branch or an all-branches grant.
5. Owners can invite, suspend, assign roles to, and scope members without changing the global user.

### Catalog and inventory

1. A product has one or more sellable variants; simple products receive a default variant.
2. Tenant-aware SKU and barcode uniqueness is enforced.
3. Every inventory mutation posts an immutable movement and changes the corresponding balance in one transaction.
4. Stock cannot become negative unless a future business policy explicitly enables it.
5. Transfers have an explicit lifecycle and post out/in movements at dispatch/receipt.

### Sales and payments

1. Clients submit product/variant, quantity and requested discount, never authoritative prices or totals.
2. The server resolves price/tax rules, calculates totals and persists snapshots.
3. Completing a stock-controlled sale atomically creates the sale, items, payments, stock deductions, movements, history and audit/outbox records.
4. Mixed tender and partial payment are supported. Outstanding is derived from posted totals and valid payments/refunds.
5. Cancellation/refund is a deliberate command that records reversals; completed financial records are never hard deleted.

### Purchasing and expenses

1. Draft or ordered purchases do not affect inventory.
2. Receiving some or all items atomically posts receipt quantities and inventory movements.
3. Payables are derived from purchase totals and valid payments/credits.
4. Expenses are tenant- and branch-owned, attributable to the creator, and ready for an approval workflow.

## 6. Quality attributes

| Attribute | Requirement |
| --- | --- |
| Security | Deny-by-default authorization, tenant context derived from authentication, secret-safe logs, validated inputs |
| Integrity | Database constraints plus use-case validation; atomic critical workflows; idempotent retry handling |
| Availability | Stateless API instances; graceful optional dependencies; health/readiness endpoints |
| Performance | Cursor pagination for large feeds; indexed tenant-leading access paths; no unbounded queries |
| Auditability | Actor, tenant, request, before/after where safe, status transitions and reversal links |
| Maintainability | Domain modules, thin HTTP adapters, strict TypeScript, explicit public module APIs |
| Testability | Pure calculations, injectable ports at external boundaries, real PostgreSQL integration tests |
| Observability | Structured logs containing request, user, business and branch context; metrics/tracing-ready |

Initial service-level targets should be measured before being contractual: p95 under 500 ms for standard reads/writes and under 2 seconds for normal interactive reports, excluding file transfers and exports.

## 7. Success criteria for the first operational release

- No known cross-tenant access path; mandatory isolation test suite passes.
- Concurrent attempts to sell the final unit produce at most one successful stock deduction.
- Retrying a critical command with the same idempotency key produces one business result.
- Injected failure in a critical workflow rolls back all transactional state.
- A completed/cancelled/refunded transaction can be reconstructed from histories, payments, movements and audit records.
- Business-timezone daily reports agree with transaction records around UTC day boundaries.
- The API and web application can be deployed independently from the same repository.

## 8. Assumptions and open product questions

These require product confirmation before their related phase, but do not block the architecture:

- Tax model: inclusive/exclusive pricing, rounding order, and jurisdiction-specific invoice requirements.
- Discount policy: item/order discount stacking, permissions and maximums.
- Returns: whether partial returns, exchange and return-without-receipt are MVP.
- Costing: weighted-average is the proposed MVP valuation method; FIFO is deferred.
- Stock ownership: the model treats warehouses as stock locations attached to branches; cross-branch transfer is explicit.
- Credit controls: limits, due dates, overpayment and customer deposits.
- Fiscal numbering: receipt/purchase numbering rules and gap tolerance by country.
- Data retention, export/deletion obligations, and tenant closure policy.
- Subscription billing provider and behavior after limits or expiry.

## 9. Requirement traceability

Detailed decisions are distributed deliberately:

- Architecture and boundaries: `ARCHITECTURE.md`
- Entities, relationships and lifecycle: `DOMAIN_MODEL.md`
- Persistence, constraints and indexes: `DATABASE.md`
- Normative invariants: `BUSINESS_RULES.md`
- Tenant isolation: `MULTI_TENANCY.md`
- Permission and branch scope: `AUTHORIZATION.md`
- REST conventions: `API_GUIDELINES.md`
- Local workflow and quality gates: `DEVELOPMENT.md`
- Delivery sequence: `ROADMAP.md`

