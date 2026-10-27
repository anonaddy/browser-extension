<template>
  <!-- Settings Tab -->
  <div
    class="flex justify-between bg-white p-3 text-sm tracking-wide text-grey-600 uppercase shadow-sm dark:bg-grey-700 dark:text-white"
  >
    <div class="flex">
      Settings (<a
        :href="`${instance}`"
        target="_blank"
        rel="noopener noreferrer nofollow"
        class="flex cursor-pointer text-indigo-700 hover:text-indigo-500 dark:text-white dark:hover:text-grey-50"
        >Visit Dashboard <external-link class="ml-1 h-4 w-4" /></a
      >)
    </div>
    <button
      @click="selected = 'Aliases'"
      class="back-icon -m-3 flex items-center justify-center text-grey-600 hover:bg-grey-50 focus:outline-hidden dark:text-white dark:hover:bg-grey-800"
    >
      <chevron-left />
    </button>
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <label for="select_theme" class="mb-1 block text-grey-700 dark:text-white"
      >Extension Theme:</label
    >
    <div class="relative">
      <select
        v-model="theme"
        id="select_theme"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <div class="flex space-x-4">
      <div class="w-full">
        <label for="default_sort" class="mb-1 block text-grey-700 dark:text-white"
          >Default Alias Sort By:</label
        >
        <div class="relative">
          <select
            v-model="defaultAliasSort"
            id="default_sort"
            class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
            required
          >
            <option
              v-for="sortOption in aliasSortOptions"
              :key="sortOption.value"
              :value="sortOption.value"
            >
              {{ sortOption.label }}
            </option>
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
      <div class="w-full">
        <label for="default_sort_dir" class="mb-1 block text-grey-700 dark:text-white"
          >Direction:</label
        >
        <div class="relative">
          <select
            v-model="defaultAliasSortDir"
            id="default_sort_dir"
            class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
            required
          >
            <option value="-">Descending</option>
            <option value="">Ascending</option>
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
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <label for="select_default_tab" class="mb-1 block text-grey-700 dark:text-white"
      >Tab To Show On Open:</label
    >
    <div class="relative">
      <select
        v-model="defaultSelected"
        id="select_default_tab"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option value="Aliases">View Aliases</option>
        <option value="CreateAlias">Create New Alias</option>
        <option value="Settings">Settings</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <label for="select_auto_copy_new_alias" class="mb-1 block text-grey-700 dark:text-white"
      >Automatically Copy New Aliases to Clipboard:</label
    >
    <div class="relative">
      <select
        v-model="autoCopyNewAlias"
        id="select_auto_copy_new_alias"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option :value="true">Enabled</option>
        <option :value="false">Disabled</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <label for="select_show_search_suggestions" class="mb-1 block text-grey-700 dark:text-white"
      >Show Search Suggestions:</label
    >
    <div class="relative">
      <select
        v-model="showSearchSuggestions"
        id="select_show_search_suggestions"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option :value="true">Enabled</option>
        <option :value="false">Disabled</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <label for="select_show_icon_in_email_fields" class="mb-1 block text-grey-700 dark:text-white"
      >Show addy.io icon in email fields:</label
    >
    <div class="relative">
      <select
        v-model="showIconInEmailFields"
        id="select_show_icon_in_email_fields"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option :value="true">Enabled</option>
        <option :value="false">Disabled</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  </div>

  <div v-if="showIconInEmailFields" class="w-full border-b border-grey-200 p-3 text-left">
    <label for="select_email_field_icon_position" class="mb-1 block text-grey-700 dark:text-white"
      >Email field icon position:</label
    >
    <div class="relative">
      <select
        v-model="emailFieldIconPosition"
        id="select_email_field_icon_position"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option value="inside">Inside the field</option>
        <option value="outside">To the right of the field</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
    <p class="mt-1 text-xs text-grey-500 dark:text-grey-300">
      Use the right-hand position if a password manager covers the icon.
    </p>
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <label for="select_show_context_menu_option" class="mb-1 block text-grey-700 dark:text-white"
      >Show right-click addy.io alias option:</label
    >
    <div class="relative">
      <select
        v-model="showContextMenuOption"
        id="select_show_context_menu_option"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option :value="true">Enabled</option>
        <option :value="false">Disabled</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <label for="select_reuse_existing_alias" class="mb-1 block text-grey-700 dark:text-white"
      >Use an existing alias for this site when one is found:</label
    >
    <div class="relative">
      <select
        v-model="reuseExistingAlias"
        id="select_reuse_existing_alias"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option :value="true">Enabled</option>
        <option :value="false">Disabled</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
    <p class="mt-1 text-xs text-grey-500 dark:text-grey-300">
      When disabled, the field icon, right-click action, and shortcut always create a new alias.
    </p>
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <label
      for="select_show_alias_created_notification"
      class="mb-1 block text-grey-700 dark:text-white"
      >Show a notification after creating and copying an alias:</label
    >
    <div class="relative">
      <select
        v-model="showAliasCreatedNotification"
        id="select_show_alias_created_notification"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option :value="true">Enabled</option>
        <option :value="false">Disabled</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
    <p class="mt-1 text-xs text-grey-500 dark:text-grey-300">
      Applies to the right-click option and the keyboard shortcut. Errors are still shown.
    </p>
  </div>

  <div class="w-full border-b border-grey-200 p-3 text-left">
    <label for="select_auto_fill_local_part" class="mb-1 block text-grey-700 dark:text-white"
      >Automatically Fill New Alias Local Parts When Using The Custom Alias Format:</label
    >
    <div class="relative">
      <select
        v-model="autoFillLocalPart"
        id="select_auto_fill_local_part"
        class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
        required
      >
        <option value="">Disabled</option>
        <option value="sld">Domain with no extension (example)</option>
        <option value="domain">Domain (example.com)</option>
        <option value="full">Full domain (app.example.com)</option>
        <option value="random">Domain with random extension (example.5ra)</option>
      </select>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
      >
        <svg class="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
    </div>
  </div>

  <button
    @click="getAliasDomainOptions(apiToken, instance)"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
    :class="domainOptionsLoading ? 'cursor-not-allowed' : ''"
    :disabled="domainOptionsLoading"
  >
    Sync Alias Domains and Account Settings
    <loader class="h-5 w-5" v-if="domainOptionsLoading" />
  </button>
  <button
    @click="getRecipientsRequest()"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
    :class="recipientsLoading ? 'cursor-not-allowed' : ''"
    :disabled="recipientsLoading"
  >
    Sync Recipients List
    <loader class="h-5 w-5" v-if="recipientsLoading" />
  </button>
  <button
    @click="getLabelsRequest()"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
    :class="labelsLoading ? 'cursor-not-allowed' : ''"
    :disabled="labelsLoading"
  >
    Sync Labels List
    <loader class="h-5 w-5" v-if="labelsLoading" />
  </button>
  <a
    :href="`${extensionUrl}`"
    target="_blank"
    rel="noopener noreferrer nofollow"
    class="flex w-full items-center justify-between border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
  >
    <span class="flex items-center"
      >Rate the Extension<heart class="ml-1 h-5 w-5 text-cyan-500"
    /></span>
    <external-link class="h-5 w-5" />
  </a>
  <button
    @click="renewApiKeyModalOpen = true"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
  >
    Renew API Key
  </button>
  <button
    @click="logoutModalOpen = true"
    class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
  >
    Logout
  </button>
  <details
    class="w-full border-b border-grey-200 p-3 text-left text-sm text-grey-600 dark:text-grey-100"
  >
    <summary class="cursor-pointer font-medium text-grey-700 dark:text-white">
      Keyboard shortcuts info
    </summary>
    <p class="mt-2">You can customise extension shortcuts in your browser settings:</p>
    <ul class="mt-1 list-inside list-disc space-y-1">
      <li>Firefox: <code>about:addons</code> > gear icon > Manage Extension Shortcuts</li>
      <li>
        Brave/Chrome: <code>brave://extensions/shortcuts</code> or
        <code>chrome://extensions/shortcuts</code>
      </li>
    </ul>
    <p class="mt-2">
      Available shortcuts include creating/copying an alias and, on Firefox builds, opening the
      extension or toggling the sidebar.
    </p>
  </details>
  <div
    v-if="extensionVersion"
    class="w-full border-grey-200 p-3 text-center text-grey-600 dark:text-grey-100"
  >
    <a
      href="https://github.com/anonaddy/browser-extension/releases"
      target="_blank"
      rel="nofollow noreferrer noopener"
      class="hover:text-indigo-600 hover:underline dark:hover:text-grey-50"
      >v{{ extensionVersion }}</a
    >
  </div>
</template>

<script>
// Extension and account settings.
import sharedComponents from './shared.js'
import { useAddy } from '../store.js'

export default {
  name: 'SettingsTab',
  components: sharedComponents,
  setup() {
    return useAddy()
  },
}
</script>
