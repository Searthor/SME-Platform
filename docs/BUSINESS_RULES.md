# Business Rules

## 1. Authority and notation

This document is the normative source of truth for cross-cutting and domain invariants. Code, database migrations, API documentation and tests must reference rule IDs. Changing a rule requires product/domain approval, an impact review and an update here before or with implementation.

`MUST` is mandatory, `MUST NOT` is prohibited, and `SHOULD` requires a documented reason to deviate.

## 2. Tenant and identity rules

- **TEN-001** Every tenant-owned row MUST have an owning `businessId`.
- **TEN-002** Active business authority MUST be derived from an authenticated, active membership; request payload/query `businessId` MUST NOT grant scope.
- **TEN-003** Every tenant reference in a write MUST belong to the active business. Cross-business references MUST be rejected and SHOULD also be prevented by composite database foreign keys.
- **TEN-004** Branch-specific operations MUST use a branch belonging to the active business and allowed by the member's branch scope.
- **TEN-005** Background jobs, scheduled tasks and events MUST carry and revalidate explicit tenant context. They MUST NOT rely solely on HTTP ambient context.
- **TEN-006** Tenant-scoped lookup by unknown/foreign ID SHOULD return `404` when revealing existence would leak information; an explicit context-access failure may return `403`.
- **TEN-007** A global user MUST NOT receive tenant permissions except through an active membership.
- **TEN-008** Platform support access MUST be explicit, time-bound, reasoned and audited.
- **TEN-009** Membership invitations MUST be tenant-scoped, time-limited, stored only as a token hash and revalidate invited identity, role and branch grants when accepted.

## 3. Authorization rules

- **AUT-001** Authorization MUST evaluate permissions, not hard-coded role names.
- **AUT-002** Permission checks MUST combine active membership, effective role grants, branch scope, resource tenant/branch and entitlement when applicable.
- **AUT-003** Deny is the default when context, permission or scope is missing.
- **AUT-004** Role/permission/branch changes MUST be audited and MUST invalidate or version effective authorization promptly.
- **AUT-005** UI visibility is not an authorization control; every protected API command/query MUST enforce policy server-side.
- **AUT-006** Stock adjustment, sale cancellation/refund, purchase approval/receipt and permission administration require explicit permissions.

## 3.1 Platform administration rules

- **PLA-001** Platform administration authority MUST be explicit on the global user and MUST remain separate from tenant membership, roles and permissions.
- **PLA-002** A platform administrator MUST NOT receive implicit access to tenant-owned data. Tenant APIs MUST still require a valid active `BusinessMember` and `TenantContext`.
- **PLA-003** Superadmin credentials MUST be provisioned from deployment secrets, hashed with Argon2id and MUST NOT have a committed/default password.
- **PLA-004** Every global platform-setting mutation MUST require current server-verified superadmin status and MUST create a sanitized global audit record in the same transaction.
- **PLA-005** Platform settings MUST be validated by backend DTO/application rules; UI visibility or client-submitted role values MUST NOT grant platform authority.
- **PLA-006** Platform business registry views MAY expose bounded tenant metadata needed for operations, but MUST NOT expose operational tenant records or grant tenant access.

## 4. Money, tax and calculation rules

- **MON-001** Money MUST use decimal arithmetic and PostgreSQL numeric storage; binary floating point MUST NOT calculate or store authoritative values.
- **MON-002** Each financial document MUST have one currency in MVP, equal to the business base currency unless a later multi-currency policy applies.
- **MON-003** The backend MUST resolve unit price, cost snapshot, discount, tax, subtotal and grand total. Client totals are advisory and MUST NOT be trusted.
- **MON-004** Rounding mode, currency scale, tax inclusivity and rounding order MUST be centralized and versioned by the applicable pricing/tax policy.
- **MON-005** Historical lines MUST retain pricing, tax, product label/SKU/unit and cost snapshots needed for audit/reporting.
- **MON-006** A posted financial amount MUST NOT be edited in place. Correction uses a reversal/credit/refund and a new posting where necessary.

Current POS pricing policy (until the tax/rounding ADR replaces it; implemented in `common/money/money.ts` and `modules/pos/domain/sale-pricing.ts`):

- Rounding is half-up to the currency minor unit (LAK/VND/KRW/JPY: 0 decimals, others: 2). Unit prices, line discounts, bill discounts and the manual discount are each rounded before totals are summed, so `grandTotal = subtotal − discountAmount` holds exactly.
- Unit price: customer/price-group fixed price, else group percentage off the selling price, else the selling price.
- Discount order: line promotions (clamped to the line) → bill promotions (clamped to the remaining amount) → manual bill discount (amount or percent of what remains; never above it).
- Manual discounts require the `sale.discount` permission (Owner and Manager by default).
- Tax is 0 and the POS has no delivery fee; both stay out until the tax ADR / a delivery policy exists.
- Promotion branch/customer-group scopes are exclusive (a group-scoped promotion never applies to walk-in customers); weekday and time windows use the business timezone.

## 5. Sales rules

- **SAL-001** A sale MUST contain at least one item and every quantity MUST be positive.
- **SAL-002** Every sale item product variant MUST belong to the active business and be active/sellable under catalog policy.
- **SAL-003** Sale branch and fulfillment warehouse MUST belong to the active business; warehouse MUST belong to the branch unless an explicit cross-branch workflow applies.
- **SAL-004** A draft sale MUST NOT affect stock or create posted payments.
- **SAL-005** Completing a stock-controlled sale MUST reduce stock and create movements in the same database transaction as the completed sale and initial payments.
- **SAL-006** Sale creation/completion MUST be transactional. Partial success is forbidden.
- **SAL-007** Completed sales MUST NOT be hard deleted.
- **SAL-008** Cancelling a completed sale MUST validate cancellability, record actor/reason/status history and create stock/payment reversals required by policy. It MUST NOT delete original movements.
- **SAL-009** A sale MUST NOT be completed twice. State transitions use expected-state conditional writes.
- **SAL-010** Critical sale commands MUST support idempotency and reject key reuse with a different request fingerprint.
- **SAL-011** Refund quantity per item MUST NOT exceed net sold quantity after prior refunds.
- **SAL-012** Gross profit reports MUST use captured cost semantics defined by the costing ADR, not current product cost.

## 6. Payment and credit rules

- **PAY-001** Posted payment amount MUST be positive and use the target document currency unless currency conversion is explicitly implemented.
- **PAY-002** A payment MAY have multiple method records/allocations to support mixed tender.
- **PAY-003** Total valid allocation MUST NOT exceed payment amount.
- **PAY-004** Allocated payment MUST NOT exceed target outstanding unless overpayment/customer-deposit policy explicitly permits it.
- **PAY-005** Posted payment MUST be auditable and MUST NOT be hard deleted or have amount overwritten.
- **PAY-006** Refund/reversal MUST reference the original payment and MUST be idempotent.
- **PAY-007** Customer outstanding and supplier payable MUST be derived from posted documents, allocations and credits/refunds; profile debt fields MUST NOT be manually editable sources of truth.
- **PAY-008** External gateway attempt state MUST be separate from posted payment state. A callback MUST be authenticated and idempotently processed.

## 7. Inventory rules

- **INV-001** Every on-hand inventory change MUST atomically create exactly one or more immutable stock movements that explain the balance delta.
- **INV-002** Normal APIs MUST NOT expose direct arbitrary editing of `StockBalance.quantity`.
- **INV-003** Negative inventory is disabled by default. A deduction that would make availability negative MUST fail with `INSUFFICIENT_STOCK`.
- **INV-004** Availability checks and updates MUST be concurrency-safe using database locking/conditional writes; application pre-validation alone is insufficient.
- **INV-005** Multi-item stock locks MUST be acquired in deterministic order.
- **INV-006** Stock adjustment MUST be a documented command with permission, reason, actor and movement reference.
- **INV-007** A reversal MUST append compensating movement(s) linked to the original; original movement rows MUST NOT be edited/deleted.
- **INV-008** Stock balance MUST equal opening state plus posted movement deltas. Reconciliation discrepancies MUST alert operators and MUST NOT be silently erased.
- **INV-009** Quantity precision MUST comply with the variant's unit.
- **INV-010** Archived products/variants MAY remain referenced historically but MUST NOT accept new sale/purchase operations.

## 8. Transfer rules

- **TRN-001** Source and destination warehouses MUST be distinct and belong to the active business.
- **TRN-002** Dispatch MUST deduct source stock using `TRANSFER_OUT` in the dispatch transaction.
- **TRN-003** Receipt MUST add destination stock using `TRANSFER_IN` in the receipt transaction.
- **TRN-004** Received quantity MUST NOT exceed dispatched outstanding quantity unless an explicit discrepancy workflow is approved.
- **TRN-005** A draft/pending transfer MUST NOT alter on-hand stock.
- **TRN-006** Cancelling after dispatch requires an explicit return/reversal workflow; it MUST NOT merely change status.

## 9. Purchase rules

- **PUR-001** A draft or ordered purchase MUST NOT change inventory.
- **PUR-002** Ordered and received quantities MUST be positive and refer to variants in the active business.
- **PUR-003** Goods receipt MUST increase destination stock and create `PURCHASE` movements atomically with receipt records.
- **PUR-004** Partial receipts MUST be supported; cumulative receipt quantity MUST NOT exceed ordered quantity unless an authorized over-receipt policy is added.
- **PUR-005** The receipt command MUST be idempotent and transactionally safe.
- **PUR-006** A received quantity MUST NOT be cancelled by deleting the purchase; return/reversal records are required.
- **PUR-007** Supplier payable MUST reflect the approved received/invoiced amount and valid payments/credits according to the adopted accounting basis.

## 10. Expense rules

- **EXP-001** An expense MUST belong to an active business, valid branch and creator membership.
- **EXP-002** Expense amount MUST be positive and in the allowed currency.
- **EXP-003** Approval/rejection MUST be performed only from an allowed prior state and recorded in status history/audit.
- **EXP-004** A posted/approved expense MUST NOT be hard deleted. Correction uses void/reversal under policy.
- **EXP-005** Attachments MUST pass storage security validation and tenant ownership checks.

## 11. Authentication/session rules

- **SEC-001** Passwords MUST be hashed with Argon2id using reviewed configurable parameters and MUST never be logged.
- **SEC-002** Access tokens MUST be short-lived, signed with rotatable keys/secrets and validated for issuer/audience/expiry.
- **SEC-003** Refresh tokens MUST be high entropy, stored only as a secure hash, rotated on use and associated with a session/token family.
- **SEC-004** Refresh-token reuse MUST revoke or quarantine the token family and require reauthentication according to policy.
- **SEC-005** Logout MUST revoke the current session; user/business administrators with permission MAY revoke applicable sessions.
- **SEC-006** Authentication (identity) MUST remain separate from tenant authorization (membership/permission/scope).
- **SEC-007** Rate limits and generic authentication errors MUST reduce account enumeration and brute-force risk.

## 12. Audit and data lifecycle rules

- **AUD-001** Critical cancellation, refund, stock adjustment, permission, payment, expense, purchase and price changes MUST create an audit record.
- **AUD-002** Audit includes tenant, actor, action, entity, sanitized before/after when useful, request/correlation metadata and time.
- **AUD-003** Passwords, token values, credentials, full payment secrets and unnecessary sensitive personal data MUST NOT enter audit/log payloads.
- **AUD-004** Audit records are append-only and access-controlled.
- **AUD-005** Soft delete is selective. Transaction ledgers/history use status and reversal, not generic `deletedAt`.

## 13. Time and reporting rules

- **TIM-001** Instants MUST be stored in UTC; business timezone MUST be a valid IANA identifier.
- **TIM-002** “Today”, daily/monthly grouping and date filters MUST be interpreted in business timezone and converted to an explicit UTC interval.
- **TIM-003** Reports MUST state data basis/filters and use the same posted-status definitions as source domains.
- **TIM-004** Large lists/reports MUST be bounded and paginated or generated asynchronously.
- **TIM-005** Cached/eventual reports MUST expose freshness where it can affect decisions.

## 14. Subscription rules

- **SUB-001** Feature and limit checks MUST use the centralized entitlement service, not plan-name conditionals scattered through modules.
- **SUB-002** Authorization and entitlement are separate: a user needs both required permission and available business feature.
- **SUB-003** Limit reservation/increment for race-sensitive resources MUST be atomic.
- **SUB-004** Downgrade/expiry behavior MUST be defined per entitlement (block new use, preserve read access, grace period); existing historical data MUST not be silently deleted.

## 15. Required invariant tests

At minimum, automated tests map to TEN-002/003/004, AUT-002/003, MON-003/004, SAL-005/006/008/010, PAY-003/004/006, INV-001/003/004/008, PUR-003/004/005, SEC-003/004 and TIM-002. Concurrency and rollback cases require real PostgreSQL integration tests; mocks are insufficient.
