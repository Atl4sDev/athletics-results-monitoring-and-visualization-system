import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import AthleteMergeModal from '../AthleteMergeModal.vue'

// Mock API module
vi.mock('@/api/admin', () => ({
  mergeAthletes: vi.fn().mockResolvedValue({ id: 'target-id', resultCount: 5 }),
  getAdminAthlete: vi.fn().mockImplementation((id: string) =>
    Promise.resolve({
      id,
      licenseNumber: `LIC-${id}`,
      firstName: 'Test',
      lastName: 'Athlete',
      gender: 'MALE',
      birthDate: null,
      resultCount: id === 'target-id' ? 10 : 3,
    }),
  ),
  getAdminAthletes: vi.fn().mockResolvedValue({
    items: [],
    nextCursor: null,
    hasMore: false,
  }),
}))

// Import after mock so the mock is applied
import { mergeAthletes } from '@/api/admin'

describe('AthleteMergeModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('merge button is disabled when no athletes are selected', () => {
    const wrapper = mount(AthleteMergeModal, {
      props: { open: true },
    })
    const mergeBtn = wrapper.findAll('button').find((b) => b.text() === "Об'єднати")
    expect(mergeBtn?.attributes('disabled')).toBeDefined()
  })

  it('calls mergeAthletes(targetId, sourceId) — target first, source second', async () => {
    const wrapper = mount(AthleteMergeModal, {
      props: { open: true },
    })
    await flushPromises()

    // Directly set the internal state by triggering selectSource and selectTarget
    const vm = wrapper.vm as any

    // Simulate selecting source and target via internal methods
    await vm.selectSource({ id: 'source-id', licenseNumber: 'LIC-S', firstName: 'Source', lastName: 'Athlete', gender: 'MALE', birthDate: null })
    await vm.selectTarget({ id: 'target-id', licenseNumber: 'LIC-T', firstName: 'Target', lastName: 'Athlete', gender: 'MALE', birthDate: null })
    await flushPromises()

    // Now the merge button should be enabled
    const mergeBtn = wrapper.findAll('button').find((b) => b.text() === "Об'єднати")
    expect(mergeBtn?.attributes('disabled')).toBeUndefined()

    // Click merge → opens ConfirmDialog
    await mergeBtn!.trigger('click')
    await nextTick()

    // Find and click the confirm button in the ConfirmDialog
    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Підтвердити')
    expect(confirmBtn).toBeDefined()
    await confirmBtn!.trigger('click')
    await flushPromises()

    // Assert: mergeAthletes called with (targetId, sourceId) — target is the keeper
    expect(mergeAthletes).toHaveBeenCalledWith('target-id', 'source-id')
  })

  it('disables merge when source and target are the same athlete', async () => {
    const wrapper = mount(AthleteMergeModal, {
      props: { open: true },
    })
    const vm = wrapper.vm as any

    // Select the same athlete as both source and target
    await vm.selectSource({ id: 'same-id', licenseNumber: 'LIC-X', firstName: 'Same', lastName: 'Person', gender: 'MALE', birthDate: null })
    await vm.selectTarget({ id: 'same-id', licenseNumber: 'LIC-X', firstName: 'Same', lastName: 'Person', gender: 'MALE', birthDate: null })
    await flushPromises()

    const mergeBtn = wrapper.findAll('button').find((b) => b.text() === "Об'єднати")
    expect(mergeBtn?.attributes('disabled')).toBeDefined()
  })
})
