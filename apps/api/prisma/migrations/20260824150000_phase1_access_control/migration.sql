CREATE TABLE "permissions" (
  "code" VARCHAR(100) NOT NULL,
  "description" VARCHAR(200) NOT NULL,
  "module" VARCHAR(60) NOT NULL,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "roles" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "code" VARCHAR(60) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_roles_business_id" PRIMARY KEY ("business_id", "id")
);

CREATE TABLE "role_permissions" (
  "business_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "permission_code" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_role_permissions" PRIMARY KEY ("business_id", "role_id", "permission_code")
);

CREATE TABLE "member_roles" (
  "business_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pk_member_roles" PRIMARY KEY ("business_id", "member_id", "role_id")
);

CREATE UNIQUE INDEX "uq_roles_business_code" ON "roles"("business_id", "code");
CREATE INDEX "idx_roles_business_name" ON "roles"("business_id", "name");
CREATE INDEX "idx_permissions_module_code" ON "permissions"("module", "code");
CREATE INDEX "idx_role_permissions_permission" ON "role_permissions"("permission_code");
CREATE INDEX "idx_member_roles_role" ON "member_roles"("business_id", "role_id");

ALTER TABLE "roles" ADD CONSTRAINT "fk_roles_business"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_role"
  FOREIGN KEY ("business_id", "role_id") REFERENCES "roles"("business_id", "id") ON DELETE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_permission"
  FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE RESTRICT;
ALTER TABLE "member_roles" ADD CONSTRAINT "fk_member_roles_member"
  FOREIGN KEY ("business_id", "member_id") REFERENCES "business_members"("business_id", "id") ON DELETE CASCADE;
ALTER TABLE "member_roles" ADD CONSTRAINT "fk_member_roles_role"
  FOREIGN KEY ("business_id", "role_id") REFERENCES "roles"("business_id", "id") ON DELETE CASCADE;

INSERT INTO "permissions" ("code", "description", "module") VALUES
  ('business.manage', 'Manage business settings', 'business'),
  ('branch.view', 'View branches', 'branch'),
  ('branch.manage', 'Manage branches', 'branch'),
  ('product.view', 'View products', 'catalog'),
  ('product.create', 'Create products', 'catalog'),
  ('product.update', 'Update products', 'catalog'),
  ('product.delete', 'Archive products', 'catalog'),
  ('sale.view', 'View sales', 'sales'),
  ('sale.create', 'Create sales', 'sales'),
  ('sale.cancel', 'Cancel sales', 'sales'),
  ('sale.refund', 'Refund sales', 'sales'),
  ('stock.view', 'View stock', 'inventory'),
  ('stock.adjust', 'Adjust stock', 'inventory'),
  ('stock.transfer', 'Transfer stock', 'inventory'),
  ('purchase.view', 'View purchases', 'purchasing'),
  ('purchase.create', 'Create purchases', 'purchasing'),
  ('purchase.approve', 'Approve purchases', 'purchasing'),
  ('purchase.receive', 'Receive purchases', 'purchasing'),
  ('supplier.view', 'View suppliers', 'supplier'),
  ('supplier.manage', 'Manage suppliers', 'supplier'),
  ('customer.view', 'View customers', 'customer'),
  ('customer.manage', 'Manage customers', 'customer'),
  ('expense.view', 'View expenses', 'expense'),
  ('expense.create', 'Create expenses', 'expense'),
  ('expense.approve', 'Approve expenses', 'expense'),
  ('report.sales', 'View sales reports', 'report'),
  ('report.profit', 'View profit reports', 'report'),
  ('report.inventory', 'View inventory reports', 'report'),
  ('user.view', 'View business members', 'identity'),
  ('user.manage', 'Manage business members', 'identity'),
  ('role.view', 'View roles and permissions', 'access-control'),
  ('role.manage', 'Manage roles and permissions', 'access-control'),
  ('audit.view', 'View tenant audit activity', 'audit');
