# REST API Guidelines

## 1. Base conventions

- Base path: `/api/v1`.
- JSON uses `camelCase`; timestamps use ISO 8601 UTC (`2026-08-24T03:00:00.000Z`).
- IDs are UUID strings. Money and quantities that require decimal fidelity are JSON strings.
- DTOs are explicit API contracts. Prisma entities never cross the transport boundary.
- The API ignores no unknown write fields: global validation uses whitelist plus forbid-non-whitelisted behavior.
- OpenAPI is generated and reviewed; the stable shared `api-contracts` package mirrors deliberate request/response contracts, not implementation types.

## 2. Resource design

Use nouns and explicit action subresources for meaningful domain commands:

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/products/{productId}
PATCH  /api/v1/products/{productId}

POST   /api/v1/sales
GET    /api/v1/sales/{saleId}
POST   /api/v1/sales/{saleId}/cancel
POST   /api/v1/sales/{saleId}/refunds

GET    /api/v1/inventory/stocks
GET    /api/v1/inventory/movements
POST   /api/v1/inventory/adjustments
POST   /api/v1/stock-transfers/{transferId}/dispatch
POST   /api/v1/stock-transfers/{transferId}/receive

POST   /api/v1/purchases/{purchaseId}/receipts
```

Commands such as cancel, receive and dispatch are not generic `PATCH status`; they validate a transition, require a reason/permission and produce related records. URLs do not contain `businessId` for ordinary tenant APIs because active business comes from authenticated context. Branch ID is included only where it identifies the intended operating scope and is server-validated.

## 3. Success envelopes

Single resource:

```json
{
  "success": true,
  "data": {
    "id": "0198e2d5-2e5c-7a01-8d3c-3c446e49df51",
    "total": "500000.0000",
    "currencyCode": "LAK"
  },
  "meta": { "requestId": "01K..." }
}
```

Collection:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "requestId": "01K...",
    "page": { "nextCursor": null, "hasNext": false }
  }
}
```

Use `201 Created` for creation and include a `Location` header where useful. Use `204 No Content` only when clients gain nothing from a body; consistent envelopes are preferred for commands returning the updated resource/status.

## 4. Errors

All application errors use stable machine codes:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock",
    "details": {
      "items": [{ "productVariantId": "...", "available": "1.000000" }]
    }
  },
  "meta": { "requestId": "01K..." }
}
```

`message` is safe/user-presentable where feasible. `details` is structured, stable enough for UI handling and contains no stack, SQL, secret or foreign-tenant information. Central exception mapping translates domain/application errors. Unexpected failures return `INTERNAL_ERROR` with request ID and log the actual exception.

Status mapping:

| HTTP | Use |
| --- | --- |
| 400 | malformed request/syntax |
| 401 | missing/invalid/expired authentication |
| 403 | authenticated but business/branch/permission/feature denied |
| 404 | scoped resource not found (also hides foreign tenant resource) |
| 409 | state conflict, duplicate key, idempotency in progress, limit reached |
| 422 | semantically invalid command such as payment/stock rule violation (use consistently) |
| 429 | rate limited |
| 500 | unexpected server failure |
| 503 | required dependency unavailable/retry later |

Validation errors use code `VALIDATION_FAILED` and field paths. Error codes such as `PRODUCT_NOT_FOUND`, `INVALID_PAYMENT_AMOUNT`, `SALE_ALREADY_CANCELLED` and `PURCHASE_ALREADY_RECEIVED` live in a governed registry.

## 5. Pagination, filtering, sorting and search

Use cursor pagination for high-growth/chronological resources (`sales`, movements, audit, payments):

```text
?limit=50&after=<opaqueCursor>&sort=-createdAt
```

Cursor encodes the full sort key including a unique tie-breaker and is treated as opaque. Cap limits (default 25, maximum typically 100). Small administrative lists may use page/offset if totals are required and bounded.

Filters are allowlisted and typed:

```text
?branchId=...&status=COMPLETED&createdFrom=...&createdTo=...
```

Sorting is allowlisted; prefix `-` means descending. Search uses `q` with length limits and server-side normalization. Unknown filter/sort fields fail validation rather than becoming unsafe dynamic SQL. Date-only filters are interpreted in business timezone and documented as half-open intervals `[from, to)`.

## 6. Idempotency and concurrency

Critical endpoints require `Idempotency-Key`:

- sale creation/completion;
- payment posting/refund;
- purchase receiving;
- stock transfer dispatch/receive;
- external callback handling.

Keys are opaque high-entropy values (UUID acceptable), scoped to business and operation, and reused only when retrying the exact same intent. The server hashes/canonicalizes relevant request input. Same key + different fingerprint returns `409 IDEMPOTENCY_KEY_REUSED`. A completed retry returns the original resource/result and status semantics. Document key retention.

For editable resources, expose an integer `version` or strong `ETag`; update requires `If-Match`/version and returns `409 VERSION_CONFLICT` when stale. Domain command transitions always use expected-state conditional writes even when the client omits a version.

## 7. Sales example contract

The client sends intent:

```json
{
  "branchId": "...",
  "warehouseId": "...",
  "customerId": null,
  "items": [
    {
      "productVariantId": "...",
      "quantity": "2.000000",
      "requestedDiscount": { "type": "AMOUNT", "value": "10000.0000" }
    }
  ],
  "payments": [
    { "method": "CASH", "amount": "200000.0000" },
    { "method": "LAO_QR", "amount": "300000.0000", "reference": "..." }
  ]
}
```

It does not submit authoritative unit price, subtotal, tax or total. The response returns server-calculated snapshots. If a client displays a preview, completion may still return changed pricing/availability; a future quote/version mechanism can guarantee a price for a bounded interval.

Implemented POS contract: `POST /pos/quote` takes `{ branchId, customerId?, priceGroupId?, manualDiscount?: { type: "AMOUNT" | "PERCENT", value }, items: [{ variantId, quantity }] }` and returns the server-priced lines (including promotion gift lines), applied promotions and totals. `POST /pos/sales` takes the same fields plus session, payments and `expectedGrandTotal`; any client price, discount amount, promotion ID or gift line is rejected as an unknown field. When the re-priced total differs from `expectedGrandTotal` the sale is refused with `409 SALE_TOTAL_CHANGED` and nothing is posted, so the cashier re-quotes before charging.

## 8. Security and context headers

- `Authorization: Bearer <access token>` for protected APIs.
- `Idempotency-Key` on critical commands.
- `X-Request-Id` may be accepted if syntactically valid; server always returns its effective request ID.
- Business scope is preferably in a server-issued scoped access token. If an active-business header is adopted, it is merely a selection passed through membership resolution.
- Never accept roles, permissions, calculated totals or owner IDs as authoritative inputs.

CORS uses configured origins, not wildcard with credentials. Rate limits are tighter for login, refresh, uploads and exports. Request and upload sizes are capped. Sensitive response data uses appropriate `Cache-Control`.

## 9. Versioning and compatibility

`/v1` covers breaking transport/semantic changes. Additive fields are normally backward compatible; clients must tolerate new response fields and enum values according to contract policy. Removing/renaming fields, changing meaning/type or narrowing accepted input requires a new version or deprecation window.

Shared contract packages are versioned inside the monorepo and contain transport-safe TypeScript types/constants. Runtime validation remains on both server and client boundaries as appropriate; TypeScript alone does not validate network JSON.

Events have their own schema version and are not assumed to equal REST DTOs.

## 10. Bulk, export and files

Bulk endpoints cap item count and report per-item outcomes only where partial success is explicitly safe. Financial/inventory postings default to atomic commands.

Potentially slow exports return `202 Accepted` with a job resource; workers later produce a private expiring file. Upload flow validates content and may use presigned upload/finalization in production. File IDs are tenant-scoped; stored object URLs/keys are not treated as authorization.

## 11. Documentation and testing

Each endpoint documents permission, branch scope, entitlement, idempotency, request/response DTOs, errors and transaction behavior in OpenAPI. Contract tests verify envelopes and representative errors. E2E tests exercise authentication, isolation and idempotent critical flows rather than only happy-path controller status codes.

