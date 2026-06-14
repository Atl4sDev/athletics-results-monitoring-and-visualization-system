import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SelectField from '../SelectField.vue'

const options = [
  { value: 'OUTDOOR', label: 'Стадіон' },
  { value: 'INDOOR', label: 'Манеж' },
]

describe('SelectField', () => {
  it('renders a label with correct text and for attribute', () => {
    const wrapper = mount(SelectField, {
      props: { id: 'env', label: 'Тип', options, modelValue: 'OUTDOOR' },
    })
    expect(wrapper.find('label').text()).toBe('Тип')
    expect(wrapper.find('label').attributes('for')).toBe('env')
  })

  it('renders all option elements', () => {
    const wrapper = mount(SelectField, {
      props: { id: 'env', label: 'Тип', options, modelValue: 'OUTDOOR' },
    })
    const opts = wrapper.findAll('option')
    expect(opts).toHaveLength(2)
    expect(opts[0].text()).toBe('Стадіон')
    expect(opts[1].text()).toBe('Манеж')
  })

  it('emits update:modelValue with correct value when selection changes', async () => {
    const wrapper = mount(SelectField, {
      props: { id: 'env', label: 'Тип', options, modelValue: 'OUTDOOR' },
    })
    await wrapper.find('select').setValue('INDOOR')
    const emissions = wrapper.emitted('update:modelValue') as string[][]
    expect(emissions).toBeTruthy()
    expect(emissions[emissions.length - 1][0]).toBe('INDOOR')
  })

  it('reflects the bound modelValue as the selected option', () => {
    const wrapper = mount(SelectField, {
      props: { id: 'env', label: 'Тип', options, modelValue: 'INDOOR' },
    })
    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('INDOOR')
  })
})
