export const permissionDefinitions = [
  { code: 'business.manage', description: 'Manage business settings', module: 'business' },
  { code: 'branch.view', description: 'View branches', module: 'branch' },
  { code: 'branch.manage', description: 'Manage branches', module: 'branch' },
  { code: 'product.view', description: 'View products', module: 'catalog' },
  { code: 'product.create', description: 'Create products', module: 'catalog' },
  { code: 'product.update', description: 'Update products', module: 'catalog' },
  { code: 'product.delete', description: 'Archive products', module: 'catalog' },
  { code: 'sale.view', description: 'View sales', module: 'sales' },
  { code: 'sale.create', description: 'Create sales', module: 'sales' },
  { code: 'sale.discount', description: 'Give manual discounts on sales', module: 'sales' },
  { code: 'sale.cancel', description: 'Cancel sales', module: 'sales' },
  { code: 'sale.refund', description: 'Refund sales', module: 'sales' },
  { code: 'stock.view', description: 'View stock', module: 'inventory' },
  { code: 'stock.adjust', description: 'Adjust stock', module: 'inventory' },
  { code: 'stock.transfer', description: 'Transfer stock', module: 'inventory' },
  { code: 'purchase.view', description: 'View purchases', module: 'purchasing' },
  { code: 'purchase.create', description: 'Create purchases', module: 'purchasing' },
  { code: 'purchase.approve', description: 'Approve purchases', module: 'purchasing' },
  { code: 'purchase.receive', description: 'Receive purchases', module: 'purchasing' },
  { code: 'supplier.view', description: 'View suppliers', module: 'supplier' },
  { code: 'supplier.manage', description: 'Manage suppliers', module: 'supplier' },
  { code: 'customer.view', description: 'View customers', module: 'customer' },
  { code: 'customer.manage', description: 'Manage customers', module: 'customer' },
  { code: 'expense.view', description: 'View expenses', module: 'expense' },
  { code: 'expense.create', description: 'Create expenses', module: 'expense' },
  { code: 'expense.approve', description: 'Approve expenses', module: 'expense' },
  { code: 'report.sales', description: 'View sales reports', module: 'report' },
  { code: 'report.profit', description: 'View profit reports', module: 'report' },
  { code: 'report.inventory', description: 'View inventory reports', module: 'report' },
  { code: 'user.view', description: 'View business members', module: 'identity' },
  { code: 'user.manage', description: 'Manage business members', module: 'identity' },
  { code: 'role.view', description: 'View roles and permissions', module: 'access-control' },
  { code: 'role.manage', description: 'Manage roles and permissions', module: 'access-control' },
  { code: 'audit.view', description: 'View tenant audit activity', module: 'audit' },
] as const

export type PermissionCode = typeof permissionDefinitions[number]['code']

const managerPermissions: readonly PermissionCode[] = [
  'business.manage', 'branch.view', 'branch.manage', 'product.view', 'product.create',
  'product.update', 'sale.view', 'sale.create', 'sale.discount', 'sale.cancel', 'stock.view', 'stock.adjust',
  'stock.transfer', 'purchase.view', 'purchase.create', 'purchase.receive', 'supplier.view',
  'supplier.manage', 'customer.view', 'customer.manage', 'expense.view', 'expense.create',
  'report.sales', 'report.inventory', 'user.view', 'user.manage', 'role.view', 'audit.view',
]

const staffPermissions: readonly PermissionCode[] = [
  'branch.view', 'product.view', 'sale.view', 'sale.create', 'stock.view', 'customer.view',
]

export const defaultRoleTemplates = [
  { code: 'OWNER', name: 'Owner', isSystem: true, permissions: permissionDefinitions.map(item => item.code) },
  { code: 'MANAGER', name: 'Manager', isSystem: true, permissions: managerPermissions },
  { code: 'STAFF', name: 'Staff', isSystem: true, permissions: staffPermissions },
] as const
