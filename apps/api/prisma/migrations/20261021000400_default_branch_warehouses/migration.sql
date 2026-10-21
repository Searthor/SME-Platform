-- Branches created before onboarding provisioned a default warehouse could not sell or receive goods.
-- IDs are UUIDv7 (48-bit ms timestamp, version 7, RFC 4122 variant) because API DTOs validate v7.
INSERT INTO "warehouses" ("id", "business_id", "branch_id", "code", "name", "is_default", "status", "created_at", "updated_at")
SELECT (
         lpad(to_hex((extract(epoch FROM clock_timestamp()) * 1000)::bigint), 12, '0')
         || '7' || substr(md5(random()::text || b."id"::text), 1, 3)
         || to_hex(8 + floor(random() * 4)::int) || substr(md5(random()::text || b."code"), 1, 15)
       )::uuid,
       b."business_id",
       b."id",
       left(upper('WH-' || b."code"), 40),
       left('ສາງຫຼັກ (' || b."name" || ')', 160),
       true,
       'ACTIVE',
       now(),
       now()
  FROM "branches" b
 WHERE NOT EXISTS (
         SELECT 1 FROM "warehouses" w WHERE w."business_id" = b."business_id" AND w."branch_id" = b."id"
       )
ON CONFLICT ("business_id", "code") DO NOTHING;
