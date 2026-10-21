CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE "IdentityType" AS ENUM ('EMAIL', 'PHONE');
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "display_name" VARCHAR(120) NOT NULL,
  "locale" VARCHAR(10) NOT NULL DEFAULT 'lo',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_identities" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" "IdentityType" NOT NULL,
  "normalized_value" VARCHAR(254) NOT NULL,
  "verified_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_credentials" (
  "user_id" UUID NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_credentials_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_family_id" UUID NOT NULL,
  "refresh_token_hash" CHAR(64) NOT NULL,
  "selected_business_id" UUID,
  "selected_member_id" UUID,
  "device_name" VARCHAR(120),
  "ip_address" VARCHAR(64),
  "user_agent" VARCHAR(512),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "last_used_at" TIMESTAMPTZ(6),
  "rotated_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "replaced_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "businesses" (
  "id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "currency_code" CHAR(3) NOT NULL,
  "timezone" VARCHAR(80) NOT NULL,
  "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "businesses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_businesses_currency_code" CHECK ("currency_code" ~ '^[A-Z]{3}$')
);

CREATE TABLE "branches" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_branches_business_id" PRIMARY KEY ("business_id", "id")
);

CREATE TABLE "business_members" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "all_branches" BOOLEAN NOT NULL DEFAULT false,
  "authorization_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_business_members_business_id" PRIMARY KEY ("business_id", "id"),
  CONSTRAINT "ck_business_members_authorization_version" CHECK ("authorization_version" > 0)
);

CREATE TABLE "member_branch_access" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_branch_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "business_id" UUID,
  "user_id" UUID,
  "action" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(80) NOT NULL,
  "entity_id" UUID,
  "before" JSONB,
  "after" JSONB,
  "request_id" VARCHAR(80),
  "ip_address" VARCHAR(64),
  "user_agent" VARCHAR(512),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_user_identities_type_value" ON "user_identities"("type", "normalized_value");
CREATE INDEX "idx_user_identities_user" ON "user_identities"("user_id");
CREATE UNIQUE INDEX "uq_auth_sessions_refresh_hash" ON "auth_sessions"("refresh_token_hash");
CREATE UNIQUE INDEX "uq_auth_sessions_replaced_by" ON "auth_sessions"("replaced_by_id");
CREATE INDEX "idx_auth_sessions_user_revoked" ON "auth_sessions"("user_id", "revoked_at");
CREATE INDEX "idx_auth_sessions_family" ON "auth_sessions"("token_family_id");
CREATE INDEX "idx_auth_sessions_expires" ON "auth_sessions"("expires_at");
CREATE UNIQUE INDEX "uq_branches_business_code" ON "branches"("business_id", "code");
CREATE INDEX "idx_branches_business_status" ON "branches"("business_id", "status");
CREATE UNIQUE INDEX "uq_business_members_business_user" ON "business_members"("business_id", "user_id");
CREATE INDEX "idx_business_members_user_status" ON "business_members"("user_id", "status");
CREATE UNIQUE INDEX "uq_member_branch_access" ON "member_branch_access"("business_id", "member_id", "branch_id");
CREATE INDEX "idx_member_branch_access_branch" ON "member_branch_access"("business_id", "branch_id");
CREATE INDEX "idx_audit_logs_business_created" ON "audit_logs"("business_id", "created_at" DESC, "id");
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("business_id", "entity_type", "entity_id");

ALTER TABLE "user_identities" ADD CONSTRAINT "fk_user_identities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "password_credentials" ADD CONSTRAINT "fk_password_credentials_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "fk_auth_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "business_members" ADD CONSTRAINT "fk_business_members_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "business_members" ADD CONSTRAINT "fk_business_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "member_branch_access" ADD CONSTRAINT "fk_member_branch_access_member" FOREIGN KEY ("business_id", "member_id") REFERENCES "business_members"("business_id", "id") ON DELETE CASCADE;
ALTER TABLE "member_branch_access" ADD CONSTRAINT "fk_member_branch_access_branch" FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
