<template>
  <!-- View Alias Tab -->
  <div
    class="flex justify-between bg-white p-3 text-sm tracking-wide text-grey-600 uppercase shadow-sm dark:bg-grey-700 dark:text-white"
  >
    Alias Details
    <button
      @click="selected = 'Aliases'"
      class="back-icon -m-3 flex items-center justify-center text-grey-600 hover:bg-grey-50 focus:outline-hidden dark:text-white dark:hover:bg-grey-800"
    >
      <chevron-left />
    </button>
  </div>
  <div class="p-3">
    <div class="mb-4 flex min-w-0 items-center">
      <span
        :class="getAliasStatus(aliasToView).backgroundColour"
        class="alias-status-background mx-1.5 flex items-center justify-center rounded-full outline-hidden"
        :title="getAliasStatus(aliasToView).status"
        tabindex="-1"
      >
        <span
          :class="getAliasStatus(aliasToView).foregroundColour"
          class="alias-status-foreground rounded-full"
        ></span>
      </span>

      <span class="block w-full min-w-0 break-words break-all">
        <div class="inline-flex items-center">
          <span title="Pinned">
            <Pin
              v-if="aliasToView.pinned"
              class="mr-1 inline-block fill-current text-yellow-500 dark:text-yellow-400"
            />
          </span>
          <div
            class="cursor-pointer break-words"
            title="Click To Copy Alias"
            @click="copyToClipboard(formatAliasEmail(aliasToView))"
          >
            <span class="font-semibold text-indigo-800 dark:text-indigo-100">{{
              getAliasLocalPart(aliasToView)
            }}</span
            ><span>@{{ aliasToView.domain }}</span>
          </div>
        </div>

        <div v-if="aliasToViewDescriptionEditing" class="flex items-center">
          <input
            @keyup.enter="editAliasDescription(aliasToView)"
            @keyup.esc="cancelEditDescription"
            v-model="aliasDescriptionToEdit"
            type="text"
            id="description-input"
            class="grow appearance-none rounded-xs border bg-white px-2 py-1 text-sm text-grey-700 shadow-sm focus:outline-hidden dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
            :class="aliasDescriptionToEdit.length > 200 ? 'border-red-500' : 'border-transparent'"
            placeholder="Add description"
            tabindex="0"
            autofocus
          />
          <cross
            class="inline-block h-6 w-6 flex-none cursor-pointer text-red-300"
            @click="cancelEditDescription"
          />
          <check
            class="inline-block h-6 w-6 flex-none cursor-pointer text-cyan-500"
            @click="editAliasDescription(aliasToView)"
          />
        </div>
        <div v-else-if="aliasToView.description" class="flex items-center">
          <span
            class="inline-block cursor-pointer border border-transparent py-1 text-sm break-words break-all text-grey-400 dark:text-grey-50"
            title="Click To Copy Description"
            @click="copyToClipboard(aliasToView.description)"
          >
            {{ aliasToView.description }}
          </span>
          <edit
            class="ml-2 inline-block h-6 w-6 flex-none cursor-pointer text-grey-300 dark:text-grey-200"
            @click="
              ((aliasToViewDescriptionEditing = true),
              (aliasDescriptionToEdit = aliasToView.description))
            "
          />
        </div>
        <div v-else>
          <span
            class="inline-block cursor-pointer border border-transparent py-1 text-sm text-grey-300 dark:text-grey-200"
            @click="((aliasToViewDescriptionEditing = true), (aliasDescriptionToEdit = ''))"
            >Add description</span
          >
        </div>

        <div class="mt-2">
          <div v-if="aliasToViewLabelsEditing" class="flex min-w-0 items-center gap-2">
            <multiselect
              id="alias_label_ids_edit"
              class="min-w-0 grow"
              v-model="aliasLabelIdsToEdit"
              mode="tags"
              value-prop="id"
              track-by="name"
              label="name"
              :options="Object.values(labels)"
              :close-on-select="true"
              :clear-on-select="false"
              :searchable="true"
              :max="10"
              placeholder="Select label(s)"
            >
            </multiselect>
            <cross
              class="inline-block h-6 w-6 shrink-0 cursor-pointer text-red-300"
              @click="cancelEditLabels"
            />
            <check
              class="inline-block h-6 w-6 shrink-0 cursor-pointer text-cyan-500"
              :class="editAliasLabelsLoading ? 'cursor-not-allowed opacity-50' : ''"
              @click="!editAliasLabelsLoading && editAliasLabels(aliasToView)"
            />
          </div>

          <div v-else class="flex items-start gap-2">
            <div
              v-if="(aliasToView.labels || []).length"
              class="flex min-w-0 flex-1 flex-wrap gap-1.5"
            >
              <span
                v-for="label in aliasToView.labels"
                :key="label.id"
                class="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs text-grey-800 dark:text-grey-100"
                :style="{ backgroundColor: label.colour + '33' }"
                :title="label.name"
              >
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  :style="{ backgroundColor: label.colour }"
                />
                <span class="truncate">{{ truncateLabelName(label.name) }}</span>
              </span>
            </div>
            <p v-else class="text-sm text-grey-400 dark:text-grey-300">No labels</p>
            <edit
              class="inline-block h-6 w-6 shrink-0 cursor-pointer text-grey-300 dark:text-grey-200"
              @click="startEditAliasLabels()"
            />
          </div>
        </div>
      </span>
    </div>
    <dl class="grid grid-cols-2 gap-3">
      <div class="relative overflow-hidden rounded-lg bg-white p-3 shadow-sm dark:bg-grey-700">
        <dt>
          <div class="absolute rounded-md bg-indigo-500 p-3">
            <forward class="text-white" />
          </div>
          <p class="ml-16 text-sm font-medium text-grey-500 dark:text-grey-50">Forwarded</p>
        </dt>
        <dd class="ml-16 flex items-baseline">
          <p class="text-2xl font-semibold text-grey-900 dark:text-white">
            {{ aliasToView.emails_forwarded.toLocaleString() }}
          </p>
        </dd>
        <dd v-if="aliasToView.last_forwarded">
          <p
            class="text-sm leading-none text-grey-500 dark:text-grey-50"
            :title="$filters.formatDateTime(aliasToView.last_forwarded)"
          >
            {{ $filters.timeAgoHuman(aliasToView.last_forwarded) }}
          </p>
        </dd>
      </div>
      <div class="relative overflow-hidden rounded-lg bg-white p-3 shadow-sm dark:bg-grey-700">
        <dt>
          <div class="absolute rounded-md bg-indigo-500 p-3">
            <reply class="text-white" />
          </div>
          <p class="ml-16 text-sm font-medium text-grey-500 dark:text-grey-50">Replies</p>
        </dt>
        <dd class="ml-16 flex items-baseline">
          <p class="text-2xl font-semibold text-grey-900 dark:text-white">
            {{ aliasToView.emails_replied.toLocaleString() }}
          </p>
        </dd>
        <dd v-if="aliasToView.last_replied">
          <p
            class="text-sm leading-none text-grey-500 dark:text-grey-50"
            :title="$filters.formatDateTime(aliasToView.last_replied)"
          >
            {{ $filters.timeAgoHuman(aliasToView.last_replied) }}
          </p>
        </dd>
      </div>
      <div class="relative overflow-hidden rounded-lg bg-white p-3 shadow-sm dark:bg-grey-700">
        <dt>
          <div class="absolute rounded-md bg-indigo-500 p-3">
            <sent class="text-white" />
          </div>
          <p class="ml-16 text-sm font-medium text-grey-500 dark:text-grey-50">Sent</p>
        </dt>
        <dd class="ml-16 flex items-baseline">
          <p class="text-2xl font-semibold text-grey-900 dark:text-white">
            {{ aliasToView.emails_sent.toLocaleString() }}
          </p>
        </dd>
        <dd v-if="aliasToView.last_sent">
          <p
            class="text-sm leading-none text-grey-500 dark:text-grey-50"
            :title="$filters.formatDateTime(aliasToView.last_sent)"
          >
            {{ $filters.timeAgoHuman(aliasToView.last_sent) }}
          </p>
        </dd>
      </div>
      <div class="relative overflow-hidden rounded-lg bg-white p-3 shadow-sm dark:bg-grey-700">
        <dt>
          <div class="absolute rounded-md bg-indigo-500 p-3">
            <block class="text-white" />
          </div>
          <p class="ml-16 text-sm font-medium text-grey-500 dark:text-grey-50">Blocked</p>
        </dt>
        <dd class="ml-16 flex items-baseline">
          <p class="text-2xl font-semibold text-grey-900 dark:text-white">
            {{ aliasToView.emails_blocked.toLocaleString() }}
          </p>
        </dd>
        <dd v-if="aliasToView.last_blocked">
          <p
            class="text-sm leading-none text-grey-500 dark:text-grey-50"
            :title="$filters.formatDateTime(aliasToView.last_blocked)"
          >
            {{ $filters.timeAgoHuman(aliasToView.last_blocked) }}
          </p>
        </dd>
      </div>
    </dl>
  </div>
  <div
    class="bg-white p-3 text-sm tracking-wide text-grey-600 uppercase shadow-sm dark:bg-grey-700 dark:text-white"
  >
    Actions
  </div>
  <button
    @click="openSendFromAlias"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
  >
    Send from this alias
  </button>
  <div v-if="!aliasToView.deleted_at">
    <button
      v-if="aliasToView.active"
      @click="deactivateAlias(aliasToView)"
      class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
      :class="deactivateAliasLoading ? 'cursor-not-allowed' : ''"
      :disabled="deactivateAliasLoading"
    >
      Deactivate this alias
      <loader class="h-5 w-5" v-if="deactivateAliasLoading" />
    </button>
    <button
      v-else
      @click="activateAlias(aliasToView)"
      class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
      :class="activateAliasLoading ? 'cursor-not-allowed' : ''"
      :disabled="activateAliasLoading"
    >
      Activate this alias
      <loader class="h-5 w-5" v-if="activateAliasLoading" />
    </button>
  </div>
  <button
    v-if="aliasToView.pinned"
    @click="unpinAlias(aliasToView)"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
    :class="unpinAliasLoading ? 'cursor-not-allowed' : ''"
    :disabled="unpinAliasLoading"
  >
    Unpin this alias
    <loader class="h-5 w-5" v-if="unpinAliasLoading" />
  </button>
  <button
    v-else
    @click="pinAlias(aliasToView)"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
    :class="pinAliasLoading ? 'cursor-not-allowed' : ''"
    :disabled="pinAliasLoading"
  >
    Pin this alias
    <loader class="h-5 w-5" v-if="pinAliasLoading" />
  </button>
  <button
    v-if="aliasToView.deleted_at"
    @click="restoreAliasModalOpen = true"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
  >
    Restore this alias
  </button>
  <button
    v-else
    @click="deleteAliasModalOpen = true"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
  >
    Delete this alias
  </button>
  <button
    @click="forgetAliasModalOpen = true"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
  >
    Forget this alias
  </button>
</template>

<script>
// Details and actions for one alias.
import sharedComponents from './shared.js'
import { useAddy } from '../store.js'

export default {
  name: 'ViewAliasTab',
  components: sharedComponents,
  setup() {
    return useAddy()
  },
}
</script>
