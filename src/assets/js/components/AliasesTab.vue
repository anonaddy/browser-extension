<template>
  <!-- Aliases Tab -->
  <div v-if="getAliasesLoading" class="aliases-loader flex items-center justify-center">
    <loader class="h-14 w-14 text-cyan-400" />
  </div>

  <div v-else>
    <div
      v-if="
        currentTabHostname && showSearchSuggestions && !localPartSuggestions.includes(searchInput)
      "
      class="border-b border-grey-200 bg-white px-3 py-2 text-sm tracking-wide text-grey-600 shadow-sm dark:border-grey-600 dark:bg-grey-700 dark:text-white"
    >
      Search
      <span
        v-if="
          localPartSuggestions[0] &&
          localPartSuggestions[0] !== currentTabHostname &&
          String(localPartSuggestions[0]).length >= 3
        "
        >"<span
          @click="((getAliasesLoading = true), (searchInput = localPartSuggestions[0]))"
          class="cursor-pointer text-indigo-700 hover:text-indigo-500 dark:text-white dark:hover:text-grey-50"
          >{{ localPartSuggestions[0] }}</span
        >" or</span
      >
      "<span
        @click="((getAliasesLoading = true), (searchInput = currentTabHostname))"
        class="cursor-pointer text-indigo-700 hover:text-indigo-500 dark:text-white dark:hover:text-grey-50"
        >{{ currentTabHostname }}</span
      >"?
    </div>

    <div
      class="flex items-center justify-between bg-white px-3 py-2 text-sm tracking-wide text-grey-600 uppercase shadow-sm dark:bg-grey-700 dark:text-white"
    >
      {{ aliasesTitle }}
      <div class="flex items-center">
        <label for="show_alias_status" class="mr-2 block text-grey-700 capitalize dark:text-white"
          >Show:</label
        >
        <div class="relative">
          <select
            v-model="showAliasStatus"
            id="show_alias_status"
            class="block appearance-none rounded-sm bg-white py-1 pr-8 pl-2 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
            required
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="not_deleted">Active and Inactive</option>
            <option value="pinned">Pinned</option>
            <option value="unpinned">Unpinned</option>
            <option value="deleted">Deleted</option>
          </select>
          <div
            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
          >
            <svg
              class="h-4 w-4 fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path
                d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div v-if="aliases.length > 0">
      <div
        class="divide-y divide-grey-200 border-b border-grey-200 dark:divide-grey-600 dark:border-grey-600"
      >
        <div
          v-for="alias in aliases"
          :key="alias.id"
          class="flex h-20 items-center hover:bg-indigo-50 dark:hover:bg-grey-800"
        >
          <div
            @click="viewAlias(alias)"
            class="flex h-full grow cursor-pointer items-center truncate py-1 pl-2"
            title="View Alias Details"
          >
            <div
              class="text-sm text-grey-500 dark:text-grey-50"
              :title="$filters.formatDate(alias.created_at)"
            >
              {{ $filters.timeAgo(alias.created_at) }}
            </div>
            <span
              :class="getAliasStatus(alias).backgroundColour"
              class="alias-status-background mx-1.5 flex items-center justify-center rounded-full outline-hidden"
              :title="getAliasStatus(alias).status"
              tabindex="-1"
            >
              <span
                :class="getAliasStatus(alias).foregroundColour"
                class="alias-status-foreground rounded-full"
              ></span>
            </span>

            <span class="block truncate">
              <div class="flex items-center truncate">
                <span title="Pinned">
                  <Pin
                    v-if="alias.pinned"
                    class="mr-1 fill-current text-yellow-500 dark:text-yellow-400"
                  />
                </span>
                <span class="font-semibold text-indigo-800 dark:text-indigo-100">{{
                  getAliasLocalPart(alias)
                }}</span
                ><span>@{{ alias.domain }}</span>
              </div>
              <div
                v-if="alias.description || (alias.labels || []).length"
                class="flex min-w-0 items-center gap-1.5 py-1"
              >
                <span
                  v-if="alias.description"
                  class="inline-block min-w-0 truncate text-sm text-grey-400 dark:text-grey-50"
                >
                  {{ alias.description }}
                </span>
                <template v-if="(alias.labels || []).length">
                  <span
                    class="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-grey-800 dark:text-grey-100"
                    :style="{ backgroundColor: alias.labels[0].colour + '33' }"
                    :title="alias.labels[0].name"
                  >
                    <span
                      class="h-1.5 w-1.5 shrink-0 rounded-full"
                      :style="{ backgroundColor: alias.labels[0].colour }"
                    />
                    {{ truncateLabelName(alias.labels[0].name) }}
                  </span>
                  <span
                    v-if="alias.labels.length > 1"
                    class="shrink-0 text-xs text-grey-500 dark:text-grey-300"
                    :title="getAdditionalAliasLabelNames(alias.labels)"
                  >
                    +{{ alias.labels.length - 1 }}
                  </span>
                </template>
              </div>
            </span>
          </div>

          <div class="flex h-full flex-none items-center py-1 pr-2">
            <div
              class="cursor-pointer text-grey-400 dark:text-grey-200"
              title="Copy Alias"
              @click="copyToClipboard(formatAliasEmail(alias))"
            >
              <clipboard />
            </div>
          </div>
        </div>
      </div>

      <div v-if="aliasesHaveNextPage" class="p-3">
        <button
          @click="showMoreAliases"
          class="flex w-full items-center justify-center rounded-md border border-grey-300 bg-white px-4 py-2 text-sm font-medium text-grey-700 shadow-xs hover:bg-grey-50 dark:border-grey-800 dark:bg-grey-600 dark:text-white dark:hover:bg-grey-500"
          :class="showMoreAliasesLoading ? 'cursor-not-allowed' : ''"
          :disabled="showMoreAliasesLoading"
        >
          Load more
          <loader class="h-5 w-5" v-if="showMoreAliasesLoading" />
        </button>
      </div>
    </div>

    <div v-else class="p-3 text-center text-lg">No Aliases Found!</div>
  </div>
</template>

<script>
// The alias list with status filter and pagination.
import sharedComponents from './shared.js'
import { useAddy } from '../store.js'

export default {
  name: 'AliasesTab',
  components: sharedComponents,
  setup() {
    return useAddy()
  },
}
</script>
