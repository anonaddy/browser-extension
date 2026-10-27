<template>
  <!-- Create Alias Tab -->
  <div
    class="flex justify-between bg-white p-3 text-sm tracking-wide text-grey-600 uppercase shadow-sm dark:bg-grey-700 dark:text-white"
  >
    Create A New Alias
    <button
      @click="selected = 'Aliases'"
      class="back-icon -m-3 flex items-center justify-center text-grey-600 hover:bg-grey-50 focus:outline-hidden dark:text-white dark:hover:bg-grey-800"
    >
      <chevron-left />
    </button>
  </div>
  <div class="p-3">
    <div
      v-if="existingAliasForSite && !newAlias"
      class="mb-4 rounded-xs border-t-4 border-indigo-600 bg-indigo-50 p-2 text-sm text-indigo-900 dark:bg-grey-800 dark:text-white"
    >
      <p v-if="existingAliasCount > 1" class="mb-1">
        {{
          existingAliasHasMore
            ? `At least ${existingAliasCount} aliases were found for this site.`
            : `${existingAliasCount} aliases were found for this site.`
        }}
        <button type="button" class="font-semibold underline" @click="showAliasesForSite">
          View search results
        </button>
      </p>
      <p v-else class="mb-1">An alias already exists for this site. Click to copy it.</p>
      <p v-if="existingAliasCount > 1" class="mb-1">Newest alias. Click to copy it.</p>
      <button
        type="button"
        class="w-full truncate text-left font-semibold"
        @click="copyToClipboard(existingAliasForSite)"
      >
        {{ existingAliasForSite }}
      </button>
      <!-- Getting spam from this site? Turn its alias off without leaving the tab. -->
      <div
        v-if="existingSiteAlias"
        class="mt-2 flex items-center justify-between gap-2 border-t border-indigo-200 pt-2 dark:border-grey-600"
      >
        <template v-if="existingSiteAlias.active !== false">
          <span>Getting unwanted emails from this site?</span>
          <button
            type="button"
            class="flex shrink-0 items-center rounded-xs border border-indigo-600 px-2 py-1 font-semibold hover:bg-indigo-100 disabled:cursor-not-allowed dark:border-indigo-400 dark:hover:bg-grey-700"
            :disabled="deactivateAliasLoading"
            @click="deactivateAlias(existingSiteAlias)"
          >
            Deactivate
            <loader-no-margin class="ml-2 h-4 w-4" v-if="deactivateAliasLoading" />
          </button>
        </template>
        <template v-else>
          <span>Deactivated. Emails sent to this alias will be discarded.</span>
          <button
            type="button"
            class="flex shrink-0 items-center font-semibold underline disabled:cursor-not-allowed"
            :disabled="activateAliasLoading"
            @click="activateAlias(existingSiteAlias)"
          >
            Undo
            <loader-no-margin class="ml-2 h-4 w-4" v-if="activateAliasLoading" />
          </button>
        </template>
      </div>
    </div>
    <div v-if="newAlias">
      <p for="alias_domain" class="mb-1 block text-grey-700 dark:text-white">
        {{ autoCopyNewAlias ? 'This is' : 'Click To Copy' }} Your New Alias:
      </p>
      <div
        @click="copyToClipboard(newAlias, setNewAliasCopied)"
        class="mb-4 flex cursor-pointer items-center justify-between rounded-xs border-t-4 border-green-600 bg-green-100 p-2 text-sm text-green-800"
        role="alert"
      >
        <span>
          {{ newAlias }}
        </span>
        <svg
          v-if="newAliasCopied"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          width="20"
          height="20"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </div>
      <p
        v-if="showRateExtensionLink"
        class="-mt-2 mb-4 text-center text-sm text-grey-600 dark:text-grey-200"
      >
        <a
          :href="extensionUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="text-indigo-700 underline hover:text-indigo-500 dark:text-indigo-200"
          >Rate the extension</a
        >
      </p>
    </div>

    <div class="flex items-center justify-between">
      <label for="alias_domain" class="mb-1 block text-grey-700 dark:text-grey-50">
        Alias Domain:
      </label>
      <LoaderNoMargin v-if="domainOptionsLoading" class="mr-3 h-4 w-4" />
      <span v-else title="Click to sync alias domains" class="mr-3">
        <Refresh
          @click="getAliasDomainOptions(apiToken, instance)"
          class="cursor-pointer text-indigo-700 hover:text-indigo-900 dark:text-white dark:hover:text-grey-100"
        />
      </span>
    </div>
    <div class="relative mb-4 block w-full">
      <select
        v-model="domain"
        id="alias_domain"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option v-for="domainOption in domainOptions" :key="domainOption" :value="domainOption">
          {{ domainOption }}
        </option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
    <div class="flex items-center justify-between">
      <label for="alias_format" class="mb-1 block text-grey-700 dark:text-grey-50">
        Alias Format:
      </label>
      <LoaderNoMargin v-if="domainOptionsLoading" class="mr-3 h-4 w-4" />
      <span v-else title="Click to sync available alias formats" class="mr-3">
        <Refresh
          @click="getAliasDomainOptions(apiToken, instance)"
          class="cursor-pointer text-indigo-700 hover:text-indigo-900 dark:text-white dark:hover:text-grey-100"
        />
      </span>
    </div>
    <div class="relative mb-4 block w-full">
      <select
        v-model="aliasFormat"
        id="alias_format"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white dark:placeholder-grey-100"
        required
      >
        <option
          v-for="formatOption in aliasFormatOptions"
          :key="formatOption.value"
          :value="formatOption.value"
          :disabled="
            (!subscribedOrSelfHosting && formatOption.paid) ||
            (formatOption.value === 'custom' && sharedDomainSelected && !subscribedOrSelfHosting)
          "
        >
          {{ formatOption.label }}
          {{ !subscribedOrSelfHosting && formatOption.paid ? '(Subscribe to unlock)' : ''
          }}{{
            formatOption.value === 'custom' && sharedDomainSelected && !subscribedOrSelfHosting
              ? '(Subscribe to unlock for shared domain aliases)'
              : ''
          }}{{
            formatOption.value === 'custom' && sharedDomainSelected && subscribedOrSelfHosting
              ? '(5 random characters will be added)'
              : ''
          }}
        </option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
    <div v-if="aliasFormat === 'custom'">
      <label for="alias_local_part" class="mb-1 block text-grey-700 dark:text-grey-50">
        Alias Local Part:
      </label>
      <input
        v-model="localPart"
        id="alias_local_part"
        type="text"
        placeholder="Enter local part"
        class="w-full appearance-none rounded-xs bg-white p-2 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
        :class="localPartSuggestionsForCreate.length ? '' : 'mb-4'"
      />
      <p
        v-if="localPartSuggestionsForCreate.length"
        class="mt-1 mb-3 text-sm text-grey-600 dark:text-grey-100"
      >
        Click to use:
        <span v-for="(suggestion, i) in localPartSuggestionsForCreate" :key="suggestion">
          <span
            class="cursor-pointer text-indigo-700 hover:text-indigo-900 dark:text-white dark:hover:text-grey-100"
            title="Click to use suggestion"
            @click="localPart = suggestion"
            >{{ suggestion }}</span
          >{{ i == localPartSuggestionsForCreate.length - 1 ? '' : ', ' }}
        </span>
      </p>
    </div>
    <label for="alias_description" class="mb-1 block text-grey-700 dark:text-grey-50">
      Description: (optional)
    </label>
    <input
      v-model="description"
      id="alias_description"
      type="text"
      :placeholder="currentTabHostname"
      autofocus="autofocus"
      class="w-full appearance-none rounded-xs bg-white p-2 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
    />
    <p class="mt-1 mb-3 text-xs text-grey-600 dark:text-grey-100">
      If left empty the description will default to the current tab's hostname.
    </p>

    <div class="flex items-center justify-between">
      <label for="alias_recipient_ids" class="mb-1 block text-grey-700 dark:text-grey-50">
        Recipients: (optional)
      </label>
      <LoaderNoMargin v-if="recipientsLoading" class="mr-3 h-4 w-4" />
      <span v-else title="Click to sync available recipients" class="mr-3">
        <Refresh
          @click="getRecipientsRequest()"
          class="cursor-pointer text-indigo-700 hover:text-indigo-900 dark:text-white dark:hover:text-grey-100"
        />
      </span>
    </div>
    <multiselect
      id="alias_recipient_ids"
      v-model="createAliasRecipientIds"
      mode="tags"
      value-prop="id"
      track-by="email"
      label="email"
      :options="Object.values(recipients)"
      :close-on-select="true"
      :clear-on-select="false"
      :searchable="true"
      :max="10"
      placeholder="Select recipient(s)"
    >
    </multiselect>

    <div class="mt-3 flex items-center justify-between">
      <label for="alias_label_ids" class="mb-1 block text-grey-700 dark:text-grey-50">
        Labels: (optional)
      </label>
      <LoaderNoMargin v-if="labelsLoading" class="mr-3 h-4 w-4" />
      <span v-else title="Click to sync available labels" class="mr-3">
        <Refresh
          @click="getLabelsRequest()"
          class="cursor-pointer text-indigo-700 hover:text-indigo-900 dark:text-white dark:hover:text-grey-100"
        />
      </span>
    </div>
    <multiselect
      id="alias_label_ids"
      class="min-w-0"
      v-model="createAliasLabelIds"
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

    <button
      @click="createAlias"
      class="mt-4 w-full rounded-xs border border-transparent bg-cyan-400 px-3 py-2 font-semibold text-cyan-900 hover:bg-cyan-300 focus:outline-hidden"
      :class="createAliasLoading ? 'cursor-not-allowed' : ''"
      :disabled="createAliasLoading"
    >
      Create Alias
      <loader class="h-5 w-5" v-if="createAliasLoading" />
    </button>
  </div>
</template>

<script>
// Create a new alias, or reuse one found for this site.
import sharedComponents from './shared.js'
import { useAddy } from '../store.js'

export default {
  name: 'CreateAliasTab',
  components: sharedComponents,
  setup() {
    return useAddy()
  },
}
</script>
