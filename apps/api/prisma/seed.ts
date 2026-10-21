import 'dotenv/config'
import { PlatformRole, PrismaClient, UserStatus } from '@prisma/client'
import { argon2id, hash } from 'argon2'
import { v7 as uuidv7 } from 'uuid'
import { defaultRoleTemplates, permissionDefinitions } from '../src/modules/access-control/domain/permission-catalog'

const prisma = new PrismaClient()

const seedAccessControl = async (): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    for (const permission of permissionDefinitions) {
      await tx.permission.upsert({
        where: { code: permission.code },
        create: permission,
        update: { description: permission.description, module: permission.module },
      })
    }
  })

  const businesses = await prisma.business.findMany({ select: { id: true } })
  for (const business of businesses) {
    await prisma.$transaction(async (tx) => {
      const roles = new Map<string, string>()
      for (const template of defaultRoleTemplates) {
        const role = await tx.role.upsert({
          where: { businessId_code: { businessId: business.id, code: template.code } },
          create: {
            id: uuidv7(),
            businessId: business.id,
            code: template.code,
            name: template.name,
            isSystem: template.isSystem,
          },
          update: { name: template.name, isSystem: template.isSystem },
          select: { id: true },
        })
        roles.set(template.code, role.id)
        await tx.rolePermission.createMany({
          data: template.permissions.map(permissionCode => ({
            businessId: business.id,
            roleId: role.id,
            permissionCode,
          })),
          skipDuplicates: true,
        })
      }

      const ownerRoleId = roles.get('OWNER')
      if (!ownerRoleId) throw new Error('OWNER role provisioning failed')
      const existingOwner = await tx.memberRole.count({
        where: { businessId: business.id, roleId: ownerRoleId },
      })
      if (existingOwner === 0) {
        const oldestActiveMember = await tx.businessMember.findFirst({
          where: { businessId: business.id, status: 'ACTIVE' },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true },
        })
        if (oldestActiveMember) {
          await tx.memberRole.create({
            data: { businessId: business.id, memberId: oldestActiveMember.id, roleId: ownerRoleId },
          })
        }
      }
    })
  }
}

const seedWarehouses = async (): Promise<void> => {
  const branches = await prisma.branch.findMany({
    select: { id: true, businessId: true, code: true, name: true },
  })

  for (const branch of branches) {
    const existing = await prisma.warehouse.findFirst({
      where: { businessId: branch.businessId, branchId: branch.id },
    })
    if (!existing) {
      await prisma.warehouse.create({
        data: {
          id: uuidv7(),
          businessId: branch.businessId,
          branchId: branch.id,
          code: `WH-${branch.code.toUpperCase()}`,
          name: `ສາງຫຼັກ (${branch.name})`,
          isDefault: true,
          status: 'ACTIVE',
        },
      })
    }
  }
}

const provisionSuperadmin = async (): Promise<void> => {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase()
  if (!email) {
    console.info('SUPERADMIN_EMAIL is not configured; superadmin provisioning skipped')
    return
  }

  const password = process.env.SUPERADMIN_PASSWORD
  const displayName = process.env.SUPERADMIN_DISPLAY_NAME?.trim() || 'Platform Superadmin'
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('SUPERADMIN_EMAIL must be a valid email')
  if (!password || password.length < 16) {
    throw new Error('SUPERADMIN_PASSWORD must contain at least 16 characters')
  }
  if (displayName.length < 2 || displayName.length > 120) {
    throw new Error('SUPERADMIN_DISPLAY_NAME must contain 2 to 120 characters')
  }

  const existing = await prisma.userIdentity.findUnique({
    where: { type_normalizedValue: { type: 'EMAIL', normalizedValue: email } },
    include: { user: { include: { credential: true } } },
  })
  const passwordHash = existing?.user.credential
    ? null
    : await hash(password, { type: argon2id, memoryCost: 65_536, timeCost: 3, parallelism: 1 })
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.user.update({
        where: { id: existing.userId },
        data: { displayName, status: UserStatus.ACTIVE, platformRole: PlatformRole.SUPERADMIN },
      })
      await tx.userIdentity.update({
        where: { id: existing.id },
        data: { verifiedAt: existing.verifiedAt ?? now },
      })
      if (!existing.user.credential && passwordHash) {
        await tx.passwordCredential.create({
          data: { userId: existing.userId, passwordHash, changedAt: now },
        })
      }
      if (existing.user.platformRole !== PlatformRole.SUPERADMIN) {
        await tx.auditLog.create({
          data: {
            id: uuidv7(),
            userId: existing.userId,
            action: 'platform.superadmin.provisioned',
            entityType: 'User',
            entityId: existing.userId,
            before: { platformRole: existing.user.platformRole },
            after: { platformRole: PlatformRole.SUPERADMIN },
          },
        })
      }
      return
    }

    const userId = uuidv7()
    if (!passwordHash) throw new Error('Password hash unavailable')
    await tx.user.create({
      data: {
        id: userId,
        displayName,
        locale: 'lo',
        status: UserStatus.ACTIVE,
        platformRole: PlatformRole.SUPERADMIN,
        identities: {
          create: {
            id: uuidv7(),
            type: 'EMAIL',
            normalizedValue: email,
            verifiedAt: now,
          },
        },
        credential: { create: { passwordHash, changedAt: now } },
      },
    })
    await tx.auditLog.create({
      data: {
        id: uuidv7(),
        userId,
        action: 'platform.superadmin.provisioned',
        entityType: 'User',
        entityId: userId,
        after: { platformRole: PlatformRole.SUPERADMIN },
      },
    })
  })

  console.info('Platform superadmin provisioning complete')
}

const seedCustomerGroups = async (): Promise<void> => {
  const businesses = await prisma.business.findMany({ select: { id: true } })
  for (const b of businesses) {
    const groups = [
      { code: 'STOREFRONT', name: 'ລາຄາໜ້າຮ້ານ (Storefront)', discountPercent: '0', isDefault: true, description: 'ລາຄາຂາຍມາດຕະຖານໜ້າຮ້ານ (Default Price)' },
      { code: 'FOODPANDA', name: 'Foodpanda', discountPercent: '0', isDefault: false, description: 'ລາຄາຂາຍຜ່ານແອັບ Foodpanda' },
      { code: 'VIP', name: 'ສະມາຊິກ VIP (5% Discount)', discountPercent: '5', isDefault: false, description: 'ກຸ່ມສະມາຊິກ VIP' },
      { code: 'WHOLESALE', name: 'ຕົວແທນຂາຍສົ່ງ (Wholesale)', discountPercent: '0', isDefault: false, description: 'ລາຄາຂາຍສົ່ງ' },
    ]
    for (const g of groups) {
      await prisma.customerGroup.upsert({
        where: { businessId_code: { businessId: b.id, code: g.code } },
        create: {
          id: uuidv7(),
          businessId: b.id,
          name: g.name,
          code: g.code,
          discountPercent: g.discountPercent,
          isDefault: g.isDefault,
          active: true,
        },
        update: {},
      })
    }
  }
}

async function main(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
  await seedAccessControl()
  await seedWarehouses()
  await seedCustomerGroups()
  await provisionSuperadmin()
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
