<script setup lang="ts">
import { reactive, shallowRef, computed, watch } from 'vue'
import { createDiscipline, updateDiscipline } from '@/api/admin'
import type { Discipline, CreateDisciplineBody } from '@/api/admin'
import type { DisciplineType } from '@/api/public'
import { ApiError } from '@/api/client'
import { useUiStore } from '@/stores/ui'
import Modal from '@/components/common/Modal.vue'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import AppButton from '@/components/common/AppButton.vue'
import uk from '@/i18n/uk'

const props = defineProps<{
  open: boolean
  discipline?: Discipline | null
}>()

const emit = defineEmits<{
  saved: [discipline: Discipline]
  close: []
}>()

const uiStore = useUiStore()

const isEdit = computed(() => !!props.discipline)
const title = computed(() => isEdit.value ? uk.DISC_EDIT_TITLE : uk.DISC_CREATE_TITLE)

const form = reactive<CreateDisciplineBody & { isStandard: boolean }>({
  code: '',
  name: '',
  type: 'TRACK' as DisciplineType,
  isStandard: false,
})

// Pre-fill form when discipline prop changes (edit mode)
watch(
  () => props.discipline,
  (d) => {
    if (d) {
      form.code = d.code
      form.name = d.name
      form.type = d.type
      form.isStandard = d.isStandard
    } else {
      form.code = ''
      form.name = ''
      form.type = 'TRACK'
      form.isStandard = false
    }
  },
  { immediate: true },
)

const saving = shallowRef(false)

async function handleSubmit() {
  saving.value = true
  try {
    const body: CreateDisciplineBody = {
      code: form.code,
      name: form.name,
      type: form.type,
      isStandard: form.isStandard,
    }
    let result: Discipline
    if (isEdit.value && props.discipline) {
      result = await updateDiscipline(props.discipline.id, body)
    } else {
      result = await createDiscipline(body)
    }
    emit('saved', result)
    emit('close')
  } catch (e) {
    uiStore.addToast(e instanceof ApiError ? e.message : uk.ERROR_GENERIC, 'error')
  } finally {
    saving.value = false
  }
}

const typeOptions = [
  { value: 'TRACK', label: uk.DISC_TYPE_TRACK },
  { value: 'FIELD', label: uk.DISC_TYPE_FIELD },
]
</script>

<template>
  <Modal :open="open" :title="title" @close="emit('close')">
    <form id="discipline-form" class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <FormField id="disc-code" v-model="form.code" :label="uk.DISC_CODE" required />
      <FormField id="disc-name" v-model="form.name" :label="uk.DISC_NAME" required />
      <SelectField
        id="disc-type"
        v-model="(form.type as string)"
        :label="uk.DISC_TYPE"
        :options="typeOptions"
        required
      />
      <label class="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
        <input v-model="form.isStandard" type="checkbox" class="h-4 w-4 accent-[var(--color-accent)]" />
        {{ uk.DISC_IS_STANDARD }}
      </label>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" type="button" @click="emit('close')">{{ uk.CANCEL }}</AppButton>
        <AppButton form="discipline-form" type="submit" :loading="saving">{{ uk.SAVE }}</AppButton>
      </div>
    </template>
  </Modal>
</template>
