export type BranchScope = { kind: 'all' } | { kind: 'selected'; branchIds: readonly string[] }

export type TenantContext = {
  requestId: string
  userId: string
  sessionId: string
  memberId: string
  businessId: string
  authorizationVersion: number
  branchScope: BranchScope
  activeBranchId?: string
}
