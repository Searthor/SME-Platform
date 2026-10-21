CREATE TYPE "PlatformRole" AS ENUM ('USER', 'SUPERADMIN');

ALTER TABLE "users"
  ADD COLUMN "platform_role" "PlatformRole" NOT NULL DEFAULT 'USER';

CREATE TABLE "platform_settings" (
  "id" VARCHAR(32) NOT NULL DEFAULT 'default',
  "platform_name" VARCHAR(120) NOT NULL DEFAULT 'SME Flow',
  "support_email" VARCHAR(254),
  "default_locale" VARCHAR(10) NOT NULL DEFAULT 'lo',
  "default_currency_code" CHAR(3) NOT NULL DEFAULT 'LAK',
  "default_timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Vientiane',
  "allow_registration" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ck_platform_settings_singleton" CHECK ("id" = 'default'),
  CONSTRAINT "ck_platform_settings_currency" CHECK ("default_currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "ck_platform_settings_version" CHECK ("version" > 0)
);

INSERT INTO "platform_settings" (
  "id",
  "platform_name",
  "default_locale",
  "default_currency_code",
  "default_timezone",
  "allow_registration",
  "version",
  "updated_at"
) VALUES (
  'default',
  'SME Flow',
  'lo',
  'LAK',
  'Asia/Vientiane',
  true,
  1,
  CURRENT_TIMESTAMP
);
