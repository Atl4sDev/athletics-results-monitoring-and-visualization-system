import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SyncTokenPanel from '../SyncTokenPanel.vue'

describe('SyncTokenPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('displays the token text', () => {
    const token = 'secret-token-abc-123'
    const wrapper = mount(SyncTokenPanel, {
      props: { token, rotating: false },
    })
    expect(wrapper.find('code').text()).toBe(token)
  })

  it('calls navigator.clipboard.writeText with the token when copy is clicked', async () => {
    const token = 'copy-me-token'
    const wrapper = mount(SyncTokenPanel, {
      props: { token, rotating: false },
    })
    // Click the copy button (first AppButton)
    const buttons = wrapper.findAll('button')
    const copyButton = buttons.find((b) => b.text().includes('Скопіювати'))
    expect(copyButton).toBeDefined()
    await copyButton!.trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(token)
  })

  it('emits rotate when the rotate button is clicked', async () => {
    const wrapper = mount(SyncTokenPanel, {
      props: { token: 'some-token', rotating: false },
    })
    const buttons = wrapper.findAll('button')
    const rotateButton = buttons.find((b) => b.text().includes('Перевипустити'))
    expect(rotateButton).toBeDefined()
    await rotateButton!.trigger('click')
    expect(wrapper.emitted('rotate')).toBeTruthy()
  })

  it('shows loading state on the rotate button when rotating=true', () => {
    const wrapper = mount(SyncTokenPanel, {
      props: { token: 'some-token', rotating: true },
    })
    // When rotating, the button should be disabled (loading state)
    const buttons = wrapper.findAll('button')
    const rotateButton = buttons.find((b) => b.text().includes('Перевипустити') || b.attributes('disabled') !== undefined)
    expect(rotateButton?.attributes('disabled')).toBeDefined()
  })
})
