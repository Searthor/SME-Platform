-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE_RECEIPT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PurchaseLifecycleStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchasePaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentAllocationTargetType" AS ENUM ('PURCHASE', 'SALE');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "fk_audit_logs_business";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "fk_audit_logs_user";

-- DropForeignKey
ALTER TABLE "auth_sessions" DROP CONSTRAINT "fk_auth_sessions_user";

-- DropForeignKey
ALTER TABLE "branches" DROP CONSTRAINT "fk_branches_business";

-- DropForeignKey
ALTER TABLE "business_invitation_branch_access" DROP CONSTRAINT "fk_business_invitation_branches_branch";

-- DropForeignKey
ALTER TABLE "business_invitation_branch_access" DROP CONSTRAINT "fk_business_invitation_branches_invitation";

-- DropForeignKey
ALTER TABLE "business_invitation_roles" DROP CONSTRAINT "fk_business_invitation_roles_invitation";

-- DropForeignKey
ALTER TABLE "business_invitation_roles" DROP CONSTRAINT "fk_business_invitation_roles_role";

-- DropForeignKey
ALTER TABLE "business_invitations" DROP CONSTRAINT "fk_business_invitations_acceptor";

-- DropForeignKey
ALTER TABLE "business_invitations" DROP CONSTRAINT "fk_business_invitations_business";

-- DropForeignKey
ALTER TABLE "business_invitations" DROP CONSTRAINT "fk_business_invitations_creator";

-- DropForeignKey
ALTER TABLE "business_members" DROP CONSTRAINT "fk_business_members_business";

-- DropForeignKey
ALTER TABLE "business_members" DROP CONSTRAINT "fk_business_members_user";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "fk_categories_business";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "fk_categories_parent";

-- DropForeignKey
ALTER TABLE "member_branch_access" DROP CONSTRAINT "fk_member_branch_access_branch";

-- DropForeignKey
ALTER TABLE "member_branch_access" DROP CONSTRAINT "fk_member_branch_access_member";

-- DropForeignKey
ALTER TABLE "member_roles" DROP CONSTRAINT "fk_member_roles_member";

-- DropForeignKey
ALTER TABLE "member_roles" DROP CONSTRAINT "fk_member_roles_role";

-- DropForeignKey
ALTER TABLE "password_credentials" DROP CONSTRAINT "fk_password_credentials_user";

-- DropForeignKey
ALTER TABLE "product_barcodes" DROP CONSTRAINT "fk_product_barcodes_business";

-- DropForeignKey
ALTER TABLE "product_barcodes" DROP CONSTRAINT "fk_product_barcodes_variant";

-- DropForeignKey
ALTER TABLE "product_units" DROP CONSTRAINT "fk_product_units_business";

-- DropForeignKey
ALTER TABLE "product_units" DROP CONSTRAINT "fk_product_units_product";

-- DropForeignKey
ALTER TABLE "product_units" DROP CONSTRAINT "fk_product_units_unit";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "fk_product_variants_business";

-- DropForeignKey
ALTER TABLE "product_variants" DROP CONSTRAINT "fk_product_variants_product";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "fk_products_business";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "fk_products_category";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "fk_products_unit";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "fk_role_permissions_permission";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "fk_role_permissions_role";

-- DropForeignKey
ALTER TABLE "roles" DROP CONSTRAINT "fk_roles_business";

-- DropForeignKey
ALTER TABLE "units" DROP CONSTRAINT "fk_units_business";

-- DropForeignKey
ALTER TABLE "user_identities" DROP CONSTRAINT "fk_user_identities_user";

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_warehouses_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity_delta" DECIMAL(20,6) NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "reversal_of_id" UUID,
    "actor_user_id" UUID,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "contact_name" VARCHAR(120),
    "phone" VARCHAR(50),
    "email" VARCHAR(254),
    "address" VARCHAR(500),
    "tax_id" VARCHAR(50),
    "notes" VARCHAR(1000),
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_suppliers_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "purchase_number" VARCHAR(50) NOT NULL,
    "lifecycle_status" "PurchaseLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_status" "PurchasePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "currency_code" CHAR(3) NOT NULL,
    "subtotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "notes" VARCHAR(1000),
    "ordered_at" TIMESTAMPTZ(6),
    "expected_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_purchases_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "ordered_quantity" DECIMAL(20,6) NOT NULL,
    "received_quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(20,4) NOT NULL,
    "subtotal" DECIMAL(20,4) NOT NULL,
    "tax_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_purchase_items_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "notes" VARCHAR(1000),
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_goods_receipts_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "goods_receipt_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "goods_receipt_id" UUID NOT NULL,
    "purchase_item_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "received_quantity" DECIMAL(20,6) NOT NULL,
    "unit_cost" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_goods_receipt_items_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "direction" "PaymentDirection" NOT NULL DEFAULT 'OUTBOUND',
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "amount" DECIMAL(20,4) NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" VARCHAR(120),
    "notes" VARCHAR(500),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_payments_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "target_type" "PaymentAllocationTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_payment_allocations_business_id" PRIMARY KEY ("business_id","id")
);

-- CreateIndex
CREATE INDEX "idx_warehouses_business_branch_status" ON "warehouses"("business_id", "branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_warehouses_business_code" ON "warehouses"("business_id", "code");

-- CreateIndex
CREATE INDEX "idx_stock_balances_business_warehouse" ON "stock_balances"("business_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "idx_stock_balances_business_variant" ON "stock_balances"("business_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_stock_balances_warehouse_variant" ON "stock_balances"("warehouse_id", "variant_id");

-- CreateIndex
CREATE INDEX "idx_stock_movements_history" ON "stock_movements"("business_id", "warehouse_id", "variant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_stock_movements_reference" ON "stock_movements"("business_id", "reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "idx_suppliers_business_status_name" ON "suppliers"("business_id", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_suppliers_business_code" ON "suppliers"("business_id", "code");

-- CreateIndex
CREATE INDEX "idx_purchases_business_supplier" ON "purchases"("business_id", "supplier_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_purchases_business_statuses" ON "purchases"("business_id", "lifecycle_status", "payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_purchases_business_number" ON "purchases"("business_id", "purchase_number");

-- CreateIndex
CREATE INDEX "idx_purchase_items_purchase" ON "purchase_items"("business_id", "purchase_id");

-- CreateIndex
CREATE INDEX "idx_goods_receipts_purchase" ON "goods_receipts"("business_id", "purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_goods_receipts_business_number" ON "goods_receipts"("business_id", "receipt_number");

-- CreateIndex
CREATE INDEX "idx_goods_receipt_items_receipt" ON "goods_receipt_items"("business_id", "goods_receipt_id");

-- CreateIndex
CREATE INDEX "idx_payments_business_branch_paid" ON "payments"("business_id", "branch_id", "paid_at" DESC);

-- CreateIndex
CREATE INDEX "idx_payment_allocations_payment" ON "payment_allocations"("business_id", "payment_id");

-- CreateIndex
CREATE INDEX "idx_payment_allocations_target" ON "payment_allocations"("business_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_business_id_role_id_fkey" FOREIGN KEY ("business_id", "role_id") REFERENCES "roles"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_business_id_member_id_fkey" FOREIGN KEY ("business_id", "member_id") REFERENCES "business_members"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_business_id_role_id_fkey" FOREIGN KEY ("business_id", "role_id") REFERENCES "roles"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_branch_access" ADD CONSTRAINT "member_branch_access_business_id_member_id_fkey" FOREIGN KEY ("business_id", "member_id") REFERENCES "business_members"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_branch_access" ADD CONSTRAINT "member_branch_access_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitations" ADD CONSTRAINT "business_invitations_accepted_user_id_fkey" FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitation_roles" ADD CONSTRAINT "business_invitation_roles_business_id_invitation_id_fkey" FOREIGN KEY ("business_id", "invitation_id") REFERENCES "business_invitations"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitation_roles" ADD CONSTRAINT "business_invitation_roles_business_id_role_id_fkey" FOREIGN KEY ("business_id", "role_id") REFERENCES "roles"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitation_branch_access" ADD CONSTRAINT "business_invitation_branch_access_business_id_invitation_i_fkey" FOREIGN KEY ("business_id", "invitation_id") REFERENCES "business_invitations"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_invitation_branch_access" ADD CONSTRAINT "business_invitation_branch_access_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_id_parent_id_fkey" FOREIGN KEY ("business_id", "parent_id") REFERENCES "categories"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_category_id_fkey" FOREIGN KEY ("business_id", "category_id") REFERENCES "categories"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_unit_id_fkey" FOREIGN KEY ("business_id", "unit_id") REFERENCES "units"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_business_id_product_id_fkey" FOREIGN KEY ("business_id", "product_id") REFERENCES "products"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_business_id_variant_id_fkey" FOREIGN KEY ("business_id", "variant_id") REFERENCES "product_variants"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_business_id_product_id_fkey" FOREIGN KEY ("business_id", "product_id") REFERENCES "products"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_business_id_unit_id_fkey" FOREIGN KEY ("business_id", "unit_id") REFERENCES "units"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_business_id_warehouse_id_fkey" FOREIGN KEY ("business_id", "warehouse_id") REFERENCES "warehouses"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_business_id_variant_id_fkey" FOREIGN KEY ("business_id", "variant_id") REFERENCES "product_variants"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_business_id_warehouse_id_fkey" FOREIGN KEY ("business_id", "warehouse_id") REFERENCES "warehouses"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_business_id_variant_id_fkey" FOREIGN KEY ("business_id", "variant_id") REFERENCES "product_variants"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_business_id_warehouse_id_fkey" FOREIGN KEY ("business_id", "warehouse_id") REFERENCES "warehouses"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_business_id_supplier_id_fkey" FOREIGN KEY ("business_id", "supplier_id") REFERENCES "suppliers"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_business_id_purchase_id_fkey" FOREIGN KEY ("business_id", "purchase_id") REFERENCES "purchases"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_business_id_variant_id_fkey" FOREIGN KEY ("business_id", "variant_id") REFERENCES "product_variants"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_business_id_purchase_id_fkey" FOREIGN KEY ("business_id", "purchase_id") REFERENCES "purchases"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_business_id_warehouse_id_fkey" FOREIGN KEY ("business_id", "warehouse_id") REFERENCES "warehouses"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_business_id_goods_receipt_id_fkey" FOREIGN KEY ("business_id", "goods_receipt_id") REFERENCES "goods_receipts"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_business_id_purchase_item_id_fkey" FOREIGN KEY ("business_id", "purchase_item_id") REFERENCES "purchase_items"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_business_id_variant_id_fkey" FOREIGN KEY ("business_id", "variant_id") REFERENCES "product_variants"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_branch_id_fkey" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_business_id_payment_id_fkey" FOREIGN KEY ("business_id", "payment_id") REFERENCES "payments"("business_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_business_id_target_id_fkey" FOREIGN KEY ("business_id", "target_id") REFERENCES "purchases"("business_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
