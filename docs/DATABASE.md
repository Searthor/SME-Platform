# Database Design

## 1. Standards

- PostgreSQL is authoritative. Prisma is the primary data-access tool; migrations may contain reviewed SQL for constraints, partial indexes, triggers or locking behavior Prisma cannot express.
- Physical names use `snake_case`; TypeScript/Prisma fields may use `camelCase` via mappings.
- Primary keys are native `uuid`, populated with application-generated UUIDv7.
- All mutable rows have `created_at` and `updated_at` (`timestamptz`). Immutable ledgers use `created_at` and correction/reversal links rather than mutation timestamps.
- Store instants as `timestamptz` in UTC. Store an IANA timezone on business. A local business date, when legally significant, is stored explicitly alongside the instant.
- Money uses `numeric(20,4)` initially. Currency code is `char(3)`/validated text. Currency-specific display/rounding uses a central currency catalog; never cast to JS `number`.
- Quantity uses `numeric(20,6)`. Unit precision and positivity are validated.
- Optimistic `version` columns are used where human edits can collide; stock writes use row locking.

Precision must be confirmed in an ADR against largest expected LAK amount, taxes, unit pricing and reporting sums before the first production migration.

## 2. Tenant key pattern

Every tenant table has non-null `business_id`, even when ownership can be inferred through a parent. This supports explicit scope, tenant-leading indexes and future RLS.

To make cross-tenant references impossible at the database layer, parent tables expose a candidate key such as `UNIQUE (business_id, id)`, and child relations use composite foreign keys:

```sql
FOREIGN KEY (business_id, product_variant_id)
  REFERENCES product_variants (business_id, id)
```

Prisma migrations may need custom SQL for some composite constraints. The additional unique indexes are accepted as the cost of defense in depth. Global tables such as `users`, `permissions`, currency metadata and plans do not carry `business_id`.

## 3. Logical schema inventory

This is a design inventory, not a generated Prisma schema.

### Global identity

| Table | Important columns / constraints |
| --- | --- |
| `users` | id, display_name, status, locale, platform_role; no tenant FK and platform role grants no tenant scope |
| `user_identities` | user_id, type, normalized_value, verified_at; unique(type, normalized_value) |
| `password_credentials` | user_id unique, password_hash, changed_at |
| `auth_sessions` | user_id, token_family_id, refresh_token_hash unique, device/IP metadata, expires/revoked/replaced_by; indexes(user_id, revoked_at), (expires_at) |

### Tenant and access

| Table | Important columns / constraints |
| --- | --- |
| `businesses` | id, name, currency_code, timezone, status; validate timezone in application/catalog |
| `branches` | business_id, code, name, status; unique(business_id, code) |
| `business_members` | business_id, user_id, status, all_branches, authorization_version; unique(business_id, user_id) |
| `roles` | business_id, code, name, system flag; unique(business_id, code) |
| `permissions` | code PK/unique, description, module; platform-managed |
| `role_permissions` | business_id, role_id, permission_code; unique(role_id, permission_code), composite tenant FKs |
| `member_roles` | business_id, member_id, role_id; unique(member_id, role_id) |
| `member_branch_access` | business_id, member_id, branch_id; unique(member_id, branch_id) |
| `business_invitations` | business_id, invited normalized identity, HMAC token hash unique, status/expiry/acceptance, all-branch scope and creator; token value is never stored |
| `business_invitation_roles` / `business_invitation_branch_access` | pending role/branch grants with composite tenant foreign keys; revalidated on acceptance |

### Catalog and parties

| Table | Important columns / constraints |
| --- | --- |
| `categories` | business_id, parent_id, name, archived_at; parent composite tenant FK |
| `units` | business_id, code, name, decimal_places; unique(business_id, code), check decimal_places range |
| `products` | business_id, category_id, unit_id, name, track_stock, tax_code, active, deleted_at |
| `product_variants` | business_id, product_id, sku, cost, selling_price, min_stock, default; partial unique tenant SKU when non-null |
| `product_barcodes` | business_id, variant_id, barcode; unique(business_id, barcode) |
| `customers` | business_id, code/contact fields, active, deleted_at; tenant-aware optional unique normalized phone/email |
| `suppliers` | same tenant ownership/archival pattern |

### Inventory

| Table | Important columns / constraints |
| --- | --- |
| `warehouses` | business_id, branch_id, code, name, status; unique(business_id, code) |
| `stock_balances` | business_id, branch_id, warehouse_id, variant_id, quantity, version; unique(warehouse_id, variant_id), check quantity >= 0 for MVP |
| `stock_movements` | business_id, branch_id, warehouse_id, variant_id, type, quantity_delta, reference_type/id, reversal_of_id, actor_member_id, created_at; quantity != 0; immutable |
| `stock_adjustments/items` | tenant/branch/warehouse, status/reason; item variant and delta; posted documents immutable |
| `stock_transfers/items` | tenant, source/destination warehouse, status; source != destination; quantities non-negative |

### Sales, payments and purchases

| Table | Important columns / constraints |
| --- | --- |
| `sales` | business_id, branch_id, warehouse_id, customer_id, POS session, number, lifecycle/payment status, currency and numeric totals; unique(business_id, number) |
| `sale_items` | business_id, sale_id, variant_id, snapshots, quantity, unit/subtotal/discount/tax/total/cost; positive quantity and non-negative money checks |
| `sale_status_history` | business_id, sale_id, from/to, reason, actor, created_at |
| `refunds/items` | tenant and original sale/item links, amounts/quantities and status; unique human number per tenant |
| `payments` | business_id, branch_id, direction, method, status, amount, currency, external_reference; posted row correction through reversal |
| `payment_allocations` | business_id, payment_id, target_type/id, amount; positive amount; allocation totals enforced transactionally |
| `purchases/items` | tenant, supplier/branch/warehouse, lifecycle/payment statuses, currency/totals and snapshots |
| `goods_receipts/items` | tenant, purchase/item, warehouse, received quantity, posted_at; unique receipt number per tenant |

### Expenses and platform

| Table | Important columns / constraints |
| --- | --- |
| `expense_categories` | business_id, code/name, active; unique(business_id, code) |
| `expenses` | business_id, branch_id, creator, category, amount/currency, incurred_on, status, reversal link |
| `audit_logs` | business_id nullable for global security events, actor, action/entity, sanitized jsonb, request metadata, created_at; append-only |
| `idempotency_records` | business_id, operation, key, request_hash, state, result metadata, expires_at; unique(business_id, operation, key) |
| `outbox_events` | id, business_id nullable, type/version, aggregate, jsonb payload, state/attempts/available_at/processed_at |
| `file_objects` | business_id, provider/bucket/key, MIME, size/checksum/status/uploader; unique(provider, bucket, key) |
| `platform_settings` | singleton global settings, display/support defaults, registration policy, optimistic version and timestamps; no business_id |
| subscription tables | global plans/features plus business subscription/entitlements/usage counters |

## 4. Money rules in storage

Each financial document stores:

- currency code;
- line inputs and calculated snapshots;
- document subtotal, discount, tax, grand total;
- rounding adjustment if required by the approved rounding ADR;
- cost snapshot for historical gross-profit estimates.

Database checks reject negative fields unless the domain explicitly permits them. Document equality (for example total = subtotal - discount + tax + rounding) is recalculated in application code and tested; a SQL check can reinforce simple same-row equations. Never reconstruct historical sale price from the current product price.

## 5. Integrity strategy

- Non-null tenant ownership and composite tenant FKs for all meaningful tenant relations.
- Check constraints for positive quantities, non-zero movement deltas, currency format, valid ranges and distinct transfer locations.
- Tenant-aware uniqueness for SKU, barcode, branch/warehouse codes and document numbers.
- Partial unique indexes allow archived/deleted records to release a business key only where policy allows.
- Posted ledger/history tables are append-only by application permission. Database privileges/triggers may enforce immutability in production after operational needs are understood.
- Status transitions are validated in domain code; optimistic version/conditional `UPDATE ... WHERE status = expected` prevents double transition.
- Deletion behavior defaults to `RESTRICT` for referenced business records. Cascades are limited to non-posted owned children and ephemeral auth records.

## 6. Index strategy

Indexes follow query shapes and lead with tenant scope. Initial major indexes:

```text
products              (business_id, active, name), tenant SKU/barcode lookup
sales                 (business_id, branch_id, created_at desc, id)
sales                 (business_id, customer_id, created_at desc, id)
sales                 (business_id, lifecycle_status, created_at desc, id)
stock_balances        unique(warehouse_id, variant_id), (business_id, branch_id, variant_id)
stock_movements       (business_id, warehouse_id, variant_id, created_at desc, id)
purchases             (business_id, supplier_id, created_at desc, id)
payments              (business_id, created_at desc, id), (business_id, status, created_at)
expenses              (business_id, branch_id, incurred_on desc, id)
audit_logs            (business_id, created_at desc, id), (business_id, entity_type, entity_id)
outbox_events         partial(state, available_at) where state in pending/retry
idempotency_records   unique(business_id, operation, key), (expires_at)
```

The exact text-search design (PostgreSQL trigram/full-text) follows measured search requirements. Avoid duplicating indexes whose left prefix is already covered. Use `EXPLAIN (ANALYZE, BUFFERS)` with representative tenant volumes before adding indexes. Pagination indexes include a unique tie-breaker (`created_at, id`).

## 7. Transactions, locks and idempotency

Prisma interactive transactions wrap critical use cases. Repositories receive the transaction client; they must never accidentally fall back to the global client.

For stock, lock balance rows in deterministic order using reviewed parameterized SQL. Creating a missing balance uses an upsert before lock. Apply changes and movements in the same transaction. A conditional update/check provides a final non-negative guard.

At the beginning of a critical command, insert/claim an idempotency row scoped by business + operation + key. The stored request fingerprint prevents reusing a key with a different payload. Concurrent duplicate inserts conflict on the unique key; the loser reads the committed prior result or receives a retryable `IDEMPOTENCY_IN_PROGRESS`. Business result and successful idempotency state commit together. Store a stable resource ID/status rather than sensitive full response where possible; define retention per operation.

## 8. Soft deletion and retention

- Products, customers and suppliers may have `deleted_at`/archived state and are hidden by default.
- Global users are disabled/anonymized according to account/privacy policy; referenced actors remain resolvable or snapshotted.
- Draft, unposted documents can sometimes be deleted with audit.
- Sales, posted payments, receipts, posted expenses, movements, audit and status history are never hard deleted through product APIs. They use cancel, void, reversal or correction.
- Tenant closure should transition business status, block writes, export if required, then apply an approved retention/anonymization process. Do not cascade-delete a business.

## 9. Reporting and growth

MVP reports use read-only SQL/query repositories against normalized tables, constrained by tenant and business-timezone range converted to UTC. The reporting module must not call mutation services or reuse unbounded CRUD list queries.

Growth sequence:

1. Tune query/index and add summary tables/materialized views refreshed safely.
2. Route tolerant reports to a read replica, acknowledging replication lag.
3. Archive or partition time-heavy tables (`stock_movements`, `audit_logs`, possibly sales) only after volume evidence.
4. Publish outbox data to an analytical store without changing transactional write paths.

## 10. Prisma organization and migrations

Pin a current Prisma version during foundation work and verify its supported multi-file schema workflow. Organize schema fragments by domain only if the feature is stable in that pinned version; otherwise use one schema with clear sections rather than an unsupported preprocessor.

Migration policy:

- migrations are immutable after shared deployment;
- review generated SQL, names, locks and destructive changes;
- use expand/migrate/contract for zero-downtime changes;
- backfills are resumable and tenant-batched;
- production deploy runs migrations as a controlled job, not from every API replica;
- backup/restore and point-in-time recovery are tested before launch.

## 11. Optional PostgreSQL RLS

The schema is RLS-ready, not initially RLS-dependent. A future policy would use a transaction-local setting:

```sql
SET LOCAL app.current_business_id = '...';
```

Tenant policies compare `business_id` with `current_setting(...)`. Connection pooling requires every scoped transaction to set it and fail closed when absent; bypass-owner roles must not serve normal traffic. Background/reporting tasks require the same scope discipline. RLS rollout begins in audit mode/staging with cross-tenant tests and explicit global-table exceptions.
