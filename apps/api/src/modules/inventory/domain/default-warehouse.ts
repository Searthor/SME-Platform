/**
 * Every branch gets a default warehouse in the same transaction that creates the branch, so a new
 * business can sell and receive goods immediately (Phase 1 onboarding: default branch/warehouse).
 */
export const defaultWarehouseFor = (
  warehouseId: string,
  branch: { businessId: string; id: string; code: string; name: string },
) => ({
  id: warehouseId,
  businessId: branch.businessId,
  branchId: branch.id,
  code: `WH-${branch.code}`.toUpperCase().slice(0, 40),
  name: `ສາງຫຼັກ (${branch.name})`.slice(0, 160),
  isDefault: true,
})
