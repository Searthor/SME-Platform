-- Manual POS discounts now require their own permission (default: Owner and Manager system roles).
INSERT INTO "permissions" ("code", "description", "module")
VALUES ('sale.discount', 'Give manual discounts on sales', 'sales')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("business_id", "role_id", "permission_code")
SELECT "business_id", "id", 'sale.discount'
  FROM "roles"
 WHERE "is_system" = true AND "code" IN ('OWNER', 'MANAGER')
ON CONFLICT DO NOTHING;
