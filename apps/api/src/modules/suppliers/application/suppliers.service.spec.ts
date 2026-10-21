import { describe, expect, it, vi } from 'vitest'
import { SuppliersService } from './suppliers.service'
import type { SuppliersRepository } from '../infrastructure/suppliers.repository'
import type { IdService } from '../../../core/ids/id.service'

describe('SuppliersService', () => {
  const repository = {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  } as unknown as SuppliersRepository

  const ids = {
    generate: vi.fn().mockReturnValue('uuid-v7-mock'),
  } as unknown as IdService

  const service = new SuppliersService(repository, ids)

  it('delegates listing suppliers to repository', async () => {
    vi.mocked(repository.list).mockResolvedValue({ total: 1, limit: 50, offset: 0, items: [] })
    const result = await service.list({ limit: 50, offset: 0 })
    expect(repository.list).toHaveBeenCalledWith({ limit: 50, offset: 0 })
    expect(result.total).toBe(1)
  })

  it('creates a supplier with generated UUIDs', async () => {
    vi.mocked(repository.create).mockResolvedValue({ id: 'uuid-v7-mock' } as never)
    const result = await service.create('actor-1', {
      code: 'SUP-001',
      name: 'ABC Supplier',
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'uuid-v7-mock',
        auditId: 'uuid-v7-mock',
        actorUserId: 'actor-1',
        code: 'SUP-001',
        name: 'ABC Supplier',
      }),
    )
    expect(result.id).toBe('uuid-v7-mock')
  })
})
