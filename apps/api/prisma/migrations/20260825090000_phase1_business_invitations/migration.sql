CREATE TYPE "BusinessInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

CREATE TABLE "business_invitations" (
  "id" UUID NOT NULL,
  "business_id" UUID NOT NULL,
  "identity_type" "IdentityType" NOT NULL,
  "normalized_identity" VARCHAR(254) NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "status" "BusinessInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "all_branches" BOOLEAN NOT NULL DEFAULT false,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "accepted_user_id" UUID,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pk_business_invitations_business_id" PRIMARY KEY ("business_id", "id")
);

CREATE TABLE "business_invitation_roles" (
  "business_id" UUID NOT NULL,
  "invitation_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  CONSTRAINT "pk_business_invitation_roles" PRIMARY KEY ("business_id", "invitation_id", "role_id")
);

CREATE TABLE "business_invitation_branch_access" (
  "business_id" UUID NOT NULL,
  "invitation_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  CONSTRAINT "pk_business_invitation_branches" PRIMARY KEY ("business_id", "invitation_id", "branch_id")
);

CREATE UNIQUE INDEX "uq_business_invitations_token_hash" ON "business_invitations"("token_hash");
CREATE INDEX "idx_business_invitations_status" ON "business_invitations"("business_id", "status", "created_at" DESC);
CREATE INDEX "idx_business_invitations_identity" ON "business_invitations"("identity_type", "normalized_identity");
CREATE INDEX "idx_business_invitation_roles_role" ON "business_invitation_roles"("business_id", "role_id");
CREATE INDEX "idx_business_invitation_branches_branch" ON "business_invitation_branch_access"("business_id", "branch_id");

ALTER TABLE "business_invitations" ADD CONSTRAINT "fk_business_invitations_business"
  FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT;
ALTER TABLE "business_invitations" ADD CONSTRAINT "fk_business_invitations_creator"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "business_invitations" ADD CONSTRAINT "fk_business_invitations_acceptor"
  FOREIGN KEY ("accepted_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "business_invitation_roles" ADD CONSTRAINT "fk_business_invitation_roles_invitation"
  FOREIGN KEY ("business_id", "invitation_id") REFERENCES "business_invitations"("business_id", "id") ON DELETE CASCADE;
ALTER TABLE "business_invitation_roles" ADD CONSTRAINT "fk_business_invitation_roles_role"
  FOREIGN KEY ("business_id", "role_id") REFERENCES "roles"("business_id", "id") ON DELETE RESTRICT;
ALTER TABLE "business_invitation_branch_access" ADD CONSTRAINT "fk_business_invitation_branches_invitation"
  FOREIGN KEY ("business_id", "invitation_id") REFERENCES "business_invitations"("business_id", "id") ON DELETE CASCADE;
ALTER TABLE "business_invitation_branch_access" ADD CONSTRAINT "fk_business_invitation_branches_branch"
  FOREIGN KEY ("business_id", "branch_id") REFERENCES "branches"("business_id", "id") ON DELETE RESTRICT;
