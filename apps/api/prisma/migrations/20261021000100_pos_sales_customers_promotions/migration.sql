-- Tables that were in schema.prisma but never captured in a migration (previously created via db push).
-- CreateEnum
CREATE TYPE "PosSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('CASH_IN', 'CASH_OUT');

-- CreateEnum
CREATE TYPE "SaleLifecycleStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalePaymentStatus" AS ENUM ('PAID', 'PARTIALLY_PAID', 'UNPAID');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('DISCOUNT', 'BUY_X_GET_Y', 'BUNDLE_CROSS', 'BILL_TOTAL');

-- CreateEnum
CREATE TYPE "PromotionRewardType" AS ENUM ('DISCOUNT_PERCENT', 'DISCOUNT_AMOUNT', 'SPECIAL_PRICE', 'FREE_ITEM');

-- CreateTable
CREATE TABLE "pos_registers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_pos_registers_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "pos_sessions" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "register_id" UUID NOT NULL,
    "session_number" VARCHAR(50) NOT NULL,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_by_user_id" UUID NOT NULL,
    "opening_cash" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMPTZ(6),
    "closed_by_user_id" UUID,
    "closing_cash_count" DECIMAL(20,4),
    "expected_cash" DECIMAL(20,4),
    "cash_difference" DECIMAL(20,4),
    "notes" VARCHAR(1000),
    "total_sales_count" INTEGER NOT NULL DEFAULT 0,
    "total_gross_sales" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total_discount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total_net_sales" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total_cash_sales" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total_bank_sales" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total_credit_sales" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_pos_sessions_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "pos_cash_movements" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "type" "CashMovementType" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "performed_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_pos_cash_movements_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "pos_session_id" UUID,
    "sale_number" VARCHAR(50) NOT NULL,
    "customer_id" UUID,
    "customer_name" VARCHAR(160),
    "currency_code" CHAR(3) NOT NULL DEFAULT 'LAK',
    "subtotal" DECIMAL(20,4) NOT NULL,
    "discount_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(20,4) NOT NULL,
    "paid_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "change_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "lifecycle_status" "SaleLifecycleStatus" NOT NULL DEFAULT 'COMPLETED',
    "payment_status" "SalePaymentStatus" NOT NULL DEFAULT 'PAID',
    "sold_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashier_user_id" UUID NOT NULL,
    "promotion_id" UUID,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_sales_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "variant_name" VARCHAR(100),
    "unit_name" VARCHAR(80),
    "quantity" DECIMAL(20,6) NOT NULL,
    "unit_cost" DECIMAL(20,4) NOT NULL,
    "unit_price" DECIMAL(20,4) NOT NULL,
    "discount_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "promotion_id" UUID,
    "is_promo_gift" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" DECIMAL(20,4) NOT NULL,
    "tax_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(20,4) NOT NULL,

    CONSTRAINT "pk_sale_items_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "amount" DECIMAL(20,4) NOT NULL,
    "tendered_amount" DECIMAL(20,4),
    "change_amount" DECIMAL(20,4),
    "reference" VARCHAR(120),
    "notes" VARCHAR(255),
    "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_sale_payments_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "customer_groups" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "description" VARCHAR(255),
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_customer_groups_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "group_id" UUID,
    "code" VARCHAR(50),
    "name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(40),
    "email" VARCHAR(254),
    "tax_number" VARCHAR(50),
    "address" VARCHAR(500),
    "credit_limit" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_customers_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "product_variant_group_prices" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "customer_group_id" UUID NOT NULL,
    "price" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_variant_group_prices_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "type" "PromotionType" NOT NULL DEFAULT 'DISCOUNT',
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "start_time" VARCHAR(10),
    "end_time" VARCHAR(10),
    "days_of_week" VARCHAR(30),
    "branch_scope" VARCHAR(40),
    "customer_group_scope" VARCHAR(40),
    "min_quantity" DECIMAL(20,6) NOT NULL DEFAULT 1,
    "min_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "reward_type" "PromotionRewardType" NOT NULL DEFAULT 'DISCOUNT_PERCENT',
    "discount_value" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "reward_quantity" DECIMAL(20,6) NOT NULL DEFAULT 1,
    "reward_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "reward_product_id" UUID,
    "reward_variant_id" UUID,
    "reward_unit_id" UUID,
    "max_discount_cap" DECIMAL(20,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_promotions_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "promotion_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "unit_id" UUID,
    "category_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_promotion_items_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_pos_registers_code" ON "pos_registers"("business_id", "branch_id", "code");

-- CreateIndex
CREATE INDEX "idx_pos_sessions_branch_status" ON "pos_sessions"("business_id", "branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pos_sessions_number" ON "pos_sessions"("business_id", "session_number");

-- CreateIndex
CREATE INDEX "idx_pos_cash_movements_session" ON "pos_cash_movements"("business_id", "session_id");

-- CreateIndex
CREATE INDEX "idx_sales_session" ON "sales"("business_id", "pos_session_id");

-- CreateIndex
CREATE INDEX "idx_sales_business_date" ON "sales"("business_id", "sold_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_sales_number" ON "sales"("business_id", "sale_number");

-- CreateIndex
CREATE INDEX "idx_sale_payments_sale" ON "sale_payments"("business_id", "sale_id");

-- CreateIndex
CREATE INDEX "idx_customer_groups_active" ON "customer_groups"("business_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "uq_customer_groups_code" ON "customer_groups"("business_id", "code");

-- CreateIndex
CREATE INDEX "idx_customers_phone" ON "customers"("business_id", "phone");

-- CreateIndex
CREATE INDEX "idx_customers_name" ON "customers"("business_id", "name");

-- CreateIndex
CREATE INDEX "idx_variant_group_prices_group" ON "product_variant_group_prices"("business_id", "customer_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_variant_group_price" ON "product_variant_group_prices"("business_id", "variant_id", "customer_group_id");

-- CreateIndex
CREATE INDEX "idx_promotions_active" ON "promotions"("business_id", "active");

-- CreateIndex
CREATE INDEX "idx_promotions_date_range" ON "promotions"("business_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_promotions_code" ON "promotions"("business_id", "code");

-- CreateIndex
CREATE INDEX "idx_promotion_items_promo" ON "promotion_items"("business_id", "promotion_id");

-- CreateIndex
CREATE INDEX "idx_promotion_items_product" ON "promotion_items"("business_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_promotion_items_variant" ON "promotion_items"("business_id", "variant_id");

-- CreateIndex
CREATE INDEX "idx_promotion_items_unit" ON "promotion_items"("business_id", "unit_id");

-- AddForeignKey
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_business_id_register_id_fkey" FOREIGN KEY ("business_id", "register_id") REFERENCES "pos_registers"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_business_id_session_id_fkey" FOREIGN KEY ("business_id", "session_id") REFERENCES "pos_sessions"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_warehouse_id_fkey" FOREIGN KEY ("business_id", "warehouse_id") REFERENCES "warehouses"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_pos_session_id_fkey" FOREIGN KEY ("business_id", "pos_session_id") REFERENCES "pos_sessions"("business_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_customer_id_fkey" FOREIGN KEY ("business_id", "customer_id") REFERENCES "customers"("business_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_business_id_sale_id_fkey" FOREIGN KEY ("business_id", "sale_id") REFERENCES "sales"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_business_id_variant_id_fkey" FOREIGN KEY ("business_id", "variant_id") REFERENCES "product_variants"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_business_id_sale_id_fkey" FOREIGN KEY ("business_id", "sale_id") REFERENCES "sales"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_group_id_fkey" FOREIGN KEY ("business_id", "group_id") REFERENCES "customer_groups"("business_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_group_prices" ADD CONSTRAINT "product_variant_group_prices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_group_prices" ADD CONSTRAINT "product_variant_group_prices_business_id_variant_id_fkey" FOREIGN KEY ("business_id", "variant_id") REFERENCES "product_variants"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_group_prices" ADD CONSTRAINT "product_variant_group_prices_business_id_customer_group_id_fkey" FOREIGN KEY ("business_id", "customer_group_id") REFERENCES "customer_groups"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_items" ADD CONSTRAINT "promotion_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_items" ADD CONSTRAINT "promotion_items_business_id_promotion_id_fkey" FOREIGN KEY ("business_id", "promotion_id") REFERENCES "promotions"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

