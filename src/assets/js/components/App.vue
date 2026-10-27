<template>
  <div :class="activeTheme">
    <login-view v-if="!apiToken" />

    <div class="logged-in" v-else>
      <app-header />

      <content class="bg-grey-50 dark:bg-grey-900 dark:text-white">
        <div
          v-if="error"
          ref="errorBanner"
          class="flex items-center justify-center border-t-4 border-yellow-600 bg-yellow-100 p-2 text-sm text-yellow-800"
          role="alert"
        >
          {{ error }}
        </div>
        <div v-if="selected == 'Aliases'">
          <aliases-tab />
        </div>
        <div v-else-if="selected == 'Settings'">
          <settings-tab />
        </div>
        <div v-else-if="selected == 'ViewAlias'">
          <view-alias-tab />
        </div>
        <div v-else-if="selected == 'SendFromAlias'">
          <send-from-alias-tab />
        </div>
        <div v-else>
          <create-alias-tab />
        </div>
      </content>

      <nav class="absolute bottom-0 -mb-px flex h-14 w-full bg-indigo-900" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          :title="tab.name"
          @click="selected = tab.name"
          :class="[
            selected == tab.name
              ? 'border-white text-white'
              : 'border-transparent text-indigo-100 hover:text-white',
            'group inline-flex w-1/2 items-center justify-center border-b-2 px-1 py-4 text-sm font-medium',
          ]"
          :aria-current="selected == tab.name ? 'page' : undefined"
        >
          <component
            :is="tab.icon"
            :class="[
              selected == tab.name ? 'text-white' : 'text-indigo-100 group-hover:text-white',
              'mr-2 -ml-0.5 h-5 w-5',
            ]"
            aria-hidden="true"
          />
          <span>{{ tab.name }}</span>
        </button>
      </nav>
    </div>

    <alias-modals />

    <Notifications position="bottom center" width="100%" />
  </div>
</template>

<script>
import { onMounted, ref, watch } from 'vue'
import { Notifications } from '@kyvg/vue3-notification'
import LoginView from './LoginView.vue'
import AppHeader from './AppHeader.vue'
import AliasesTab from './AliasesTab.vue'
import SettingsTab from './SettingsTab.vue'
import ViewAliasTab from './ViewAliasTab.vue'
import SendFromAliasTab from './SendFromAliasTab.vue'
import CreateAliasTab from './CreateAliasTab.vue'
import AliasModals from './AliasModals.vue'
import { useAddy } from '../store.js'

export default {
  name: 'App',
  components: {
    Notifications,
    LoginView,
    AppHeader,
    AliasesTab,
    SettingsTab,
    ViewAliasTab,
    SendFromAliasTab,
    CreateAliasTab,
    AliasModals,
  },
  setup() {
    const store = useAddy()
    onMounted(store.init)

    // The banner sits at the top of the scrolling content, so an error from an
    // action further down would otherwise appear off screen.
    const errorBanner = ref(null)
    watch(
      store.errorRevision,
      () => {
        if (!errorBanner.value) return
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        errorBanner.value.scrollIntoView({
          block: 'nearest',
          behavior: reduceMotion ? 'auto' : 'smooth',
        })
      },
      { flush: 'post' }
    )

    return { ...store, errorBanner }
  },
}
</script>

<style src="@vueform/multiselect/themes/default.css"></style>
