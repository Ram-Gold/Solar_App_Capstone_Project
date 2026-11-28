import { describe, it, expect, vi, beforeEach } from 'vitest'

const { rpcMock, fromMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}))

vi.mock('../supabaseClient', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
  },
  createIsolatedAuthClient: vi.fn(),
}))

import { submitWarrantyClaim } from '../customerService'

describe('submitWarrantyClaim per-purchase enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws the RPC error immediately without falling back to direct insert when this purchase already has a claim', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        success: false,
        error: 'A warranty claim has already been filed for this purchased product.',
      },
      error: null,
    })

    await expect(
      submitWarrantyClaim({
        token: 'tok-1',
        purchaseId: 'pur-claimed',
        issueCategory: 'No Power',
        description: 'Unit does not turn on at dusk.',
      })
    ).rejects.toThrow('A warranty claim has already been filed for this purchased product.')

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('succeeds via RPC for a second unclaimed purchase even when the customer has a claim on another unit', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        success: true,
        claim_id: 'claim-unit-2',
      },
      error: null,
    })

    const res = await submitWarrantyClaim({
      token: 'tok-1',
      purchaseId: 'pur-unclaimed-2',
      issueCategory: 'Battery / Rapid Discharge',
      description: 'Shuts off after 2 hours.',
    })

    expect(res).toEqual({ success: true, claimId: 'claim-unit-2' })
    expect(rpcMock).toHaveBeenCalledWith('submit_warranty_claim', {
      p_token: 'tok-1',
      p_purchase_id: 'pur-unclaimed-2',
      p_category: 'Battery / Rapid Discharge',
      p_description: 'Shuts off after 2 hours.',
      p_media_urls: [],
    })
  })

  it('checks only the target purchase_id (not the whole account) during direct-insert fallback', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Could not find the function public.submit_warranty_claim in the schema cache' },
    })

    const eqSpy = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    const insertSingleSpy = vi.fn().mockResolvedValue({
      data: { id: 'fallback-claim-2' },
      error: null,
    })

    fromMock.mockImplementation((table) => {
      if (table === 'warranty_claims') {
        return {
          select: vi.fn().mockReturnValue({ eq: eqSpy }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single: insertSingleSpy }),
          }),
        }
      }
      throw new Error(`Unexpected table query during per-purchase fallback: ${table}`)
    })

    const res = await submitWarrantyClaim({
      token: 'tok-1',
      purchaseId: 'pur-unclaimed-2',
      issueCategory: 'No Power',
      description: 'Second unit failure.',
    })

    expect(res).toEqual({ success: true, claimId: 'fallback-claim-2' })
    expect(eqSpy).toHaveBeenCalledWith('purchase_id', 'pur-unclaimed-2')
  })

  it('rejects duplicate claims on the same purchase_id during direct-insert fallback', async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'function submit_warranty_claim does not exist' },
    })

    const insertSpy = vi.fn()
    fromMock.mockImplementation((table) => {
      if (table === 'warranty_claims') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'existing-claim' }], error: null }),
            }),
          }),
          insert: insertSpy,
        }
      }
      throw new Error(`Unexpected table query: ${table}`)
    })

    await expect(
      submitWarrantyClaim({
        token: 'tok-1',
        purchaseId: 'pur-claimed',
        issueCategory: 'No Power',
        description: 'Duplicate fallback attempt.',
      })
    ).rejects.toThrow('A warranty claim has already been filed for this purchased product.')

    expect(insertSpy).not.toHaveBeenCalled()
  })
})
