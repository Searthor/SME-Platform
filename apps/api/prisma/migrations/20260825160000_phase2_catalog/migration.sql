CREATE TABLE "categories" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "parent_id" UUID,
  "name" VARCHAR(120) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_categories_business_id" PRIMARY KEY ("business_id", "id")
);

CREATE TABLE "units" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "decimal_places" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_units_business_id" PRIMARY KEY ("business_id", "id"),
  CONSTRAINT "chk_units_decimal_places" CHECK ("decimal_places" BETWEEN 0 AND 6)
);

CREATE TABLE "products" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "category_id" UUID,
  "unit_id" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "description" VARCHAR(1000),
  "track_stock" BOOLEAN NOT NULL DEFAULT true,
  "tax_code" VARCHAR(40),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "archived_at" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_products_business_id" PRIMARY KEY ("business_id", "id"),
  CONSTRAINT "chk_products_version" CHECK ("version" > 0)
);

CREATE TABLE "product_variants" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "name" VARCHAR(120),
  "sku" VARCHAR(80),
  "cost" NUMERIC(20,4) NOT NULL DEFAULT 0,
  "selling_price" NUMERIC(20,4) NOT NULL,
  "min_stock" NUMERIC(20,6) NOT NULL DEFAULT 0,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_product_variants_business_id" PRIMARY KEY ("business_id", "id"),
  CONSTRAINT "chk_product_variants_cost" CHECK ("cost" >= 0),
  CONSTRAINT "chk_product_variants_selling_price" CHECK ("selling_price" >= 0),
  CONSTRAINT "chk_product_variants_min_stock" CHECK ("min_stock" >= 0)
);

CREATE TABLE "product_barcodes" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "barcode" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_product_barcodes_business_id" PRIMARY KEY ("business_id", "id")
);

CREATE UNIQUE INDEX "uq_categories_business_name" ON "categories"("business_id", "name");
CREATE INDEX "idx_categories_business_archived_name" ON "categories"("business_id", "archived_at", "name");
CREATE UNIQUE INDEX "uq_units_business_code" ON "units"("business_id", "code");
CREATE INDEX "idx_units_business_active_name" ON "units"("business_id", "active", "name");
CREATE INDEX "idx_products_business_state_name" ON "products"("business_id", "archived_at", "active", "name");
CREATE INDEX "idx_products_business_category" ON "products"("business_id", "category_id");
CREATE UNIQUE INDEX "uq_product_variants_business_sku" ON "product_variants"("business_id", "sku");
CREATE UNIQUE INDEX "uq_product_variants_default" ON "product_variants"("business_id", "product_id") WHERE "is_default" = true;
CREATE INDEX "idx_product_variants_business_product" ON "product_variants"("business_id", "product_id", "active");
CREATE UNIQUE INDEX "uq_product_barcodes_business_barcode" ON "product_barcodes"("business_id", "barcode");
CREATE INDEX "idx_product_barcodes_business_variant" ON "product_barcodes"("business_id", "variant_id");

ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_business"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_parent"
  FOREIGN KEY ("business_id", "parent_id") REFERENCES "categories"("business_id", "id") ON DELETE RESTRICT;
ALTER TABLE "units" ADD CONSTRAINT "fk_units_business"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_business"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_category"
  FOREIGN KEY ("business_id", "category_id") REFERENCES "categories"("business_id", "id") ON DELETE RESTRICT;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_unit"
  FOREIGN KEY ("business_id", "unit_id") REFERENCES "units"("business_id", "id") ON DELETE RESTRICT;
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_business"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_product"
  FOREIGN KEY ("business_id", "product_id") REFERENCES "products"("business_id", "id") ON DELETE RESTRICT;
ALTER TABLE "product_barcodes" ADD CONSTRAINT "fk_product_barcodes_business"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "product_barcodes" ADD CONSTRAINT "fk_product_barcodes_variant"
  FOREIGN KEY ("business_id", "variant_id") REFERENCES "product_variants"("business_id", "id") ON DELETE CASCADE;
