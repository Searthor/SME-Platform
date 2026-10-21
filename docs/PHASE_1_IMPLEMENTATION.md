# ລາຍງານການສ້າງ Phase 1 — Identity ແລະ Multi-Tenancy

## ຂອບເຂດທີ່ສ້າງແລ້ວ

- User ແບບ global ໂດຍບໍ່ມີ `businessId`.
- Email/phone identity ແຍກຈາກ password credential ເພື່ອຮອງຮັບ OAuth/SSO ໃນອະນາຄົດ.
- Business onboarding ທີ່ສ້າງ User, Business, default Branch, owner membership, session ແລະ audit log ໃນ transaction ດຽວ.
- Business Member ທີ່ຮອງຮັບ user ໜຶ່ງຄົນຢູ່ຫຼາຍ business, `allBranches`, selected branch grants ແລະ `authorizationVersion`.
- Argon2id password hashing, short-lived JWT access token, opaque refresh token ທີ່ເກັບເປັນ HMAC hash, rotation, family revocation ແລະ reuse detection.
- HttpOnly refresh cookie ກັບ double-submit CSRF token ສຳລັບ refresh/logout.
- Business selection ທີ່ກວດ membership ຈາກ server ກ່ອນອອກ scoped access token.
- Tenant Guard ແລະ `AsyncLocalStorage` Tenant Context ທີ່ກວດ user, session, member, business, authorization version ແລະ branch scope.
- Tenant-scoped repositories ສຳລັບ Business, Branch ແລະ Membership.
- Composite tenant foreign keys ລະຫວ່າ member/branch access ເພື່ອປ້ອງກັນ cross-tenant relation ໃນ database.
- API validation, response/error envelope, request correlation ID, strict TypeScript, lint/build/test foundation.
- Nuxt 4 web ພ້ອມ Tailwind 4 ແລະ Pinia: login, business selector, protected route middleware, dashboard shell ແລະ branch list.
- Typed frontend API boundary ທີ່ແປ stable backend error code ແລະບໍ່ນຳ Prisma model ເຂົ້າ frontend.
- Nuxt same-origin proxy `/api/v1/**` ໄປ NestJS ເພື່ອຮັກສາ cookie flow ໃຫ້ງ່າຍ ແລະຫຼຸດ CORS surface.
- Access token ເກັບໃນ Pinia memory; refresh token ຍັງເປັນ HttpOnly cookie. CSRF cookie ຖືກປັບ path ເປັນ `/` ເພື່ອໃຫ້ double-submit header ເຮັດວຽກຫຼັງ browser reload, ໂດຍ refresh cookie ຍັງຈຳກັດຢູ່ `/api/v1/auth`.
- In-memory rate limiting ສຳລັບ register/login/refresh; ໃນການ deploy ຫຼາຍ API instances ຕ້ອງປ່ຽນ throttler storage ເປັນ Redis-backed shared store.
- Platform `SUPERADMIN` ທີ່ແຍກອອກຈາກ Business Member/tenant roles, ກວດ role ປັດຈຸບັນຈາກ database ໃນທຸກ authenticated request ແລະບໍ່ໃຫ້ສິດ tenant ໂດຍອັດຕະໂນມັດ.
- Platform settings singleton ສຳລັບຊື່ລະບົບ, support email, locale/currency/timezone ເລີ່ມຕົ້ນ ແລະ public-registration policy; ການປ່ຽນຄ່າມີ validation, transaction ແລະ audit log.
- Idempotent superadmin provisioning ຜ່ານ environment secrets ແລະ Prisma seed; password ຖືກ hash ດ້ວຍ Argon2id ແລະບໍ່ມີ default password ໃນ source code.
- Permission catalog 33 ລາຍການ, tenant-owned `Role`, composite `RolePermission`/`MemberRole` ແລະ default `OWNER`, `MANAGER`, `STAFF` roles.
- `PermissionGuard` ແລະ `@RequirePermissions()` ທີ່ deny-by-default ແລະກວດ effective permission ຈາກ database ຕາມ active `BusinessMember`.
- Member administration ສຳລັບເພີ່ມ user ທີ່ມີ account ແລ້ວ, ກຳນົດ role/branch scope, suspend/activate ແລະປ້ອງກັນ last owner.
- Branch create/update ທີ່ tenant-scoped, permission-protected, transaction/audit ແລະປ້ອງກັນ foreign `x-branch-id` ແມ່ນແຕ່ member ທີ່ມີ `allBranches`.
- Role/member/branch mutations ສ້າງ audit ໃນ transaction; role/member grant changes increment `authorizationVersion` ຂອງ member ທີ່ໄດ້ຮັບຜົນ.
- Tenant settings web UI ສຳລັບ Business/Branch, Member, Role/Permission, personal sessions ແລະ tenant audit activity.
- Public Business onboarding UI ທີ່ສ້າງ Owner, Business, ສາຂາຫຼັກ ແລະ default roles ຜ່ານ transaction ທີ່ມີຢູ່.
- Business profile update ສຳລັບ Owner ແລະ platform business registry ແບບ metadata-only ສຳລັບ Superadmin.
- Tenant invitation workflow ທີ່ເກັບ token ເປັນ HMAC hash, ໝົດອາຍຸໃນ 7 ມື້, revalidate Role/Branch ໃນ transaction ແລະຮອງຮັບທັງ user ໃໝ່/ບັນຊີທີ່ມີແລ້ວ.

Catalog backend ສຳລັບ category, unit ແລະ product/default variant ພ້ອມ tenant scoping, permission, audit ແລະ optimistic versioning ຖືກເພີ່ມຫຼັງ Phase 1. Product UI ຢູ່ `/products`. Sales, Inventory ແລະ Payment ຍັງບໍ່ໄດ້ສ້າງ.

## Web routes ປັດຈຸບັນ

```text
/login             ເຂົ້າລະບົບດ້ວຍ email/phone ແລະ password
/register          ສ້າງ Owner, Business ແລະສາຂາຫຼັກ
/accept-invitation/:token ສ້າງ/ຢືນຢັນ account ແລະຮັບ Role/Branch grants
/select-business   ເລືອກສະເພາະ active membership ຈາກ server
/dashboard         Phase 1 shell ແລະສາຂາທີ່ TenantContext ອະນຸຍາດ
/products          Catalog UI: ຄົ້ນຫາ, ສ້າງ, archive ສິນຄ້າ ແລະຈັດການ category/unit ພື້ນຖານ
/superadmin        Platform console ແລະການຕັ້ງຄ່າຫຼັກສຳລັບ SUPERADMIN
/superadmin/businesses ລາຍການ Business metadata ແລະ registration link
/settings/business Business profile ແລະ Branch administration ຕາມ permission
/settings/members  Member, Role assignment ແລະ branch scope
/settings/roles    Permission catalog ແລະ custom tenant roles
/settings/security Active sessions ແລະ session revocation ຂອງ user ປັດຈຸບັນ
/settings/activity Tenant audit activity ທີ່ຈຳກັດ 100 ລາຍການ
```

ບໍ່ມີ Product ຫຼື Sales UI. Dashboard ບໍ່ເປັນ authorization authority; NestJS Guard/TenantContext ຍັງເປັນຜູ້ກວດສິດຈິງ.

## API ປັດຈຸບັນ

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/logout-all
GET  /api/v1/auth/me
POST /api/v1/auth/select-business

GET  /api/v1/business
PATCH /api/v1/business
GET  /api/v1/branches
GET  /api/v1/branches/:branchId
GET  /api/v1/memberships
GET  /api/v1/memberships/:memberId
POST /api/v1/memberships
PATCH /api/v1/memberships/:memberId
GET  /api/v1/membership-invitations
POST /api/v1/membership-invitations
POST /api/v1/membership-invitations/:invitationId/revoke
GET  /api/v1/auth/invitations/:token
POST /api/v1/auth/invitations/:token/accept
POST /api/v1/branches
PATCH /api/v1/branches/:branchId
GET  /api/v1/access-control/me
GET  /api/v1/access-control/permissions
GET  /api/v1/access-control/roles
POST /api/v1/access-control/roles
PATCH /api/v1/access-control/roles/:roleId
GET  /api/v1/audit-logs
GET  /api/v1/auth/sessions
POST /api/v1/auth/sessions/:sessionId/revoke
GET  /api/v1/platform/admin/settings
PATCH /api/v1/platform/admin/settings
GET  /api/v1/platform/admin/businesses
GET  /api/v1/health/live
```

`businessId` ມີໃນ `select-business` ເທົ່ານັ້ນໃນຖານະ selection input; server ຈະກວດ active membership ກ່ອນເຊື່ອມ context. Tenant-owned create/read/update ຈະບໍ່ເຊື່ອ `businessId` ຈາກ payload.

## ການຕັດສິນດ້ານ authorization

`allBranches` ແມ່ນ data scope ແລະບໍ່ແມ່ນສິດ admin. Endpoint ຈັດການທຸກລາຍການຕ້ອງຜ່ານ PermissionGuard ແລະ TenantGuard. System roles ຖືກປ້ອງກັນຈາກການແກ້ permission; tenant ສາມາດສ້າງ/ແກ້ custom roles ໄດ້. Platform `SUPERADMIN` ຍັງບໍ່ມີ tenant authority ໂດຍອັດຕະໂນມັດ.

## ຄຳສັ່ງພັດທະນາ

```bash
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm db:up
pnpm prisma:migrate
pnpm prisma:generate
pnpm prisma:seed
pnpm dev
pnpm dev:web
```

Quality checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Web API proxy ອ່ານ `NUXT_API_SERVER_URL`; ຄ່າເລີ່ມຕົ້ນແມ່ນ `http://localhost:3003` ໃຫ້ກົງກັບ API `.env` ປັດຈຸບັນ.

ກ່ອນ `pnpm prisma:seed`, ກຳນົດ `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` ຢ່າງໜ້ອຍ 16 ຕົວ ແລະ `SUPERADMIN_DISPLAY_NAME` ໃນ `apps/api/.env`. Seed ຈະສ້າງບັນຊີໃໝ່ ຫຼື promote identity ທີ່ມີຢູ່ໂດຍບໍ່ສ້າງ Business Member; ຖ້າບັນຊີເກົ່າມີ password ແລ້ວ seed ຈະບໍ່ overwrite password ນັ້ນ.

PostgreSQL E2E isolation suite ຕ້ອງການ database ທີ່ migration ແລ້ວ:

```bash
TEST_DATABASE_URL=postgresql://... pnpm test:e2e
```

Test database ຕ້ອງແຍກຈາກ development/production ເພາະ suite ຈະລຶບ fixture rows ກ່ອນແຕ່ລະ test.

## ວຽກທີ່ຕ້ອງເຮັດຕໍ່

1. ເຊື່ອມ notification/email/SMS delivery adapter ເຂົ້າ invitation workflow; ປັດຈຸບັນ Owner ສຳເນົາແລະສົ່ງ link ເອງ.
2. ເພີ່ມ route-policy coverage test ແບບສະແກນ controllers ທັງ application ເມື່ອຈຳນວນ modules ເພີ່ມ.
3. ດຳເນີນ Phase 2 Catalog ຫຼັງທົບທວນ Phase 1 exit gate.
