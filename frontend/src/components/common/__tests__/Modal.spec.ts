import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Modal from '../Modal.vue'

describe('Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls showModal when open changes to true', async () => {
    const wrapper = mount(Modal, {
      props: { open: false, title: 'Test' },
    })
    await wrapper.setProps({ open: true })
    await nextTick()
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  it('calls close when open changes to false', async () => {
    const wrapper = mount(Modal, {
      props: { open: true, title: 'Test' },
    })
    await nextTick()
    vi.clearAllMocks()
    await wrapper.setProps({ open: false })
    await nextTick()
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
  })

  it('emits close on native @cancel (Esc key)', async () => {
    const wrapper = mount(Modal, {
      props: { open: true, title: 'Test' },
    })
    await wrapper.find('dialog').trigger('cancel')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close when the × button is clicked', async () => {
    const wrapper = mount(Modal, {
      props: { open: true, title: 'Test' },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('renders default slot content', () => {
    const wrapper = mount(Modal, {
      props: { open: false, title: 'Test' },
      slots: { default: '<p class="body-text">body content</p>' },
    })
    expect(wrapper.find('.body-text').exists()).toBe(true)
  })

  it('renders footer slot when provided', () => {
    const wrapper = mount(Modal, {
      props: { open: false, title: 'Test' },
      slots: { footer: '<button class="footer-btn">OK</button>' },
    })
    expect(wrapper.find('.footer-btn').exists()).toBe(true)
  })

  it('does not render footer wrapper when footer slot is absent', () => {
    const wrapper = mount(Modal, {
      props: { open: false, title: 'Test' },
    })
    // No footer slot → the conditional footer div should not exist
    const footerDivs = wrapper.findAll('div').filter((d) =>
      d.classes().includes('border-t'),
    )
    expect(footerDivs.length).toBe(0)
  })
})
