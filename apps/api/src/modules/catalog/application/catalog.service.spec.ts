import type { IdService } from '../../../core/ids/id.service'
import type { CatalogRepository } from '../infrastructure/catalog.repository'
import { CatalogService } from './catalog.service'

describe('CatalogService', () => {
  it('normalizes product values and never adds a client-supplied tenant identifier', () => {
    const createProduct = vi.fn()
    const repository = { createProduct } as unknown as CatalogRepository
    const ids = { generate: vi.fn(() => '01900000-0000-7000-8000-000000000001') } as unknown as IdService
    const service = new CatalogService(repository, ids)

    void service.createProduct('01900000-0000-7000-8000-000000000004', {
      name: '  Coffee  ', unitId: '01900000-0000-7000-8000-000000000005', sku: ' cf-1 ', barcodes: [' 899001 ', '899002 '],
      cost: '1000.0000', sellingPrice: '1500.0000', minStock: '1.000000', trackStock: true, active: true,
    })

    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Coffee',
      variants: [
        expect.objectContaining({
          sku: 'CF-1',
          barcodes: [
            expect.objectContaining({ barcode: '899001' }),
            expect.objectContaining({ barcode: '899002' }),
          ],
        }),
      ],
    }))
    expect(createProduct.mock.calls[0]?.[0]).not.toHaveProperty('businessId')
  })

  it('supports multi-variants with sizes and colors and packaging units', () => {
    const createProduct = vi.fn()
    const repository = { createProduct } as unknown as CatalogRepository
    const ids = { generate: vi.fn(() => '01900000-0000-7000-8000-000000000001') } as unknown as IdService
    const service = new CatalogService(repository, ids)

    void service.createProduct('01900000-0000-7000-8000-000000000004', {
      name: 'T-Shirt',
      unitId: '01900000-0000-7000-8000-000000000005',
      trackStock: true,
      active: true,
      variants: [
        {
          name: 'Size M / Red',
          size: 'M',
          color: 'Red',
          sku: 'ts-red-m',
          cost: '50000.0000',
          sellingPrice: '85000.0000',
          minStock: '5.000000',
          barcodes: ['123456'],
          isDefault: true,
          active: true,
        },
        {
          name: 'Size L / Blue',
          size: 'L',
          color: 'Blue',
          sku: 'ts-blue-l',
          cost: '50000.0000',
          sellingPrice: '85000.0000',
          minStock: '5.000000',
          barcodes: ['123457'],
          isDefault: false,
          active: true,
        },
      ],
      packagingUnits: [
        {
          unitId: '01900000-0000-7000-8000-000000000006',
          conversionRate: '12.000000',
          sellingPrice: '900000.0000',
          barcode: '999888',
        },
      ],
    })

    const calledArg = createProduct.mock.calls[0]?.[0] as {
      name: string
      variants: Array<{ size: string; color: string; sku: string; isDefault: boolean }>
      packagingUnits: Array<{ conversionRate: string; sellingPrice: string }>
    }
    expect(calledArg.name).toBe('T-Shirt')
    expect(calledArg.variants).toHaveLength(2)
    expect(calledArg.variants[0]?.size).toBe('M')
    expect(calledArg.variants[0]?.sku).toBe('TS-RED-M')
    expect(calledArg.variants[1]?.size).toBe('L')
    expect(calledArg.variants[1]?.sku).toBe('TS-BLUE-L')
    expect(calledArg.packagingUnits[0]?.conversionRate).toBe('12.000000')
  })
})
