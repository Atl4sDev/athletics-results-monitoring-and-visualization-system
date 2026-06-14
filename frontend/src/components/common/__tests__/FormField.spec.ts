import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormField from '../FormField.vue'

describe('FormField', () => {
  it('renders a label with the correct text', () => {
    const wrapper = mount(FormField, {
      props: { id: 'name', label: 'Full name', modelValue: '' },
    })
    expect(wrapper.find('label').text()).toBe('Full name')
    expect(wrapper.find('label').attributes('for')).toBe('name')
  })

  it('emits update:modelValue when the user types', async () => {
    const wrapper = mount(FormField, {
      props: { id: 'name', label: 'Full name', modelValue: '' },
    })
    await wrapper.find('input').setValue('Alice')
    const emissions = wrapper.emitted('update:modelValue') as string[][]
    expect(emissions).toBeTruthy()
    expect(emissions[emissions.length - 1][0]).toBe('Alice')
  })

  it('renders with the bound value', () => {
    const wrapper = mount(FormField, {
      props: { id: 'name', label: 'Full name', modelValue: 'Bob' },
    })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Bob')
  })

  it('adds cursor-default class and readonly attribute when readonly=true', () => {
    const wrapper = mount(FormField, {
      props: { id: 'license', label: 'License', modelValue: 'UA123', readonly: true },
    })
    const input = wrapper.find('input')
    expect(input.attributes('readonly')).toBeDefined()
    expect(input.classes()).toContain('cursor-default')
  })

  it('passes type to the input element', () => {
    const wrapper = mount(FormField, {
      props: { id: 'dob', label: 'Birth date', modelValue: '', type: 'date' },
    })
    expect(wrapper.find('input').attributes('type')).toBe('date')
  })
})
