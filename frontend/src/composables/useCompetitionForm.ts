import { reactive, ref, shallowRef, readonly } from 'vue'
import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import {
  getAdminCompetition,
  createCompetition,
  updateCompetition,
  rotateCompetitionToken,
} from '@/api/admin'
import type { AdminCompetition, CreateCompetitionBody } from '@/api/admin'
import type { CompetitionEnvironment } from '@/api/public'
import { ApiError } from '@/api/client'
import uk from '@/i18n/uk'

/**
 * Shared form state for creating and editing competitions.
 *
 * @param id - `undefined` (or a getter that returns `undefined`) means create mode;
 *   a string ID means edit mode. Accepts any reactive form (`ref`, getter, or plain value).
 *
 * `load()` populates `form` from the server when an ID is present, or resets it for create.
 * `save()` calls create or update depending on whether `id` resolves to a value,
 *   and returns the new competition's ID on create or `undefined` on update.
 * `rotate()` replaces the sync token on the loaded competition; throws on failure.
 */
export function useCompetitionForm(id: MaybeRefOrGetter<string | undefined>) {
  const form = reactive<CreateCompetitionBody>({
    name: '',
    dateStart: '',
    dateEnd: '',
    location: '',
    environment: 'OUTDOOR' as CompetitionEnvironment,
  })

  const competition = ref<AdminCompetition | null>(null)
  const loading = shallowRef(false)
  const saving = shallowRef(false)
  const rotating = shallowRef(false)
  const error = shallowRef<string | null>(null)

  async function load() {
    const currentId = toValue(id)
    if (!currentId) {
      form.name = ''
      form.dateStart = ''
      form.dateEnd = ''
      form.location = ''
      form.environment = 'OUTDOOR'
      competition.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      const data = await getAdminCompetition(currentId)
      competition.value = data
      form.name = data.name
      form.dateStart = data.dateStart.slice(0, 10)
      form.dateEnd = data.dateEnd.slice(0, 10)
      form.location = data.location
      form.environment = data.environment
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : uk.ERROR_GENERIC
    } finally {
      loading.value = false
    }
  }

  // Returns the new competition id on create, or undefined on update.
  async function save(): Promise<string | undefined> {
    const currentId = toValue(id)
    saving.value = true
    error.value = null
    try {
      const body: CreateCompetitionBody = {
        name: form.name,
        dateStart: form.dateStart,
        dateEnd: form.dateEnd,
        location: form.location,
        environment: form.environment,
      }
      if (currentId) {
        const updated = await updateCompetition(currentId, body)
        competition.value = updated
        return undefined
      } else {
        const created = await createCompetition(body)
        competition.value = created
        return created.id
      }
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : uk.ERROR_GENERIC
      throw e
    } finally {
      saving.value = false
    }
  }

  async function rotate() {
    const currentId = toValue(id)
    if (!currentId || !competition.value) return
    rotating.value = true
    try {
      const { syncToken } = await rotateCompetitionToken(currentId)
      competition.value = { ...competition.value, syncToken }
    } catch (e) {
      throw e
    } finally {
      rotating.value = false
    }
  }

  return {
    form,
    competition: readonly(competition),
    loading: readonly(loading),
    saving: readonly(saving),
    rotating: readonly(rotating),
    error: readonly(error),
    load,
    save,
    rotate,
  }
}
