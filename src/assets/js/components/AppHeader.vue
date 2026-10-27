<template>
  <header class="flex h-12 items-center justify-between bg-indigo-900">
    <button
      v-if="extensionWindow"
      @click="popout"
      class="flex h-12 w-20 items-center justify-center px-4 text-white hover:bg-indigo-800 focus:outline-hidden"
      title="Pop out to a new window"
    >
      <external-link class="h-6 w-6" style="transform: scaleX(-1)" />
    </button>
    <div :class="extensionWindow ? 'w-full' : 'w-full pl-2'">
      <div class="relative">
        <input
          v-model="searchInput"
          id="search"
          type="text"
          placeholder="Search aliases"
          class="w-full appearance-none rounded-xs bg-white px-8 py-1 text-base text-grey-700 shadow-sm focus:outline-hidden dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="absolute inset-y-0 left-0 ml-2 flex h-full w-5 items-center text-grey-300 dark:text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <cross
          v-if="searchInput"
          @click="((getAliasesLoading = true), (searchInput = ''))"
          class="absolute inset-y-0 right-0 mr-2 flex h-full w-5 cursor-pointer items-center text-grey-300 dark:text-white"
        />
      </div>
    </div>
    <button
      @click="selected = 'CreateAlias'"
      class="flex h-12 w-20 items-center justify-center px-4 text-white hover:bg-indigo-800 focus:outline-hidden"
      title="Create Alias"
    >
      <plus />
    </button>
  </header>
</template>

<script>
// Pop-out button, alias search and the create-alias button.
import sharedComponents from './shared.js'
import { useAddy } from '../store.js'

export default {
  name: 'AppHeader',
  components: sharedComponents,
  setup() {
    return useAddy()
  },
}
</script>
