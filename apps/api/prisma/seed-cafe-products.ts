import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'
import { v7 as uuidv7 } from 'uuid'

const prisma = new PrismaClient()

const sampleProducts = [
  // Drinks
  {
    name: 'ເອັດເປຣສໂຊ່ນ້ຳເຢັນ',
    category: 'ເຄື່ອງດື່ມ',
    price: 18000,
    cost: 8000,
    sku: 'DRK-ESP-01',
    isRecommended: true,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ອາເມຣິກາໂນ້',
    category: 'ເຄື່ອງດື່ມ',
    price: 15000,
    cost: 6000,
    sku: 'DRK-AME-02',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ລາເຕ້ເຢັນ',
    category: 'ເຄື່ອງດື່ມ',
    price: 20000,
    cost: 9000,
    sku: 'DRK-LAT-03',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ຄາປູຊິໂນ້',
    category: 'ເຄື່ອງດື່ມ',
    price: 18000,
    cost: 8000,
    sku: 'DRK-CAP-04',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ມັດຊະລາເຕ້',
    category: 'ເຄື່ອງດື່ມ',
    price: 22000,
    cost: 10000,
    sku: 'DRK-MAT-05',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ຊາມະນາວ',
    category: 'ເຄື່ອງດື່ມ',
    price: 18000,
    cost: 6000,
    sku: 'DRK-LEM-06',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ຊາໄຂ່ມຸກ',
    category: 'ເຄື່ອງດື່ມ',
    price: 20000,
    cost: 8000,
    sku: 'DRK-BOB-07',
    isRecommended: true,
    image: 'https://images.unsplash.com/photo-1558857563-b37cb3372c05?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ສະປັ້ນສະຕໍເບີຣີ່',
    category: 'ເຄື່ອງດື່ມ',
    price: 25000,
    cost: 11000,
    sku: 'DRK-STR-08',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ຊັອກໂກແລັດເຢັນ',
    category: 'ເຄື່ອງດື່ມ',
    price: 22000,
    cost: 9000,
    sku: 'DRK-CHO-09',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ນົມສົດ',
    category: 'ເຄື່ອງດື່ມ',
    price: 16000,
    cost: 6000,
    sku: 'DRK-MLK-10',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80',
  },
  // Food
  {
    name: 'ເຂົ້າຜັດໄທ',
    category: 'ອາຫານ',
    price: 35000,
    cost: 15000,
    sku: 'FOD-PAD-11',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ສະເຕັກໄກ່',
    category: 'ອາຫານ',
    price: 45000,
    cost: 20000,
    sku: 'FOD-CHK-12',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ພິຊຊ່າ',
    category: 'ອາຫານ',
    price: 58000,
    cost: 25000,
    sku: 'FOD-PIZ-13',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ເບີເກີ',
    category: 'ອາຫານ',
    price: 38000,
    cost: 16000,
    sku: 'FOD-BGR-14',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ສະລັດຜັກ',
    category: 'ອາຫານ',
    price: 32000,
    cost: 12000,
    sku: 'FOD-SLD-15',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80',
  },
  // Desserts
  {
    name: 'ເຄັກຊັອກໂກແລັດ',
    category: 'ຂອງຫວານ',
    price: 28000,
    cost: 12000,
    sku: 'DES-CKC-16',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ເຄັກຊີສ',
    category: 'ຂອງຫວານ',
    price: 28000,
    cost: 13000,
    sku: 'DES-CHE-17',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ວັອຟເຟິ່ນ',
    category: 'ຂອງຫວານ',
    price: 25000,
    cost: 9000,
    sku: 'DES-WAF-18',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ຄຸກກີ້',
    category: 'ຂອງຫວານ',
    price: 18000,
    cost: 6000,
    sku: 'DES-COO-19',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'ມັຟຟິນ',
    category: 'ຂອງຫວານ',
    price: 20000,
    cost: 7000,
    sku: 'DES-MUF-20',
    isRecommended: false,
    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&auto=format&fit=crop&q=80',
  },
]

async function seed() {
  const businesses = await prisma.business.findMany()
  if (businesses.length === 0) {
    console.log('No businesses found')
    return
  }

  for (const b of businesses) {
    console.log(`Seeding cafe products for business: ${b.name} (${b.id})`)

    // Ensure a default Unit (ຈອກ / ແກ້ວ / ອັນ)
    let unit = await prisma.unit.findFirst({
      where: { businessId: b.id, code: 'ITEM' },
    })
    if (!unit) {
      unit = await prisma.unit.create({
        data: {
          id: uuidv7(),
          businessId: b.id,
          code: 'ITEM',
          name: 'ອັນ (Item)',
          active: true,
        },
      })
    }

    // Ensure default warehouse
    const warehouse = await prisma.warehouse.findFirst({
      where: { businessId: b.id, status: 'ACTIVE' },
    })

    // Create Categories
    const categoryNames = ['ເຄື່ອງດື່ມ', 'ອາຫານ', 'ຂອງຫວານ', 'ເຄື່ອງໃຊ້']
    const catMap = new Map<string, string>()

    for (const cName of categoryNames) {
      let cat = await prisma.category.findFirst({
        where: { businessId: b.id, name: cName },
      })
      if (!cat) {
        cat = await prisma.category.create({
          data: {
            id: uuidv7(),
            businessId: b.id,
            name: cName,
          },
        })
      }
      catMap.set(cName, cat.id)
    }

    // Insert or update products
    for (const item of sampleProducts) {
      const catId = catMap.get(item.category)
      let product = await prisma.product.findFirst({
        where: { businessId: b.id, name: item.name },
      })

      if (!product) {
        const prodId = uuidv7()
        const varId = uuidv7()

        product = await prisma.product.create({
          data: {
            id: prodId,
            businessId: b.id,
            name: item.name,
            categoryId: catId || null,
            unitId: unit.id,
            trackStock: true,
            active: true,
            variants: {
              create: {
                id: varId,
                name: 'ປົກກະຕິ',
                sku: item.sku,
                cost: new Prisma.Decimal(item.cost),
                sellingPrice: new Prisma.Decimal(item.price),
                minStock: new Prisma.Decimal(10),
                isDefault: true,
                active: true,
                barcodes: {
                  create: {
                    id: uuidv7(),
                    barcode: item.sku,
                  },
                },
              },
            },
          },
        })

        // Opening stock so the cashier can sell: only for a new balance, always with its movement (Rule 8)
        if (warehouse) {
          const existingBalance = await prisma.stockBalance.findUnique({
            where: { warehouseId_variantId: { warehouseId: warehouse.id, variantId: varId } },
          })
          if (!existingBalance) {
            const openingQuantity = new Prisma.Decimal(100)
            await prisma.$transaction([
              prisma.stockBalance.create({
                data: { id: uuidv7(), businessId: b.id, warehouseId: warehouse.id, variantId: varId, quantity: openingQuantity, version: 1 },
              }),
              prisma.stockMovement.create({
                data: {
                  id: uuidv7(),
                  businessId: b.id,
                  warehouseId: warehouse.id,
                  variantId: varId,
                  type: 'ADJUSTMENT',
                  quantityDelta: openingQuantity,
                  referenceType: 'SEED_OPENING_STOCK',
                  notes: 'Opening stock (seed)',
                },
              }),
            ])
          }
        }
      }
    }
  }

  console.log('Seeding finished successfully!')
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
