-- AlterTable product_variants
ALTER TABLE "product_variants" ADD COLUMN "size" VARCHAR(60);
ALTER TABLE "product_variants" ADD COLUMN "color" VARCHAR(60);

-- CreateTable product_units
CREATE TABLE "product_units" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "conversion_rate" NUMERIC(20,6) NOT NULL,
  "selling_price" NUMERIC(20,4),
  "barcode" VARCHAR(100),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_product_units_business_id" PRIMARY KEY ("business_id", "id"),
  CONSTRAINT "chk_product_units_conversion_rate" CHECK ("conversion_rate" > 0),
  CONSTRAINT "chk_product_units_selling_price" CHECK ("selling_price" IS NULL OR "selling_price" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_product_units_business_product_unit" ON "product_units"("business_id", "product_id", "unit_id");
CREATE INDEX "idx_product_units_business_product" ON "product_units"("business_id", "product_id");

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "fk_product_units_business"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;

ALTER TABLE "product_units" ADD CONSTRAINT "fk_product_units_product"
  FOREIGN KEY ("business_id", "product_id") REFERENCES "products"("business_id", "id") ON DELETE CASCADE;

ALTER TABLE "product_units" ADD CONSTRAINT "fk_product_units_unit"
  FOREIGN KEY ("business_id", "unit_id") REFERENCES "units"("business_id", "id") ON DELETE RESTRICT;
