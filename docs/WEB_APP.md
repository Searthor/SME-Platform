# ຄູ່ມື Web App — Phase 1

## ຂອບເຂດ

Web app ປັດຈຸບັນຮອງຮັບສະເພາະ Identity ແລະ Multi-Tenancy:

- login ດ້ວຍ email ຫຼື phone ແລະ password;
- ກູ້ session ຄືນດ້ວຍ rotating refresh cookie;
- ເລືອກ business ຈາກ active memberships ທີ່ server ສົ່ງຄືນ;
- ປ້ອງກັນ routes ທີ່ຕ້ອງ login ແລະ active tenant context;
- ສະແດງ branch list ທີ່ backend ກັ່ນຕອງຕາມ TenantContext;
- logout ແລະລ້າງ client session state.
- redirect ບັນຊີ `SUPERADMIN` ໄປ `/superadmin` ແລະປ້ອງກັນ route ນີ້ຈາກ user ທົ່ວໄປ;
- platform console ສຳລັບອ່ານ/ປ່ຽນຄ່າຫຼັກທີ່ backend ອະນຸຍາດ.
- ປັບຂະໜາດ UI 3 ລະດັບ ແລະສີຫຼັກ 5 ຊຸດຈາກ header; preference ຖືກຈື່ໄວ້ໃນ browser.
- tenant navigation ທີ່ສະແດງ Business/Branch, Member, Role, Security ແລະ Activity ຕາມ effective permissions ຂອງ member;
- tenant administration forms ສົ່ງພຽງ intent/IDs ແລະອາໄສ API PermissionGuard/TenantContext ເປັນ authority;
- public Business onboarding, invitation acceptance ແລະ tenant Owner workflow ສຳລັບສ້າງສາຂາ/ກຳນົດ Role ແລະ Branch grants;
- Superadmin business registry ສະແດງສະເພາະ metadata ແລະ registration link ໂດຍບໍ່ໃຫ້ tenant authority;

ບໍ່ມີ forgot-password, Product, Inventory ຫຼື Sales screen ໃນ milestone ນີ້. Invitation delivery ຜ່ານ email/SMS ຍັງບໍ່ມີ; Owner ສົ່ງ link ເອງ.

## Architecture ແລະ security

Nuxt 4 ໃຊ້ Pinia ສຳລັບ authenticated user, memberships, active business ແລະ access token. Access token ຢູ່ໃນ memory ເທົ່ານັ້ນ; ບໍ່ຖືກຂຽນໃສ່ `localStorage`. `sessionStorage` ເກັບພຽງ business selection ສຳລັບ UX ແລະບໍ່ແມ່ນ authorization authority.

`localStorage` ໃຊ້ສະເພາະ UI preference (`size` ແລະ `theme`) ທີ່ຜ່ານ allowlist validation. ມັນບໍ່ເກັບ access token, refresh token, permission ຫຼື tenant authority. ຄ່ານີ້ຜູກກັບ browser/device ປັດຈຸບັນ ແລະບໍ່ sync ຂ້າມອຸປະກອນ.

Browser ເອີ້ນ `/api/v1/**` ທີ່ Nuxt origin ແລະ Nuxt proxy ໄປ NestJS ຕາມ `NUXT_API_SERVER_URL`. Refresh token ຢູ່ HttpOnly/SameSite cookie. CSRF token ຈາກ readable cookie ຖືກສົ່ງໃນ `X-CSRF-Token` ສຳລັບ refresh/logout.

`businessId` ທີ່ frontend ສົ່ງມີສະເພາະ `/auth/select-business` ໃນຖານະ selection input. Backend ຕ້ອງກວດ active membership ກ່ອນອອກ scoped token. ທຸກ tenant-owned endpoint ອື່ນບໍ່ໃຊ້ client `businessId` ເປັນສິດ.

Frontend `isPlatformAdmin` ແລະ route middleware ເປັນພຽງ UX gate. NestJS `PlatformAdminGuard` ກວດ `platformRole` ທີ່ AuthGuard ໂຫຼດຈາກ database ເປັນ authorization authority. Superadmin ບໍ່ສາມາດຜ່ານ tenant routes ໄດ້ຖ້າບໍ່ມີ active Business Member ແລະ tenant context ຕາມກົດປົກກະຕິ.

## ການຕັ້ງຄ່າ ແລະຮັນ

```bash
cp apps/web/.env.example apps/web/.env
pnpm install
pnpm dev
```

ຫຼືເປີດແຍກ:

```bash
pnpm dev:api
pnpm dev:web
```

API `.env` ປັດຈຸບັນໃຊ້ port `3003`; web ໃຊ້ port `3000`. PostgreSQL ຕ້ອງຮັນ ແລະ migration ຕ້ອງເປັນປັດຈຸບັນກ່ອນ login.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Frontend tests ກວດ tenant-selection routing ຕາມ TEN-002 ແລະການ map backend error envelope. Backend test ເພີ່ມການກວດ refresh/CSRF cookie path ຕາມ SEC-003.

## UI Component Library & Theme Architecture

Web app ໃຊ້ theme design system ແບບລວມສູນ (Unified Design System) ທີ່ອີງຕາມ token ໃນ `app/assets/css/main.css` ແລະແຍກ components ເປັນ 7 ກຸ່ມມາດຕະຖານພາຍໃຕ້ `app/components/`:

1. **Layout**: `AppSidebar`, `AppNavbar`, `AppBreadcrumb`, `PageHeader`, `AppShell`
2. **Data**: `DataTable`, `Pagination`, `SearchInput`, `FilterBar` (ຮອງຮັບ Server-side sort/filter)
3. **Forms**: `FormField`, `BaseInput`, `BaseSelect`, `DatePicker`, `BaseCheckbox`, `BaseSwitch`, `FileUpload`
4. **Overlay**: `BaseModal`, `BaseDrawer`, `ConfirmDialog`, `BasePopover`
5. **Feedback**: `ToastContainer` (ຜ່ານ `useToast()`), `BaseAlert`, `SkeletonBlock`, `EmptyState`
6. **Business**: `StatusBadge`, `CurrencyInput` (ໃຊ້ decimal-string, ບໍ່ໃຊ້ float), `PlanCard`, `TenantSwitcher`
7. **Security**: `PermissionGuard` (UX gate ເທົ່ານັ້ນ, API ເປັນ authority), `RoleSelector`, `AuditLog`

ທຸກໆ component ຖືກ configure ໃນ `nuxt.config.ts` ໃຫ້ໂຫຼດແບບ auto-import ໂດຍບໍ່ຕ້ອງ prefix ຊື່ໂຟນເດີ.
Default Theme ຖືກຕັ້ງເປັນ `indigo` (ສີຄາມ) ຕາມແບບ SmeFlow design mockup.

