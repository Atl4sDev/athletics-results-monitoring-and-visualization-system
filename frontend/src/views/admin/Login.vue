<script setup lang="ts">
import { shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { loginAdmin } from '@/api/admin'
import { ApiError } from '@/api/client'
import AppButton from '@/components/common/AppButton.vue'
import uk from '@/i18n/uk'

const router = useRouter()
const authStore = useAuthStore()

if (authStore.isAuthenticated) {
  router.replace('/admin')
}

const email = shallowRef('')
const password = shallowRef('')
const loading = shallowRef(false)
const error = shallowRef<string | null>(null)

async function submit() {
  error.value = null
  loading.value = true
  try {
    const { token, expiresIn } = await loginAdmin(email.value, password.value)
    authStore.setAuth({ token, expiresIn })
    router.push('/admin')
  } catch (e) {
    if (e instanceof ApiError && e.code === 'TOO_MANY_REQUESTS') {
      error.value = uk.ERROR_RATE_LIMIT
    } else {
      error.value = uk.ERROR_GENERIC
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)]">
    <div class="w-full max-w-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8" style="box-shadow: var(--shadow-card)">
      <h1 class="mb-6 text-xl font-semibold text-[var(--color-text-primary)]">{{ uk.LOGIN }}</h1>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1">
          <label for="email" class="text-sm font-medium text-[var(--color-text-secondary)]">{{ uk.EMAIL }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="password" class="text-sm font-medium text-[var(--color-text-secondary)]">{{ uk.PASSWORD }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-page)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </div>
        <p v-if="error" class="text-sm text-[var(--color-error)]" role="alert">{{ error }}</p>
        <AppButton type="submit" :loading="loading" class="w-full justify-center">
          {{ uk.SIGN_IN }}
        </AppButton>
      </form>
    </div>
  </div>
</template>
