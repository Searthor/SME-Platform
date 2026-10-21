# Domain Model

## 1. Modeling conventions

- `User` is global. Tenant participation belongs to `BusinessMember`.
- Every tenant-owned aggregate carries `businessId`; branch/location-owned records also carry the relevant IDs.
- IDs are UUIDv7. Timestamps are UTC instants. Business dates are derived using `Business.timezone`.
- Monetary values are decimal amounts paired with a currency code and persisted as snapshots on financial lines.
- Quantity is decimal to support weighed/fractional units.
- Lifecycle records use state transitions, reversal and correction, not deletion.
- A simple product still has one default `ProductVariant`; sales and stock consistently reference the variant.

## 2. Context map

```text
Identity ── Membership/Access ── Business & Branch
                                  │
                    ┌─────────────┼──────────────┐
                    v             v              v
                 Catalog      Customers       Suppliers
                    │             │              │
                    v             v              v
                Inventory <── Sales/Payments ─ Purchases
                    │             │              │
                    └─────────────┼──────────────┘
                                  v
                           Reporting/Audit

Subscriptions/Entitlements gates use cases across contexts.
```

Arrows show use of a public capability, not ownership of another module's tables.

## 3. Identity, tenant and access

- **User**: global person/account state, display name, locale, status and explicit platform role. No `businessId`; platform role never grants tenant access.
- **UserIdentity**: normalized email or E.164 phone, verification state; supports future OAuth identities without redesigning membership.
- **PasswordCredential**: password hash and security metadata, kept out of user projections.
- **AuthSession**: user, refresh-token family/hash, device label, IP/user agent metadata, expiry, rotation/revocation timestamps.
- **Business**: tenant root, name, base currency, IANA timezone, status and settings.
- **Branch**: business-owned operating unit and address; tenant default branch is explicit, not assumed by array order.
- **BusinessMember**: user/business membership, status and authorization version.
- **Role**: tenant-owned role (with optional immutable system templates copied at onboarding).
- **Permission**: platform-defined stable permission code/catalog.
- **RolePermission**: role-to-permission grant.
- **MemberRole**: allows one or more roles per member; MVP UI may assign one primary role.
- **MemberBranchAccess**: explicit branch grant. `allBranches` belongs to member/role scope policy rather than synthetic branch rows.
- **BusinessInvitation**: time-limited tenant invitation for a normalized identity; stores only a token hash and pending Role/Branch grants, then atomically creates the membership when accepted.

Platform support access is a separate, explicit, time-bounded impersonation/support mechanism with reason and audit; platform operators are not tenant members by default.

## 4. Catalog

- **Category**: business-owned hierarchy with optional parent in the same business.
- **Unit**: business-owned measurement definition and decimal precision.
- **Product**: descriptive aggregate (name, category, tax category, stock tracking, active/deleted state, images).
- **ProductVariant**: sellable/inventory identity with SKU, barcode(s), cost snapshot/default selling price, minimum stock and default marker.
- **ProductBarcode**: permits multiple barcodes and tenant-aware uniqueness.
- **Attribute / AttributeValue / VariantOption**: deferred-capable variant dimensions; tables may be introduced with Phase 2 variant UI, while variant identity already exists.
- **Price** (future-ready): variant, price list/channel/currency/effective interval. MVP can keep one current base-currency selling price on variant, but sale lines always snapshot it.
- **FileObject / ProductImage**: storage metadata and ordered product association.

Deleting catalog records means deactivation/archival (`deletedAt` where necessary). Historical lines keep name, SKU, unit, tax and monetary snapshots.

## 5. Inventory

- **Warehouse**: stock location belonging to a business and branch. A branch receives a default warehouse at setup.
- **StockBalance**: one row per business/warehouse/variant with on-hand decimal quantity and version/update time. It is a projection optimized for locking and reads.
- **StockMovement**: immutable delta, movement type, warehouse, variant, reference type/id, reversal link, actor and time. Quantity is signed by convention, with a check matching direction where practical.
- **StockAdjustment**: authorized business document with reason/status; its items produce movements once posted.
- **StockTransfer**: source and destination warehouses, lifecycle and timestamps.
- **StockTransferItem**: requested, sent and received quantities; dispatch and receive may be distinct commands.

Transfer status transitions:

```text
DRAFT -> PENDING -> IN_TRANSIT -> RECEIVED
   |        |            |
   +--------+------------+-> CANCELLED (subject to reversal rules)
```

Dispatch posts `TRANSFER_OUT` at source. Receipt posts `TRANSFER_IN` at destination. In-transit quantity is derived from transfer items/movements; it is not silently present in both locations.

## 6. Sales and POS

- **PosSession**: cashier/register/branch opening and closing state, declared cash and reconciliation data.
- **Sale**: business/branch/warehouse/customer/session, human number, status, currency, totals, business timestamp, idempotency origin and audit metadata.
- **SaleItem**: variant reference plus immutable product/SKU/unit/price/cost/tax/discount snapshots and calculated totals.
- **SaleStatusHistory**: every material transition, actor, reason and timestamp.
- **Refund** and **RefundItem**: explicit return/refund document linked to original sale/items; supports partial future returns.
- **Receipt**: presentation/fiscal metadata, numbering and rendered file reference if generated.

Recommended state separation: sale fulfillment/lifecycle (`DRAFT`, `COMPLETED`, `CANCELLED`, `PARTIALLY_REFUNDED`, `REFUNDED`) and payment status (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERPAID` only if policy later permits). Combining both into one enum causes ambiguous transitions. API projections may expose a convenient composed status.

## 7. Generalized payments and balances

- **Payment**: business, branch, direction (`INBOUND`/`OUTBOUND`), method, amount/currency, status, received/paid time, payer/payee and external reference metadata.
- **PaymentAllocation**: assigns some payment amount to a payable document such as sale, purchase, subscription or future invoice.
- **PaymentRefund/Reversal**: immutable compensating record linked to original payment; never overwrite a posted amount.
- **ExternalPaymentAttempt** (future): provider request/idempotency/status/payload metadata, separate from a successfully posted payment.

Polymorphic `referenceType/referenceId` is flexible but cannot have a normal database foreign key. Therefore, generalized payments use an allocation target type plus application validation and reconciliation. If referential guarantees become more valuable, introduce typed nullable FKs or domain-specific allocation join tables. Each owning domain remains responsible for whether an allocation is allowable.

Customer outstanding = posted sale totals - valid inbound allocations - valid credits/refunds according to return policy. Supplier payable = received/invoiced purchase total - valid outbound allocations - supplier credits. Neither is a manually editable customer/supplier column.

## 8. Purchasing and suppliers

- **Supplier**: business-owned profile, contacts and archival state.
- **Purchase**: supplier, branch, destination warehouse, currency/totals and lifecycle.
- **PurchaseItem**: variant and ordered quantity with cost/tax snapshots.
- **GoodsReceipt**: posting document for one receipt event.
- **GoodsReceiptItem**: links purchase item to received quantity and inventory movement(s).
- **PurchaseStatusHistory**: transition actor/reason/time.

Lifecycle:

```text
DRAFT -> ORDERED -> PARTIALLY_RECEIVED -> RECEIVED
   |        |               |
   +--------+---------------+-> CANCELLED (only unreceived remainder)
```

Payment status is derived separately. Receipt—not purchase creation—is the stock-affecting aggregate operation.

## 9. Customers and expenses

- **Customer**: business-owned identity/contact/notes/status. Branch is optional attribution, not ownership restriction, unless product policy changes.
- **ExpenseCategory**: business-owned classification.
- **Expense**: business/branch, creator, category, amount/currency, incurred date, payee, description, status and attachment links.
- **ExpenseStatusHistory**: supports `DRAFT -> PENDING_APPROVAL -> APPROVED/REJECTED`, while MVP may create directly as approved for authorized users.

Posted expenses are corrected/reversed, not deleted. Drafts may be deleted under policy, with audit.

## 10. Platform capabilities

- **AuditLog**: tenant when applicable, actor, action, entity type/id, sanitized before/after, request/IP/user-agent and time. Append-only.
- **IdempotencyRecord**: business, operation, key hash/value, request fingerprint, status, response reference/snapshot and expiry.
- **OutboxEvent**: event ID/type/version, tenant, aggregate reference, payload, availability, attempts and processing state.
- **FileObject**: tenant, storage provider/key, detected media type, size, checksum, status and uploader.
- **Plan / Feature / PlanEntitlement / BusinessSubscription / UsageCounter**: centralized feature availability and limits.
- **PlatformSettings**: singleton global configuration for platform name, support contact, default locale/currency/timezone and public-registration policy. Mutations are superadmin-only and audited.

## 11. Aggregate boundaries and consistency

- A Sale owns its items and status history; it coordinates inventory and payment capabilities in one database transaction.
- StockBalance is the locked inventory aggregate per location/variant; movements are written atomically beside it.
- Purchase owns ordered quantities; GoodsReceipt is an immutable posting event coordinated with inventory.
- Role owns its permission grants. Membership owns branch grants and assigned roles.
- Cross-aggregate references are validated within the active tenant before write and reinforced with composite database foreign keys where possible.

Events are not a substitute for immediate invariants. Analytics, notifications, loyalty and future accounting reactions can be eventual; stock deduction and initial sale payment cannot.

## 12. Extension model

Future vertical modules attach through stable concepts:

- Restaurant orders produce/complete a Sale and may consume recipe stock through Inventory.
- Bookings/jobs/reservations produce chargeable documents allocatable by Payments.
- Hotel/apartment entities belong to Business/Branch and use common customers/files/auth.
- Accounting consumes versioned posted business events and builds its own journal; it never rewrites sales.
- Loyalty listens to completed/refunded sale events with idempotent entries.

Extension-specific fields belong to extension tables keyed to core IDs, not nullable columns added to every core record.
