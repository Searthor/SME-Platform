-- CreateTable
CREATE TABLE "document_sequences" (
    "business_id" UUID NOT NULL,
    "sequence_key" VARCHAR(60) NOT NULL,
    "last_value" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_document_sequences" PRIMARY KEY ("business_id","sequence_key")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "business_id" UUID NOT NULL,
    "operation" VARCHAR(60) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_idempotency_records" PRIMARY KEY ("business_id","operation","key")
);

-- CreateIndex
CREATE INDEX "idx_idempotency_records_expires_at" ON "idempotency_records"("expires_at");

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill counters from numbers already issued (format PREFIX-YYYYMM-NNNN) so new numbers continue after them.
INSERT INTO "document_sequences" ("business_id", "sequence_key", "last_value")
SELECT "business_id", seq_key, MAX(seq_value)
FROM (
  SELECT "business_id", 'INV-' || split_part("sale_number", '-', 2) AS seq_key, split_part("sale_number", '-', 3)::int AS seq_value
    FROM "sales" WHERE "sale_number" ~ '^INV-[0-9]{6}-[0-9]+$'
  UNION ALL
  SELECT "business_id", 'PO-' || split_part("purchase_number", '-', 2), split_part("purchase_number", '-', 3)::int
    FROM "purchases" WHERE "purchase_number" ~ '^PO-[0-9]{6}-[0-9]+$'
  UNION ALL
  SELECT "business_id", 'GR-' || split_part("receipt_number", '-', 2), split_part("receipt_number", '-', 3)::int
    FROM "goods_receipts" WHERE "receipt_number" ~ '^GR-[0-9]{6}-[0-9]+$'
  UNION ALL
  SELECT "business_id", 'SHIFT-' || split_part("session_number", '-', 2), split_part("session_number", '-', 3)::int
    FROM "pos_sessions" WHERE "session_number" ~ '^SHIFT-[0-9]{6}-[0-9]+$'
) issued
GROUP BY "business_id", seq_key;
