<script setup lang="ts">
import { reactive, shallowRef, computed, watch } from 'vue'
import { createAthlete, updateAthlete, getAdminAthlete } from '@/api/admin'
import type { AdminAthlete, CreateAthleteBody } from '@/api/admin'
import type { Gender } from '@/api/public'
import { ApiError } from '@/api/client'
import { useUiStore } from '@/stores/ui'
import Modal from '@/components/common/Modal.vue'
import FormField from '@/components/common/FormField.vue'
import SelectField from '@/components/common/SelectField.vue'
import AppButton from '@/components/common/AppButton.vue'
import uk from '@/i18n/uk'

const props = defineProps<{
  open: boolean
  athlete?: AdminAthlete | null
}>()

const emit = defineEmits<{
  saved: [athlete: AdminAthlete]
  close: []
}>()

const uiStore = useUiStore()

const isEdit = computed(() => !!props.athlete)
const title = computed(() => isEdit.value ? uk.ATHLETE_EDIT_TITLE : uk.ATHLETE_CREATE_TITLE)

const form = reactive<{
  licenseNumber: string
  firstName: string
  lastName: string
  gender: string
  birthDate: string
}>({
  licenseNumber: '',
  firstName: '',
  lastName: '',
  gender: 'MALE',
  birthDate: '',
})

watch(
  () => props.athlete,
  async (a) => {
    if (a) {
      // Fetch detail to get latest birthDate
      try {
        const detail = await getAdminAthlete(a.id)
        form.licenseNumber = detail.licenseNumber
        form.firstName = detail.firstName
        form.lastName = detail.lastName
        form.gender = detail.gender
        // Slice to YYYY-MM-DD for <input type="date">
        form.birthDate = detail.birthDate ? detail.birthDate.slice(0, 10) : ''
      } catch {
        // fall back to prop data
        form.licenseNumber = a.licenseNumber
        form.firstName = a.firstName
        form.lastName = a.lastName
        form.gender = a.gender
        form.birthDate = a.birthDate ? a.birthDate.slice(0, 10) : ''
      }
    } else {
      form.licenseNumber = ''
      form.firstName = ''
      form.lastName = ''
      form.gender = 'MALE'
      form.birthDate = ''
    }
  },
  { immediate: true },
)

const saving = shallowRef(false)

async function handleSubmit() {
  saving.value = true
  try {
    let result: AdminAthlete
    if (isEdit.value && props.athlete) {
      const body = {
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender as Gender,
        birthDate: form.birthDate || null,
      }
      result = await updateAthlete(props.athlete.id, body)
    } else {
      const body: CreateAthleteBody = {
        licenseNumber: form.licenseNumber,
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender as Gender,
        birthDate: form.birthDate || null,
      }
      result = await createAthlete(body)
    }
    emit('saved', result)
    emit('close')
  } catch (e) {
    uiStore.addToast(e instanceof ApiError ? e.message : uk.ERROR_GENERIC, 'error')
  } finally {
    saving.value = false
  }
}

const genderOptions = [
  { value: 'MALE', label: uk.GENDER_MALE },
  { value: 'FEMALE', label: uk.GENDER_FEMALE },
]
</script>

<template>
  <Modal :open="open" :title="title" @close="emit('close')">
    <form id="athlete-form" class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <FormField
        id="athlete-license"
        v-model="form.licenseNumber"
        :label="uk.ATHLETE_LICENSE"
        :readonly="isEdit"
        required
      />
      <FormField id="athlete-first-name" v-model="form.firstName" :label="uk.ATHLETE_FIRST_NAME" required />
      <FormField id="athlete-last-name" v-model="form.lastName" :label="uk.ATHLETE_LAST_NAME" required />
      <SelectField
        id="athlete-gender"
        v-model="form.gender"
        :label="uk.ATHLETE_GENDER"
        :options="genderOptions"
        required
      />
      <FormField
        id="athlete-birth-date"
        v-model="form.birthDate"
        :label="uk.ATHLETE_BIRTH_DATE"
        type="date"
      />
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" type="button" @click="emit('close')">{{ uk.CANCEL }}</AppButton>
        <AppButton form="athlete-form" type="submit" :loading="saving">{{ uk.SAVE }}</AppButton>
      </div>
    </template>
  </Modal>
</template>
