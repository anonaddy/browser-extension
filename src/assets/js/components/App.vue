<template>
  <div :class="activeTheme">
    <div v-if="!apiToken" class="login bg-indigo-900 p-3">
      <header
        class="mb-4 flex items-center justify-between border-b border-indigo-700 bg-indigo-900 pb-3"
      >
        <a href="https://app.addy.io" target="_blank" rel="nofollow noreferrer noopener">
          <img class="h-6" src="img/logo.png" alt="addy.io Logo" />
        </a>
        <span class="self-center text-sm text-grey-50">Anonymous Email Forwarding</span>
      </header>
      <div
        v-if="error"
        class="mb-4 flex items-center justify-center rounded-xs border-t-4 border-yellow-600 bg-yellow-100 p-2 text-sm text-yellow-800"
        role="alert"
      >
        {{ error }}
      </div>
      <div v-if="changeInstance">
        <label for="instance" class="mb-1 block text-base text-indigo-100">
          addy.io Instance: (only change this is you are self-hosting addy.io)</label
        >
        <input
          v-model="instanceInput"
          id="instance"
          type="text"
          required="required"
          class="mb-4 w-full appearance-none rounded-xs bg-white p-2 text-base text-grey-700 shadow-sm focus:ring-3"
        />
      </div>
      <label for="api_token" class="mb-1 block text-base text-indigo-100">
        API key (from the addy.io
        <a
          href="https://app.addy.io/settings/api"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="cursor-pointer text-white hover:text-indigo-50"
          >settings</a
        >
        page):
      </label>
      <textarea
        v-model="tokenInput"
        id="api_token"
        placeholder="Enter your API key"
        rows="2"
        required="required"
        autofocus="autofocus"
        class="mb-4 w-full appearance-none rounded-xs bg-white p-2 text-base text-grey-700 shadow-sm focus:ring-3"
      >
      </textarea>
      <button
        @click="getAliasDomainOptions(tokenInput, instanceInput)"
        class="w-full rounded-xs border border-transparent bg-cyan-400 px-3 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-300 focus:outline-hidden"
        :class="domainOptionsLoading ? 'cursor-not-allowed' : ''"
        :disabled="domainOptionsLoading"
      >
        Sign In
        <loader class="h-5 w-5" v-if="domainOptionsLoading" />
      </button>
      <div class="mt-3 flex justify-between text-base">
        <p class="text-indigo-100">
          Don't have an account?
          <a
            href="https://app.addy.io/register"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="cursor-pointer text-white hover:text-indigo-50"
          >
            Register
          </a>
        </p>
        <span
          v-if="!changeInstance"
          @click="changeInstance = true"
          class="block cursor-pointer text-white hover:text-indigo-50"
        >
          Change Instance
        </span>
        <span
          v-else
          @click="cancelChangeInstance"
          class="block cursor-pointer text-white hover:text-indigo-50"
        >
          Cancel
        </span>
      </div>
    </div>

    <div class="logged-in" v-else>
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

      <content class="bg-grey-50 dark:bg-grey-900 dark:text-white">
        <div
          v-if="error"
          class="flex items-center justify-center border-t-4 border-yellow-600 bg-yellow-100 p-2 text-sm text-yellow-800"
          role="alert"
        >
          {{ error }}
        </div>
        <div v-if="selected == 'Aliases'">
          <!-- Aliases Tab -->
          <div v-if="getAliasesLoading" class="aliases-loader flex items-center justify-center">
            <loader class="h-14 w-14 text-cyan-400" />
          </div>

          <div v-else>
            <div
              v-if="
                currentTabHostname &&
                showSearchSuggestions &&
                !localPartSuggestions.includes(searchInput)
              "
              class="border-b border-grey-200 bg-white px-3 py-2 text-sm tracking-wide text-grey-600 shadow-sm dark:border-grey-600 dark:bg-grey-700 dark:text-white"
            >
              Search
              <span v-if="localPartSuggestions[0] && localPartSuggestions[0] !== currentTabHostname"
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
                <label
                  for="show_alias_status"
                  class="mr-2 block text-grey-700 capitalize dark:text-white"
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
                    <option value="not_deleted">Not Deleted</option>
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
                      <div class="truncate">
                        <span class="font-semibold text-indigo-800 dark:text-indigo-100">{{
                          getAliasLocalPart(alias)
                        }}</span
                        ><span>@{{ alias.domain }}</span>
                      </div>
                      <div v-if="alias.description" class="flex items-center">
                        <span
                          class="inline-block truncate border border-transparent py-1 text-sm text-grey-400 dark:text-grey-50"
                        >
                          {{ alias.description }}
                        </span>
                      </div>
                    </span>
                  </div>

                  <div class="flex h-full flex-none items-center py-1 pr-2">
                    <div
                      class="cursor-pointer text-grey-400 dark:text-grey-200"
                      title="Copy Alias"
                      @click="copyToClipboard(getAliasEmail(alias))"
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
        </div>
        <div v-else-if="selected == 'Settings'">
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

          <div class="w-full border-b border-grey-200 p-3 text-left">
            <label
              for="select_show_search_suggestions"
              class="mb-1 block text-grey-700 dark:text-white"
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

          <div class="w-full border-b border-grey-200 p-3 text-left">
            <label
              for="select_auto_fill_local_part"
              class="mb-1 block text-grey-700 dark:text-white"
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

          <button
            @click="getAliasDomainOptions(apiToken, instance)"
            class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
            :class="domainOptionsLoading ? 'cursor-not-allowed' : ''"
            :disabled="domainOptionsLoading"
          >
            Refresh Domains and Defaults
            <loader class="h-5 w-5" v-if="domainOptionsLoading" />
          </button>
          <button
            @click="getRecipientsRequest()"
            class="w-full border-b border-grey-200 p-3 text-left hover:bg-indigo-50 focus:outline-hidden dark:hover:bg-grey-800"
            :class="recipientsLoading ? 'cursor-not-allowed' : ''"
            :disabled="recipientsLoading"
          >
            Refresh Recipients
            <loader class="h-5 w-5" v-if="recipientsLoading" />
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
          <div
            v-if="extensionVersion"
            class="w-full border-grey-200 p-3 text-center text-grey-600 dark:text-grey-100"
          >
            v{{ extensionVersion }}
          </div>
        </div>
        <div v-else-if="selected == 'ViewAlias'">
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
            <div class="mb-4 flex items-center">
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

              <span class="block w-full break-words">
                <div
                  class="cursor-pointer break-words"
                  title="Click To Copy Alias"
                  @click="copyToClipboard(getAliasEmail(aliasToView))"
                >
                  <span class="font-semibold text-indigo-800 dark:text-indigo-100">{{
                    getAliasLocalPart(aliasToView)
                  }}</span
                  ><span>@{{ aliasToView.domain }}</span>
                </div>

                <div v-if="aliasToViewDescriptionEditing" class="flex items-center">
                  <input
                    @keyup.enter="editAliasDescription(aliasToView)"
                    @keyup.esc="cancelEditDescription"
                    v-model="aliasDescriptionToEdit"
                    type="text"
                    id="description-input"
                    class="grow appearance-none rounded-xs border bg-white px-2 py-1 text-sm text-grey-700 shadow-sm focus:outline-hidden dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
                    :class="
                      aliasDescriptionToEdit.length > 200 ? 'border-red-500' : 'border-transparent'
                    "
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
                    class="inline-block cursor-pointer border border-transparent py-1 text-sm break-words text-grey-400 dark:text-grey-50"
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
              </span>
            </div>
            <dl class="grid grid-cols-2 gap-3">
              <div
                class="relative overflow-hidden rounded-lg bg-white p-3 shadow-sm dark:bg-grey-700"
              >
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
              <div
                class="relative overflow-hidden rounded-lg bg-white p-3 shadow-sm dark:bg-grey-700"
              >
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
              <div
                class="relative overflow-hidden rounded-lg bg-white p-3 shadow-sm dark:bg-grey-700"
              >
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
              <div
                class="relative overflow-hidden rounded-lg bg-white p-3 shadow-sm dark:bg-grey-700"
              >
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
        </div>
        <div v-else-if="selected == 'SendFromAlias'">
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
              Use this to automatically create the correct address to send an email to in order to
              send an email from this alias.
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
            <label
              for="send_from_alias_destination"
              class="mb-1 block text-grey-700 dark:text-grey-50"
            >
              Email destination:
            </label>
            <input
              v-model="sendFromAliasDestination"
              @keyup.enter="displaySendFromAddress"
              id="send_from_alias_destination"
              type="text"
              class="mb-4 w-full appearance-none rounded-xs bg-white p-2 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
              placeholder="Enter destination email"
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
              @click="displaySendFromAddress"
              class="w-full rounded-xs border border-transparent bg-cyan-400 px-3 py-2 font-semibold text-cyan-900 hover:bg-cyan-300 focus:outline-hidden"
            >
              Show Address
            </button>
          </div>
        </div>
        <div v-else>
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
            </div>

            <label for="alias_domain" class="mb-1 block text-grey-700 dark:text-grey-50">
              Alias Domain:
            </label>
            <div class="relative mb-4 block w-full">
              <select
                v-model="domain"
                id="alias_domain"
                class="block w-full appearance-none rounded-sm bg-white p-2 pr-8 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white"
                required
              >
                <option
                  v-for="domainOption in domainOptions"
                  :key="domainOption"
                  :value="domainOption"
                >
                  {{ domainOption }}
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
            <label for="alias_format" class="mb-1 block text-grey-700 dark:text-grey-50">
              Alias Format:
            </label>
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
                    (formatOption.value === 'custom' && sharedDomainSelected)
                  "
                >
                  {{ formatOption.label }}
                  {{ !subscribedOrSelfHosting && formatOption.paid ? '(Subscribe To Unlock)' : ''
                  }}{{
                    formatOption.value === 'custom' && sharedDomainSelected
                      ? '(Not available for shared domains)'
                      : ''
                  }}
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
            <div v-if="!sharedDomainSelected && aliasFormat === 'custom'">
              <label for="alias_local_part" class="mb-1 block text-grey-700 dark:text-grey-50">
                Alias Local Part:
              </label>
              <input
                v-model="localPart"
                id="alias_local_part"
                type="text"
                placeholder="Enter local part"
                class="w-full appearance-none rounded-xs bg-white p-2 text-grey-700 shadow-sm focus:ring-3 dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
                :class="localPartSuggestions.length ? '' : 'mb-4'"
              />
              <p
                v-if="localPartSuggestions.length"
                class="mt-1 mb-3 text-sm text-grey-600 dark:text-grey-100"
              >
                Click to use:
                <span v-for="(suggestion, i) in localPartSuggestions" :key="suggestion">
                  <span
                    class="cursor-pointer text-indigo-700 hover:text-indigo-900 dark:text-white dark:hover:text-grey-100"
                    title="Click to use suggestion"
                    @click="localPart = suggestion"
                    >{{ suggestion }}</span
                  >{{ i == localPartSuggestions.length - 1 ? '' : ', ' }}
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

            <label for="alias_recipient_ids" class="mb-1 block text-grey-700 dark:text-grey-50">
              Recipients: (optional)
            </label>
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

    <Modal :open="restoreAliasModalOpen" @close="restoreAliasModalOpen = false" class="px-3">
      <div class="w-full rounded-md bg-white p-4 shadow-2xl dark:bg-grey-800">
        <div>
          <div
            class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-50"
          >
            <information class="text-cyan-600" />
          </div>
          <div class="mt-3 text-center">
            <h3
              class="text-lg leading-6 font-medium text-grey-900 dark:text-white"
              id="modal-title"
            >
              Restore alias
            </h3>
            <div class="mt-2">
              <p class="text-sm text-grey-500 dark:text-white">
                Are you sure you want to restore this alias? Once restored it will be
                <b>able to receive emails again</b>.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-5">
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md border border-transparent bg-cyan-400 px-4 py-2 text-base font-medium text-cyan-900 shadow-xs hover:bg-cyan-300 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-hidden"
            @click="restoreAlias(aliasToView)"
            :class="restoreAliasLoading ? 'cursor-not-allowed' : ''"
            :disabled="restoreAliasLoading"
          >
            Restore
            <loader class="h-5 w-5" v-if="restoreAliasLoading" />
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md border border-grey-300 bg-white px-4 py-2 text-base font-medium text-grey-700 shadow-xs hover:bg-grey-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:border-grey-600 dark:bg-grey-500 dark:text-white"
            @click="restoreAliasModalOpen = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>

    <Modal :open="deleteAliasModalOpen" @close="deleteAliasModalOpen = false" class="px-3">
      <div class="w-full rounded-md bg-white p-4 shadow-2xl dark:bg-grey-800">
        <div>
          <div
            class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100"
          >
            <exclamation class="text-red-600" />
          </div>
          <div class="mt-3 text-center">
            <h3
              class="text-lg leading-6 font-medium text-grey-900 dark:text-white"
              id="modal-title"
            >
              Delete alias
            </h3>
            <div class="mt-2">
              <p class="text-sm text-grey-500 dark:text-white">
                Are you sure you want to delete this alias? <b>You can restore this alias</b> if you
                later change your mind. Once deleted, this alias will
                <b>reject any emails sent to it</b>.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-5">
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-xs hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-hidden"
            @click="deleteAlias(aliasToView)"
            :class="deleteAliasLoading ? 'cursor-not-allowed' : ''"
            :disabled="deleteAliasLoading"
          >
            Delete
            <loader class="h-5 w-5" v-if="deleteAliasLoading" />
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md border border-grey-300 bg-white px-4 py-2 text-base font-medium text-grey-700 shadow-xs hover:bg-grey-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:border-grey-600 dark:bg-grey-500 dark:text-white"
            @click="deleteAliasModalOpen = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>

    <Modal :open="forgetAliasModalOpen" @close="forgetAliasModalOpen = false" class="px-3">
      <div class="w-full rounded-md bg-white p-4 shadow-2xl dark:bg-grey-800">
        <div>
          <div
            class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100"
          >
            <exclamation class="text-red-600" />
          </div>
          <div class="mt-3 text-center">
            <h3
              class="text-lg leading-6 font-medium text-grey-900 dark:text-white"
              id="modal-title"
            >
              Forget alias
            </h3>
            <div class="mt-2">
              <p class="text-sm text-grey-500 dark:text-white">
                Are you sure you want to forget this alias? Forgetting an alias will disassociate it
                from your account.
              </p>
              <p
                v-if="aliasToViewHasSharedDomain"
                class="mt-2 text-sm text-grey-500 dark:text-white"
              >
                <b>Note:</b> This alias uses a shared domain so it can <b>never be restored</b> or
                used again so make sure you are certain. Once forgotten, this alias will
                <b>reject any emails sent to it</b>
              </p>
              <p v-else class="mt-2 text-sm text-grey-500 dark:text-white">
                <b>Note:</b> This is a standard alias so it
                <b>can be created again in the future</b> since it will be as if it never existed in
                the database. Once forgotten, if someone sends an email to this alias and you have
                catch-all enabled then it will be created automatically again. If you would like
                this alias to reject any messages sent to it then you should delete it instead.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-5">
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-xs hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-hidden"
            @click="forgetAlias(aliasToView)"
            :class="forgetAliasLoading ? 'cursor-not-allowed' : ''"
            :disabled="forgetAliasLoading"
          >
            Forget
            <loader class="h-5 w-5" v-if="forgetAliasLoading" />
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md border border-grey-300 bg-white px-4 py-2 text-base font-medium text-grey-700 shadow-xs hover:bg-grey-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:border-grey-600 dark:bg-grey-500 dark:text-white"
            @click="forgetAliasModalOpen = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>

    <Modal :open="renewApiKeyModalOpen" @close="renewApiKeyModalOpen = false" class="px-3">
      <div class="w-full rounded-md bg-white p-4 shadow-2xl dark:bg-grey-800">
        <div>
          <div
            class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-50"
          >
            <information class="text-cyan-600" />
          </div>
          <div class="mt-3 text-center">
            <h3
              class="text-lg leading-6 font-medium text-grey-900 dark:text-white"
              id="modal-title"
            >
              Renew API Key
            </h3>
            <div class="mt-2">
              <p class="text-sm text-grey-500 dark:text-white">
                If your current API Key is <b>expiring soon</b> please enter your new API key (from
                the addy.io
                <a
                  href="https://app.addy.io/settings/api"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  class="cursor-pointer text-indigo-700 hover:text-indigo-500 dark:text-white dark:hover:text-grey-50"
                  >settings</a
                >
                page) below.
              </p>
            </div>
            <textarea
              v-model="tokenInput"
              id="api_token"
              placeholder="Enter your new API key"
              rows="2"
              required="required"
              autofocus="autofocus"
              class="mt-5 w-full appearance-none rounded-xs bg-white p-2 text-base text-grey-700 shadow-sm focus:ring-3"
            >
            </textarea>
          </div>
        </div>
        <div class="mt-5">
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md border border-transparent bg-cyan-400 px-4 py-2 text-base font-medium text-cyan-900 shadow-xs hover:bg-cyan-300 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-hidden"
            @click="getAliasDomainOptions(tokenInput, instance, true)"
            :class="domainOptionsLoading ? 'cursor-not-allowed' : ''"
            :disabled="domainOptionsLoading"
          >
            Renew API Key
            <loader class="h-5 w-5" v-if="domainOptionsLoading" />
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md border border-grey-300 bg-white px-4 py-2 text-base font-medium text-grey-700 shadow-xs hover:bg-grey-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:border-grey-600 dark:bg-grey-500 dark:text-white"
            @click="renewApiKeyModalOpen = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>

    <Modal :open="logoutModalOpen" @close="logoutModalOpen = false" class="px-3">
      <div class="w-full rounded-md bg-white p-4 shadow-2xl dark:bg-grey-800">
        <div>
          <div
            class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-50"
          >
            <information class="text-cyan-600" />
          </div>
          <div class="mt-3 text-center">
            <h3
              class="text-lg leading-6 font-medium text-grey-900 dark:text-white"
              id="modal-title"
            >
              Logout
            </h3>
            <div class="mt-2">
              <p class="text-sm text-grey-500 dark:text-white">
                Are you sure you want to logout? Logging out <b>will not remove the API key</b> from
                your addy.io account that is currently being used by the browser extension to access
                it.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-5">
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md border border-transparent bg-cyan-400 px-4 py-2 text-base font-medium text-cyan-900 shadow-xs hover:bg-cyan-300 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-hidden"
            @click="logout()"
            :class="logoutLoading ? 'cursor-not-allowed' : ''"
            :disabled="logoutLoading"
          >
            Logout
            <loader class="h-5 w-5" v-if="logoutLoading" />
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md border border-grey-300 bg-white px-4 py-2 text-base font-medium text-grey-700 shadow-xs hover:bg-grey-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden dark:border-grey-600 dark:bg-grey-500 dark:text-white"
            @click="logoutModalOpen = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>

    <Notifications position="bottom center" width="100%" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import debounce from 'lodash/debounce'
import Loader from './Loader'
import Plus from './../components/icons/Plus'
import AtSign from './../components/icons/AtSign'
import Cog from './../components/icons/Cog'
import Block from './../components/icons/Block'
import Forward from './../components/icons/Forward'
import Reply from './../components/icons/Reply'
import Sent from './../components/icons/Sent'
import ChevronLeft from './../components/icons/ChevronLeft'
import Exclamation from './../components/icons/Exclamation'
import Information from './../components/icons/Information'
import Clipboard from './../components/icons/Clipboard'
import Cross from './../components/icons/Cross'
import Edit from './../components/icons/Edit'
import Check from './../components/icons/Check'
import ExternalLink from './../components/icons/ExternalLink'
import Heart from './../components/icons/Heart'
import Modal from './../components/Modal.vue'
import Multiselect from '@vueform/multiselect'
import { useNotification, Notifications } from '@kyvg/vue3-notification'
const { notify } = useNotification()

// State
const browser = require('webextension-polyfill')
const extensionWindow = ref('')
const extensionVersion = ref(null)
const tabs = ref([
  {
    name: 'Aliases',
    icon: defineAsyncComponent(() => import('./../components/icons/AtSign.vue')),
  },
  {
    name: 'Settings',
    icon: defineAsyncComponent(() => import('./../components/icons/Cog.vue')),
  },
])
const selected = ref('Aliases')
const tokenInput = ref('')
const apiToken = ref('')
const instanceInput = ref('https://app.addy.io')
const instance = ref('')
const changeInstance = ref(false)
const searchInput = ref('')
const currentTabHostname = ref('')
const localPartSuggestions = ref([])
const description = ref('')
const localPart = ref('')
const localPartAutoFill = ref({})
const sendFromAliasDestination = ref('')
const sendFromAliasEmailToSendTo = ref('')
const domainOptionsLoading = ref(false)
const recipientsLoading = ref(false)
const createAliasLoading = ref(false)
const activateAliasLoading = ref(false)
const deactivateAliasLoading = ref(false)
const deleteAliasLoading = ref(false)
const forgetAliasLoading = ref(false)
const restoreAliasLoading = ref(false)
const logoutLoading = ref(false)
const editAliasDescriptionLoading = ref(false)
const deleteAliasModalOpen = ref(false)
const forgetAliasModalOpen = ref(false)
const restoreAliasModalOpen = ref(false)
const renewApiKeyModalOpen = ref(false)
const logoutModalOpen = ref(false)
const aliasToViewDescriptionEditing = ref(false)
const aliasDescriptionToEdit = ref('')
const newAlias = ref('')
const newAliasCopied = ref(false)
const sendFromAddressCopied = ref(false)
const error = ref('')
const domain = ref('')
const domainOptions = ref([])
const recipients = ref([])
const createAliasRecipientIds = ref([])
const aliasFormat = ref('random_characters')
const aliasFormatOptions = ref([
  {
    value: 'random_characters',
    label: 'Random Characters',
    paid: false,
  },
  {
    value: 'uuid',
    label: 'UUID',
    paid: false,
  },
  {
    value: 'random_words',
    label: 'Random Words',
    paid: true,
  },
  {
    value: 'custom',
    label: 'Custom',
    paid: false,
  },
])
const aliases = ref([])
const showAliasStatus = ref('all')
const aliasesTitle = ref('Aliases')
const aliasesHaveNextPage = ref(false)
const aliasesMeta = ref({})
const aliasesCurrentPage = ref(1)
const getAliasesLoading = ref(false)
const showMoreAliasesLoading = ref(false)
const aliasToView = ref({})
const theme = ref('system')
const autoCopyNewAlias = ref(true)
const showSearchSuggestions = ref(true)
const autoFillLocalPart = ref('')
const defaultAliasSort = ref('created_at')
const defaultAliasSortDir = ref('-')
const extensionUrl = ref(
  'https://chrome.google.com/webstore/detail/addyio-anonymous-email-fo/iadbdpnoknmbdeolbapdackdcogdmjpe'
)
const aliasSortOptions = ref([
  {
    value: 'active',
    label: 'Active',
  },
  {
    value: 'email',
    label: 'Alias',
  },
  {
    value: 'created_at',
    label: 'Created At',
  },
  {
    value: 'deleted_at',
    label: 'Deleted At',
  },
  {
    value: 'domain',
    label: 'Domain',
  },
  {
    value: 'emails_blocked',
    label: 'Emails Blocked',
  },
  {
    value: 'emails_forwarded',
    label: 'Emails Forwarded',
  },
  {
    value: 'emails_replied',
    label: 'Emails Replied',
  },
  {
    value: 'emails_sent',
    label: 'Emails Sent',
  },
  {
    value: 'last_blocked',
    label: 'Last Blocked At',
  },
  {
    value: 'last_forwarded',
    label: 'Last Forwarded At',
  },
  {
    value: 'last_replied',
    label: 'Last Replied At',
  },
  {
    value: 'last_sent',
    label: 'Last Sent At',
  },
  {
    value: 'last_used',
    label: 'Last Used At',
  },
  {
    value: 'updated_at',
    label: 'Updated At',
  },
])
const defaultSelected = ref('Aliases')
const abortController = ref(null)
const sharedDomains = ref([
  'anonaddy.me',
  'anonaddy.com',
  '4wrd.cc',
  'mailer.me',
  'addymail.com',
  'addy.io',
  'addy.to',
])

onMounted(async () => {
  apiToken.value = await getApiToken()
  instance.value = await getInstance()
  if (instance.value == 'https://app.anonaddy.com') {
    instance.value = 'https://app.addy.io'
  }
  if (apiToken.value && !instance.value) {
    instance.value = 'https://app.addy.io'
  }
  domainOptions.value = await getDomainOptions()
  recipients.value = await getRecipients()
  domain.value = await getDomain()
  aliasFormat.value = await getAliasFormat()
  showAliasStatus.value = await getShowAliasStatus()
  theme.value = await getTheme()
  if (theme.value == '') {
    theme.value = 'light'
  }
  autoCopyNewAlias.value = await getAutoCopyNewAlias()
  showSearchSuggestions.value = await getShowSearchSuggestions()
  autoFillLocalPart.value = await getAutoFillLocalPart()
  defaultAliasSort.value = await getDefaultAliasSort()
  defaultAliasSortDir.value = await getDefaultAliasSortDir()
  defaultSelected.value = await getDefaultSelected()
  selected.value = defaultSelected.value

  if (sharedDomainSelected.value && aliasFormat.value === 'custom' && !selfHosting.value) {
    aliasFormat.value = 'random_characters'
  }

  extensionWindow.value = await getExtensionWindow()
  currentTabHostname.value = await getCurrentTabHostname()

  let manifest = browser.runtime.getManifest()

  // Browser checks
  let ua = navigator.userAgent

  // Check if Gecko based
  if (/rv:([^\)]+)\) Gecko\/\d{8}/.test(ua)) {
    extensionUrl.value = 'https://addons.mozilla.org/en-GB/firefox/addon/addy_io/'
  }

  // Check if Safari
  let iOS = ua.match(/Macintosh/i) || ua.match(/iPad/i) || ua.match(/iPhone/i)

  // Check if Edge
  if (ua.match(/Edg/i)) {
    extensionUrl.value =
      'https://microsoftedge.microsoft.com/addons/detail/addyio-anonymous-email/ohjlgpcfncgkijjfmabldlgnccmgcehl'
  } else if (
    iOS &&
    ua.match(/WebKit/i) &&
    !ua.match(/CriOS/i) &&
    !ua.match(/EdgiOS/i) &&
    !ua.match(/Chrome/i) &&
    !ua.match(/Edg/i)
  ) {
    extensionUrl.value = 'https://apps.apple.com/app/addy-io-safari-extension/id6670220050'
  }

  if (manifest) {
    extensionVersion.value = manifest.version
  }

  if (apiToken.value) {
    document.getElementById('search').focus()
    getAliases(true)

    if (recipients.value.length == 0) {
      getRecipientsRequest()
    }
  }
})

// Computed properties
const subscribed = computed(() => Object.values(domainOptions.value).length > 3)
const selfHosting = computed(
  () => !['https://app.anonaddy.com', 'https://app.addy.io'].includes(instance.value)
)
const subscribedOrSelfHosting = computed(() => subscribed.value || selfHosting.value)
const aliasToViewHasSharedDomain = computed(() => {
  if (!aliasToView.value.domain) {
    return false
  }
  return sharedDomains.value.includes(aliasToView.value.domain)
})
const sharedDomainSelected = computed(() => sharedDomains.value.includes(domain.value))
const showDeletedAliases = computed(() => {
  if (showAliasStatus.value === 'all') {
    return 'with'
  } else if (showAliasStatus.value === 'deleted') {
    return 'only'
  } else {
    return 'without'
  }
})
const showActiveAliases = computed(() => {
  if (showAliasStatus.value === 'inactive') {
    return false
  } else if (showAliasStatus.value === 'active') {
    return true
  } else {
    return ''
  }
})
const activeTheme = computed(() => {
  if (theme.value === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    } else {
      return 'light'
    }
  }
  return theme.value
})

// --- Watchers ---
watch(apiToken, async (val) => {
  try {
    await browser.storage.sync.set({ apiToken: val })
  } catch (error) {
    console.log(error)
  }
})

watch(instance, async (val) => {
  try {
    await browser.storage.sync.set({ instance: val })
  } catch (error) {
    console.log(error)
  }
})

watch(domainOptions, async (val) => {
  try {
    await browser.storage.sync.set({ domainOptions: val })
  } catch (error) {
    console.log(error)
  }
})

watch(recipients, async (val) => {
  try {
    await browser.storage.sync.set({ recipients: val })
  } catch (error) {
    console.log(error)
  }
})

watch(domain, async (val) => {
  if (sharedDomainSelected.value) {
    aliasFormat.value = 'random_characters'
  }
  try {
    await browser.storage.sync.set({ domain: val })
  } catch (error) {
    console.log(error)
  }
})

watch(aliasFormat, async (val) => {
  // If alias format changes to custom and autoFillLocalPart is enabled then update localPart
  if (val === 'custom' && autoFillLocalPart.value !== '') {
    localPart.value = localPartAutoFill.value[autoFillLocalPart.value]
  } else {
    localPart.value = ''
  }
  try {
    await browser.storage.sync.set({ aliasFormat: val })
  } catch (error) {
    console.log(error)
  }
})

watch(showAliasStatus, async (val, oldVal) => {
  try {
    await browser.storage.sync.set({ showAliasStatus: val })
  } catch (error) {
    console.log(error)
  }
  if (!aliases.value.length && oldVal === 'all') {
    // No need to make another request if there are no aliases when the status is 'all'
  } else {
    aliasesCurrentPage.value = 1
    getAliases()
  }
})

watch(theme, async (val) => {
  try {
    await browser.storage.sync.set({ theme: val })
  } catch (error) {
    console.log(error)
  }
})

watch(autoCopyNewAlias, async (val) => {
  try {
    await browser.storage.sync.set({ autoCopyNewAlias: val })
  } catch (error) {
    console.log(error)
  }
})

watch(showSearchSuggestions, async (val) => {
  try {
    await browser.storage.sync.set({ showSearchSuggestions: val })
  } catch (error) {
    console.log(error)
  }
})

watch(autoFillLocalPart, async (val) => {
  if (aliasFormat.value === 'custom' && val !== '') {
    localPart.value = localPartAutoFill.value[val]
  }
  try {
    await browser.storage.sync.set({ autoFillLocalPart: val })
  } catch (error) {
    console.log(error)
  }
})

watch(defaultAliasSort, async (val) => {
  try {
    await browser.storage.sync.set({ defaultAliasSort: val })
  } catch (error) {
    console.log(error)
  }
  if (aliases.value.length) {
    aliasesCurrentPage.value = 1
    getAliases(true)
  }
})

watch(defaultAliasSortDir, async (val) => {
  try {
    await browser.storage.sync.set({ defaultAliasSortDir: val })
  } catch (error) {
    console.log(error)
  }
  if (aliases.value.length) {
    aliasesCurrentPage.value = 1
    getAliases(true)
  }
})

watch(defaultSelected, async (val) => {
  try {
    await browser.storage.sync.set({ defaultSelected: val })
  } catch (error) {
    console.log(error)
  }
})

watch(tokenInput, () => {
  error.value = ''
})

watch(description, () => {
  error.value = ''
})

watch(localPart, () => {
  error.value = ''
})

watch(selected, (val) => {
  error.value = ''
  cancelEditDescription()
})

watch(
  searchInput,
  debounce((val) => {
    if (val == '' || val.length > 2) {
      // If there is already a request loading then abort it
      if (getAliasesLoading.value || showMoreAliasesLoading.value) {
        abortController.value.abort()
        showMoreAliasesLoading.value = false
      }
      aliasesCurrentPage.value = 1
      getAliases()
    }
  }, 300)
)

watch(
  aliasToViewDescriptionEditing,
  debounce((val) => {
    if (val === true) {
      document.getElementById('description-input').focus()
    }
  }, 100)
)

// Methods
const getApiToken = async () => {
  try {
    const result = await browser.storage.sync.get({ apiToken: '' })
    return result.apiToken
  } catch (error) {
    console.log(error)
  }
}

const getInstance = async () => {
  try {
    const result = await browser.storage.sync.get({ instance: '' })
    return result.instance
  } catch (error) {
    console.log(error)
  }
}

const getDomainOptions = async () => {
  try {
    const result = await browser.storage.sync.get({ domainOptions: [''] })
    return result.domainOptions
  } catch (error) {
    console.log(error)
  }
}

const getRecipients = async () => {
  try {
    const result = await browser.storage.sync.get({ recipients: [''] })
    return result.recipients
  } catch (error) {
    console.log(error)
  }
}

const getDomain = async () => {
  try {
    const result = await browser.storage.sync.get({ domain: '' })
    return result.domain
  } catch (error) {
    console.log(error)
  }
}

const getAliasFormat = async () => {
  try {
    const result = await browser.storage.sync.get({ aliasFormat: 'random_characters' })
    return result.aliasFormat
  } catch (error) {
    console.log(error)
  }
}

const getShowAliasStatus = async () => {
  try {
    const result = await browser.storage.sync.get({ showAliasStatus: 'all' })
    return result.showAliasStatus
  } catch (error) {
    console.log(error)
  }
}

const getTheme = async () => {
  try {
    const result = await browser.storage.sync.get({ theme: 'system' })
    return result.theme
  } catch (error) {
    console.log(error)
  }
}

const getAutoCopyNewAlias = async () => {
  try {
    const result = await browser.storage.sync.get({ autoCopyNewAlias: true })
    return result.autoCopyNewAlias
  } catch (error) {
    console.log(error)
  }
}

const getShowSearchSuggestions = async () => {
  try {
    const result = await browser.storage.sync.get({ showSearchSuggestions: true })
    return result.showSearchSuggestions
  } catch (error) {
    console.log(error)
  }
}

const getAutoFillLocalPart = async () => {
  try {
    const result = await browser.storage.sync.get({ autoFillLocalPart: '' })
    return result.autoFillLocalPart
  } catch (error) {
    console.log(error)
  }
}

const getDefaultAliasSort = async () => {
  try {
    const result = await browser.storage.sync.get({ defaultAliasSort: 'created_at' })
    return result.defaultAliasSort
  } catch (error) {
    console.log(error)
  }
}

const getDefaultAliasSortDir = async () => {
  try {
    const result = await browser.storage.sync.get({ defaultAliasSortDir: '-' })
    return result.defaultAliasSortDir
  } catch (error) {
    console.log(error)
  }
}

const getDefaultSelected = async () => {
  try {
    const result = await browser.storage.sync.get({ defaultSelected: 'Aliases' })
    return result.defaultSelected
  } catch (error) {
    console.log(error)
  }
}

const getCurrentTabHostname = async () => {
  try {
    const result = await browser.tabs.query({ active: true, currentWindow: true })
    if (result[0].url && extensionWindow.value) {
      const url = new URL(result[0].url)

      let parsed = window.psl.parse(url.hostname)
      if (parsed.sld) {
        localPartSuggestions.value.push(parsed.sld)
        localPartAutoFill.value.sld = parsed.sld
      }
      if (parsed.domain) {
        localPartSuggestions.value.push(parsed.domain)
        localPartAutoFill.value.domain = parsed.domain
      }
      if (url.hostname && url.hostname !== parsed.domain) {
        localPartSuggestions.value.push(url.hostname)
        localPartAutoFill.value.full = url.hostname
      }

      if (url.hostname === parsed.domain) {
        localPartAutoFill.value.full = url.hostname
      }

      // Also add a suggestion with a random alphanumeric string appended
      if (parsed.sld) {
        let random = parsed.sld + '.' + Math.random().toString(36).substring(2, 5)
        localPartSuggestions.value.push(random)
        localPartAutoFill.value.random = random
      }

      // Set the alias local part if the format is custom and autoFill is enabled
      if (aliasFormat.value === 'custom' && autoFillLocalPart.value !== '') {
        localPart.value = localPartAutoFill.value[autoFillLocalPart.value]
      }

      return url.hostname
    }
    return null
  } catch (error) {
    console.log(error)
  }
}

const getExtensionWindow = async () => {
  try {
    let result = await browser.extension.getViews({ type: 'popup' })
    return result[0]
  } catch (error) {
    console.log(error)
  }
}

const getAliases = async (calledFromMounted = false) => {
  error.value = ''

  // To prevent overriding the users choice of tab to display on extension open
  if (!calledFromMounted) {
    selected.value = 'Aliases'
  }

  if (aliasesCurrentPage.value == 1) {
    getAliasesLoading.value = true
  }

  abortController.value = new AbortController()
  const signal = abortController.value.signal

  try {
    const response = await fetch(
      `${instance.value}/api/v1/aliases?filter[deleted]=${showDeletedAliases.value}&filter[active]=${showActiveAliases.value}&filter[search]=${
        searchInput.value.length > 2 ? searchInput.value : ''
      }&sort=${defaultAliasSortDir.value}${defaultAliasSort.value}&page[number]=${
        aliasesCurrentPage.value
      }&page[size]=10`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Requested-From': 'browser-extension',
          Authorization: `Bearer ${apiToken.value}`,
        },
        signal: signal,
      }
    )

    if (response.status === 200) {
      let data = await response.json()

      if (aliasesCurrentPage.value > 1) {
        aliases.value = aliases.value.concat(data.data)
      } else {
        aliases.value = data.data
      }

      if (searchInput.value) {
        aliasesTitle.value = `Search Results (${data.meta.total} `
        aliasesTitle.value += data.meta.total === 1 ? 'match)' : 'matches)'
      } else {
        aliasesTitle.value = 'Aliases'
      }

      if (data.links) {
        aliasesHaveNextPage.value = data.links.next ? true : false
      } else {
        aliasesHaveNextPage.value = false
      }

      aliasesMeta.value = data.meta
    } else if (response.status === 401) {
      logout(true)
      error.value =
        "Unauthenticated, your API key has either expired or been revoked. You've been automatically logged out."
    } else {
      error.value = 'An Error Has Occurred'
    }

    if (aliasesCurrentPage.value == 1) {
      getAliasesLoading.value = false
    } else {
      showMoreAliasesLoading.value = false
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      if (aliasesCurrentPage.value == 1) {
        getAliasesLoading.value = false
      } else {
        showMoreAliasesLoading.value = false
      }

      error.value = 'An Error Has Occurred'
      console.log(error)
    }
  }
}

const getAliasDomainOptions = async (token, instanceArgument, renew = false) => {
  error.value = ''

  if (!token) {
    let message = 'An API key is required to login!'
    return renew ? errorNotification(message) : (error.value = message)
  }

  if (!validToken(token)) {
    let message = "Invalid API key format, please check that you've entered it correctly!"
    return renew ? errorNotification(message) : (error.value = message)
  }

  if (token.length < 40) {
    let message = "That API key is too short, please check that you've entered it correctly!"
    return renew ? errorNotification(message) : (error.value = message)
  }

  if (token.length > 60) {
    let message = "That API key is too long, please check that you've entered it correctly!"
    return renew ? errorNotification(message) : (error.value = message)
  }

  if (!validInstance(instanceArgument) && changeInstance.value) {
    let message =
      'Please enter a valid URL for the instance with no trailing slash, e.g. "https://app.example.com"'
    return renew ? errorNotification(message) : (error.value = message)
  }

  domainOptionsLoading.value = true

  try {
    const response = await fetch(`${instanceArgument}/api/v1/domain-options`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Requested-From': 'browser-extension',
        Authorization: `Bearer ${token}`,
      },
    })

    domainOptionsLoading.value = false

    if (response.status === 401) {
      if (renew) {
        errorNotification("Error, invalid API key, please check that you've entered it correctly")
      } else if (!apiToken.value) {
        error.value =
          "Error, invalid API key, please check that you've entered it correctly and that you have the correct instance (if self-hosting)"
      } else {
        logout(true)
        error.value =
          "Unauthenticated, your API key has either expired or been revoked. You've been automatically logged out."
      }
    } else if (response.status === 200) {
      // Clear token input
      tokenInput.value = ''

      if (!instance.value) {
        instance.value = instanceArgument
      }

      if (!apiToken.value) {
        apiToken.value = token
        getAliases()
        getRecipientsRequest()

        success('Logged in successfully')
      } else if (renew) {
        apiToken.value = token
        renewApiKeyModalOpen.value = false

        success('Renewed API Key successfully')
      } else {
        success('Domains and defaults refreshed')
      }

      let data = await response.json()
      domainOptions.value = data.data
      domain.value = data.defaultAliasDomain ? data.defaultAliasDomain : data.data[0]
      aliasFormat.value = data.defaultAliasFormat ? data.defaultAliasFormat : 'random_characters'

      if (sharedDomainSelected.value && aliasFormat.value === 'custom' && !selfHosting.value) {
        aliasFormat.value = 'random_characters'
      }
    } else {
      renew ? errorNotification('An Error Has Occurred') : (error.value = 'An Error Has Occurred')
    }
  } catch (error) {
    domainOptionsLoading.value = false
    renew ? errorNotification('An Error Has Occurred') : (error.value = 'An Error Has Occurred')
    console.log(error)
  }
}

const getRecipientsRequest = async () => {
  recipientsLoading.value = true

  try {
    const response = await fetch(`${instance.value}/api/v1/recipients?filter[verified]=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Requested-From': 'browser-extension',
        Authorization: `Bearer ${apiToken.value}`,
      },
    })

    let data = await response.json()

    recipients.value = data.data.map(function (recipient) {
      return {
        id: recipient.id,
        email: recipient.email,
      }
    })

    if (selected.value == 'Settings') {
      success('Recipients refreshed')
    }

    recipientsLoading.value = false
  } catch (error) {
    recipientsLoading.value = false
    error.value = 'An Error Has Occurred'
    console.log(error)
  }
}

const createAlias = async () => {
  // Validate alias local part
  if (
    !sharedDomainSelected.value &&
    aliasFormat.value === 'custom' &&
    !validLocalPart(localPart.value)
  ) {
    return (error.value = 'Valid local part required')
  }

  if (description.value.length > 200) {
    return (error.value = 'Description cannot be more than 200 characters')
  }

  if (!Object.values(domainOptions.value).find((domainOption) => domainOption === domain.value)) {
    return (error.value = 'Invalid alias domain name')
  }

  createAliasLoading.value = true
  error.value = ''

  try {
    const response = await fetch(`${instance.value}/api/v1/aliases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Requested-From': 'browser-extension',
        Authorization: `Bearer ${apiToken.value}`,
      },
      body: JSON.stringify({
        domain: domain.value,
        local_part: localPart.value,
        description: description.value ? description.value : currentTabHostname.value,
        format: aliasFormat.value,
        recipient_ids: createAliasRecipientIds.value,
      }),
    })

    createAliasLoading.value = false

    if (response.status === 403) {
      error.value = 'You have reached your active shared domain alias limit'
    } else if (response.status === 429) {
      error.value = 'You have reached your hourly limit for creating new aliases'
    } else if (response.status === 422) {
      let error = await response.json()
      error.value = error.errors[Object.keys(error.errors)[0]][0]
    } else if (response.status === 401) {
      logout(true)
      error.value =
        "Unauthenticated, your API key has either expired or been revoked. You've been automatically logged out."
    } else if (response.status === 201) {
      let data = await response.json()
      localPart.value = ''
      description.value = ''
      createAliasRecipientIds.value = []
      newAlias.value = getAliasEmail(data.data)

      // If auto copy is enabled
      if (autoCopyNewAlias.value) {
        await copyToClipboard(getAliasEmail(data.data))
      }

      aliases.value = [data.data].concat(aliases.value)
    } else {
      error.value = 'An Error Has Occurred'
    }
  } catch (error) {
    createAliasLoading.value = false
    error.value = 'An Error Has Occurred'
    console.log(error)
  }
}

const editAliasDescription = async (alias) => {
  editAliasDescriptionLoading.value = true

  try {
    const response = await fetch(`${instance.value}/api/v1/aliases/${alias.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Requested-From': 'browser-extension',
        Authorization: `Bearer ${apiToken.value}`,
      },
      body: JSON.stringify({
        description: aliasDescriptionToEdit.value,
      }),
    })

    editAliasDescriptionLoading.value = false

    if (response.status === 200) {
      alias.description = aliasDescriptionToEdit.value
      aliasDescriptionToEdit.value = ''
      aliasToViewDescriptionEditing.value = false
      success('Alias description updated successfully')
    } else {
      error.value = 'An Error Has Occurred'
    }
  } catch (error) {
    editAliasDescriptionLoading.value = false
    aliasDescriptionToEdit.value = ''
    aliasToViewDescriptionEditing.value = false
    error.value = 'An Error Has Occurred'
    console.log(error)
  }
}

const activateAlias = async (alias) => {
  activateAliasLoading.value = true

  try {
    const response = await fetch(`${instance.value}/api/v1/active-aliases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Requested-From': 'browser-extension',
        Authorization: `Bearer ${apiToken.value}`,
      },
      body: JSON.stringify({
        id: alias.id,
      }),
    })

    activateAliasLoading.value = false

    if (response.status === 403) {
      error.value = 'You have reached your active shared domain alias limit'
    } else if (response.status === 200) {
      alias.active = true
      success('Alias activated successfully')
    } else {
      error.value = 'An Error Has Occurred'
    }
  } catch (error) {
    activateAliasLoading.value = false
    error.value = 'An Error Has Occurred'
    console.log(error)
  }
}

const deactivateAlias = async (alias) => {
  deactivateAliasLoading.value = true

  try {
    const response = await fetch(`${instance.value}/api/v1/active-aliases/${alias.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Requested-From': 'browser-extension',
        Authorization: `Bearer ${apiToken.value}`,
      },
    })

    deactivateAliasLoading.value = false

    if (response.status === 204) {
      alias.active = false
      success('Alias deactivated successfully')
    } else {
      error.value = 'An Error Has Occurred'
    }
  } catch (error) {
    deactivateAliasLoading.value = false
    error.value = 'An Error Has Occurred'
    console.log(error)
  }
}

const deleteAlias = async (alias) => {
  deleteAliasLoading.value = true

  try {
    const response = await fetch(`${instance.value}/api/v1/aliases/${alias.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Requested-From': 'browser-extension',
        Authorization: `Bearer ${apiToken.value}`,
      },
    })

    deleteAliasLoading.value = false

    if (response.status === 204) {
      alias.deleted_at = new Date().toISOString()
      alias.active = false
      success('Alias deleted successfully')
    } else {
      error.value = 'An Error Has Occurred'
    }
  } catch (error) {
    deleteAliasLoading.value = false
    error.value = 'An Error Has Occurred'
    console.log(error)
  }

  deleteAliasModalOpen.value = false
}

const forgetAlias = async (alias) => {
  forgetAliasLoading.value = true

  try {
    const response = await fetch(`${instance.value}/api/v1/aliases/${alias.id}/forget`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Requested-From': 'browser-extension',
        Authorization: `Bearer ${apiToken.value}`,
      },
    })

    forgetAliasLoading.value = false

    if (response.status === 204) {
      aliases.value = aliases.value.filter((a) => a.id !== alias.id)
      success('Alias forgotten successfully')
    } else {
      error.value = 'An Error Has Occurred'
    }
  } catch (error) {
    forgetAliasLoading.value = false
    error.value = 'An Error Has Occurred'
    console.log(error)
  }

  selected.value = 'Aliases'
  forgetAliasModalOpen.value = false
}

const restoreAlias = async (alias) => {
  restoreAliasLoading.value = true

  try {
    const response = await fetch(`${instance.value}/api/v1/aliases/${alias.id}/restore`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Requested-From': 'browser-extension',
        Authorization: `Bearer ${apiToken.value}`,
      },
    })

    restoreAliasLoading.value = false

    if (response.status === 200) {
      alias.deleted_at = null
      alias.active = true
      success('Alias restored successfully')
    } else {
      error.value = 'An Error Has Occurred'
    }
  } catch (error) {
    restoreAliasLoading.value = false
    error.value = 'An Error Has Occurred'
    console.log(error)
  }

  restoreAliasModalOpen.value = false
}

const displaySendFromAddress = () => {
  error.value = ''
  sendFromAddressCopied.value = false
  if (!validEmail(sendFromAliasDestination.value)) {
    error.value = 'Valid Email required'
    return
  }
  sendFromAliasEmailToSendTo.value = `${aliasToView.value.local_part}+${sendFromAliasDestination.value.replace('@', '=')}@${aliasToView.value.domain}`
}

const openSendFromAlias = () => {
  if (aliasToView.value.deleted_at) {
    return (error.value = 'You must restore this alias first')
  }
  if (!aliasToView.value.active) {
    return (error.value = 'You must activate this alias first')
  }
  sendFromAliasDestination.value = ''
  sendFromAliasEmailToSendTo.value = ''
  sendFromAddressCopied.value = false
  selected.value = 'SendFromAlias'
}

const viewAlias = (alias) => {
  selected.value = 'ViewAlias'
  aliasToView.value = alias
}

const getAliasStatus = (alias) => {
  if (alias.deleted_at) {
    return {
      foregroundColour: 'bg-red-400',
      backgroundColour: 'bg-red-100',
      status: 'Deleted',
    }
  } else {
    return {
      foregroundColour: alias.active ? 'bg-green-400' : 'bg-grey-400',
      backgroundColour: alias.active ? 'bg-green-100' : 'bg-grey-100',
      status: alias.active ? 'Active' : 'Inactive',
    }
  }
}

const showMoreAliases = () => {
  aliasesCurrentPage.value += 1
  showMoreAliasesLoading.value = true
  getAliases()
}

const cancelEditDescription = () => {
  aliasToViewDescriptionEditing.value = false
  aliasDescriptionToEdit.value = ''
}

const cancelChangeInstance = () => {
  changeInstance.value = false
  instanceInput.value = 'https://app.addy.io'
}

const validInstance = (instance) => {
  let re = /^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+(?<!\/)$/
  return re.test(instance)
}

const validLocalPart = (part) => {
  let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))$/
  return re.test(part)
}

const validEmail = (email) => {
  let re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(email)
}

const validToken = (token) => {
  let re = /^(addy_io_)?[a-zA-Z0-9]+$/
  return re.test(token)
}

const setNewAliasCopied = () => {
  newAliasCopied.value = true
}

const setSendFromAddressCopied = () => {
  sendFromAddressCopied.value = true
}

const getAliasEmail = (alias) => {
  if (!alias) return ''
  return alias.extension
    ? `${alias.local_part}+${alias.extension}@${alias.domain}`
    : `${alias.local_part}@${alias.domain}`
}

const getAliasLocalPart = (alias) => {
  return alias.extension ? `${alias.local_part}+${alias.extension}` : alias.local_part
}

const copyToClipboard = (text, onSuccessCallback = null) => {
  try {
    // Try using the modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
      if (onSuccessCallback) {
        onSuccessCallback()
      }
      success('Copied to clipboard')
      return true
    }

    // Fallback for older browsers and Safari
    const textArea = document.createElement('textarea')
    textArea.value = text

    // Make the textarea out of viewport
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)

    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
      if (onSuccessCallback) {
        onSuccessCallback()
      }
      success('Copied to clipboard')
      return true
    } catch (err) {
      console.error('Failed to copy text: ', err)
      errorNotification('Failed to copy to clipboard')
      return false
    } finally {
      textArea.remove()
    }
  } catch (err) {
    console.error('Failed to copy text: ', err)
    errorNotification('Failed to copy to clipboard')
    return false
  }
}

const success = (text = '') => {
  notify({ text, type: 'success' })
}

const errorNotification = (text = '') => {
  notify({ text, type: 'error' })
}

const logout = async (expiredToken = false) => {
  if (!expiredToken) {
    logoutLoading.value = true
  }

  try {
    await browser.storage.sync.remove([
      'apiToken',
      'instance',
      'domainOptions',
      'recipients',
      'domain',
      'aliasFormat',
      'showAliasStatus',
      'theme',
      'autoCopyNewAlias',
      'showSearchSuggestions',
      'autoFillLocalPart',
      'defaultAliasSort',
      'defaultAliasSortDir',
      'defaultSelected',
    ])
    apiToken.value = await getApiToken()
    instance.value = await getInstance()
    domainOptions.value = await getDomainOptions()
    recipients.value = await getRecipients()
    domain.value = await getDomain()
    aliasFormat.value = await getAliasFormat()
    showAliasStatus.value = await getShowAliasStatus()
    theme.value = await getTheme()
    autoCopyNewAlias.value = await getAutoCopyNewAlias()
    showSearchSuggestions.value = await getShowSearchSuggestions()
    autoFillLocalPart.value = await getAutoFillLocalPart()
    defaultAliasSort.value = await getDefaultAliasSort()
    defaultAliasSortDir.value = await getDefaultAliasSortDir()
    defaultSelected.value = await getDefaultSelected()

    logoutModalOpen.value = false
    if (!expiredToken) {
      logoutLoading.value = false
      success('Logged out successfully')
    }
  } catch (error) {
    logoutLoading.value = false
    console.log(error)
  }
}

const popout = () => {
  // Open the extension in a new window (popout)
  const url = window.location.href
  let hrefParts = url.split('#')
  let newUrl = ''
  if (url.includes('uilocation=popup')) {
    newUrl = url.replace('uilocation=popup', 'uilocation=popout')
  } else if (url.includes('uilocation=tab')) {
    newUrl = url.replace('uilocation=tab', 'uilocation=popout')
  } else if (url.includes('uilocation=sidebar')) {
    newUrl = url.replace('uilocation=sidebar', 'uilocation=popout')
  } else {
    newUrl = hrefParts[0] + '?uilocation=popout' + (hrefParts.length > 1 ? '#' + hrefParts[1] : '')
  }
  window.open(newUrl, '_blank', 'width=600,height=800')
}
</script>

<style src="@vueform/multiselect/themes/default.css"></style>
