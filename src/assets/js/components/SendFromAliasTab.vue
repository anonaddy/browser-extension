<template>
  <!-- Send From Alias Tab -->
  <div
    class="flex justify-between bg-white p-3 text-sm tracking-wide text-grey-600 uppercase shadow-sm dark:bg-grey-700 dark:text-white"
  >
    Send From Alias
    <button
      @click="selected = 'ViewAlias'"
      class="back-icon -m-3 flex items-center justify-center text-grey-600 hover:bg-grey-50 focus:outline-hidden dark:text-white dark:hover:bg-grey-800"
    >
      <chevron-left />
    </button>
  </div>

  <div class="p-3">
    <p class="mb-2 text-grey-700 dark:text-white">
      Use this to automatically create the correct address to send an email to in order to send an
      email from this alias.
    </p>

    <div
      class="mb-4 flex items-center justify-center rounded-xs border-t-4 border-indigo-600 bg-indigo-50 p-2 text-sm text-indigo-800"
      role="alert"
    >
      <information class="mr-2 flex-none text-indigo-800" />
      You must send the email from a verified recipient on your addy.io account.
    </div>

    <label for="send_from_alias" class="mb-1 block text-grey-700 dark:text-grey-50">
      Alias to send from:
    </label>
    <input
      v-model="aliasToView.email"
      id="send_from_alias"
      type="text"
      class="mb-4 w-full appearance-none rounded-xs bg-white p-2 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
      disabled
    />
    <label for="send_from_alias_destination" class="mb-1 block text-grey-700 dark:text-grey-50">
      Email destination:
    </label>
    <input
      v-model="sendFromAliasDestination"
      @keyup.enter="displaySendFromAddress"
      id="send_from_alias_destination"
      type="text"
      class="mb-4 w-full appearance-none rounded-xs bg-white p-2 text-grey-700 shadow-sm focus:ring-3 disabled:cursor-not-allowed dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
      :placeholder="!subscribedOrSelfHosting ? 'Subscribe to unlock' : 'Enter destination email'"
      :disabled="!subscribedOrSelfHosting"
    />

    <div v-if="sendFromAliasEmailToSendTo">
      <p class="mb-1 text-grey-700 dark:text-white">Send your message to this email:</p>
      <div
        @click="copyToClipboard(sendFromAliasEmailToSendTo, setSendFromAddressCopied)"
        class="mb-4 flex cursor-pointer items-center justify-between rounded-xs border-t-4 border-green-600 bg-green-100 p-2 text-sm text-green-800"
        role="alert"
        title="Click To Copy"
      >
        <span>
          {{ sendFromAliasEmailToSendTo }}
        </span>
        <svg
          v-if="sendFromAddressCopied"
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
      <a
        :href="'mailto:' + sendFromAliasEmailToSendTo"
        class="mb-4 flex cursor-pointer items-center justify-between rounded-xs border-t-4 border-green-600 bg-green-100 p-2 text-sm text-green-800"
        role="alert"
        title="Click To Open Mail Application"
      >
        Click to open mail application
      </a>
    </div>
    <button
      v-if="subscribedOrSelfHosting"
      @click="displaySendFromAddress"
      class="w-full rounded-xs border border-transparent bg-cyan-400 px-3 py-2 font-semibold text-cyan-900 hover:bg-cyan-300 focus:outline-hidden"
    >
      Show Address
    </button>
    <button
      v-else
      class="w-full rounded-xs border border-transparent bg-grey-400 px-3 py-2 font-semibold text-grey-900 hover:bg-grey-300 focus:outline-hidden disabled:cursor-not-allowed"
      disabled
    >
      Subscribe to unlock
    </button>
  </div>
</template>

<script>
// Build the address that sends an email from an alias.
import sharedComponents from './shared.js'
import { useAddy } from '../store.js'

export default {
  name: 'SendFromAliasTab',
  components: sharedComponents,
  setup() {
    return useAddy()
  },
}
</script>
