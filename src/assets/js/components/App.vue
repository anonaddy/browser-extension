<template>
  <div :class="activeTheme">
    <div v-if="!apiToken" class="login p-3 bg-indigo-900">
      <header
        class="flex items-center justify-between border-b bg-indigo-900 border-indigo-700 pb-3 mb-4"
      >
        <a href="https://app.addy.io" target="_blank" rel="nofollow noreferrer noopener">
          <img class="h-6" src="img/logo.png" alt="addy.io Logo" />
        </a>
        <span class="text-grey-50 text-sm self-center">Anonymous Email Forwarding</span>
      </header>
      <div
        v-if="error"
        class="flex items-center justify-center text-sm border-t-4 rounded-sm text-yellow-800 border-yellow-600 bg-yellow-100 p-2 mb-4"
        role="alert"
      >
        {{ error }}
      </div>
      <div v-if="changeInstance">
        <label for="instance" class="block text-indigo-100 mb-1 text-base">
          addy.io Instance: (only change this is you are self-hosting addy.io)</label
        >
        <input
          v-model="instanceInput"
          id="instance"
          type="text"
          required="required"
          class="appearance-none shadow bg-white rounded-sm text-base w-full p-2 text-grey-700 focus:ring mb-4"
        />
      </div>
      <label for="api_token" class="block text-indigo-100 mb-1 text-base">
        API key (from the addy.io
        <a
          href="https://app.addy.io/settings/api"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="text-white hover:text-indigo-50 cursor-pointer"
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
        class="appearance-none shadow bg-white rounded-sm text-base w-full p-2 text-grey-700 focus:ring mb-4"
      >
      </textarea>
      <button
        @click="getAliasDomainOptions(tokenInput, instanceInput)"
        class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
        :class="domainOptionsLoading ? 'cursor-not-allowed' : ''"
        :disabled="domainOptionsLoading"
      >
        Sign In
        <loader class="h-5 w-5" v-if="domainOptionsLoading" />
      </button>
      <div class="flex justify-between mt-3 text-base">
        <p class="text-indigo-100">
          Don't have an account?
          <a
            href="https://app.addy.io/register"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="text-white hover:text-indigo-50 cursor-pointer"
          >
            Register
          </a>
        </p>
        <span
          v-if="!changeInstance"
          @click="changeInstance = true"
          class="block text-white hover:text-indigo-50 cursor-pointer"
        >
          Change Instance
        </span>
        <span
          v-else
          @click="cancelChangeInstance"
          class="block text-white hover:text-indigo-50 cursor-pointer"
        >
          Cancel
        </span>
      </div>
    </div>

    <div class="logged-in" v-else>
      <header class="flex items-center justify-between bg-indigo-900 h-12">
        <button
          v-if="extensionWindow"
          @click="popout"
          class="text-white h-12 w-20 px-4 hover:bg-indigo-800 flex justify-center items-center focus:outline-none"
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
              class="w-full text-base appearance-none shadow bg-white text-grey-700 focus:outline-none rounded-sm py-1 px-8 dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="absolute left-0 inset-y-0 ml-2 flex items-center text-grey-300 dark:text-white h-full w-5"
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
              @click=";(getAliasesLoading = true), (searchInput = '')"
              class="absolute right-0 inset-y-0 cursor-pointer mr-2 flex items-center text-grey-300 dark:text-white h-full w-5"
            />
          </div>
        </div>
        <button
          @click="selected = 'CreateAlias'"
          class="text-white h-12 w-20 px-4 hover:bg-indigo-800 flex justify-center items-center focus:outline-none"
          title="Create Alias"
        >
          <plus />
        </button>
      </header>

      <content class="bg-grey-50 dark:bg-grey-900 dark:text-white">
        <div
          v-if="error"
          class="flex items-center justify-center text-sm border-t-4 text-yellow-800 border-yellow-600 bg-yellow-100 p-2"
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
              class="px-3 py-2 shadow text-sm tracking-wide text-grey-600 bg-white dark:bg-grey-700 dark:text-white border-b border-grey-200 dark:border-grey-600"
            >
              Search
              <span v-if="localPartSuggestions[0] && localPartSuggestions[0] !== currentTabHostname"
                >"<span
                  @click=";(getAliasesLoading = true), (searchInput = localPartSuggestions[0])"
                  class="text-indigo-700 hover:text-indigo-500 dark:text-white dark:hover:text-grey-50 cursor-pointer"
                  >{{ localPartSuggestions[0] }}</span
                >" or</span
              >
              "<span
                @click=";(getAliasesLoading = true), (searchInput = currentTabHostname)"
                class="text-indigo-700 hover:text-indigo-500 dark:text-white dark:hover:text-grey-50 cursor-pointer"
                >{{ currentTabHostname }}</span
              >"?
            </div>

            <div
              class="px-3 py-2 uppercase shadow text-sm tracking-wide text-grey-600 bg-white flex justify-between items-center dark:bg-grey-700 dark:text-white"
            >
              {{ aliasesTitle }}
              <div class="flex items-center">
                <label
                  for="show_alias_status"
                  class="capitalize block text-grey-700 dark:text-white mr-2"
                  >Show:</label
                >
                <div class="relative">
                  <select
                    v-model="showAliasStatus"
                    id="show_alias_status"
                    class="block appearance-none text-grey-700 bg-white pl-2 py-1 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white"
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
                      class="fill-current h-4 w-4"
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
                  class="flex items-center h-20 hover:bg-indigo-50 dark:hover:bg-grey-800"
                >
                  <div
                    @click="viewAlias(alias)"
                    class="grow flex items-center h-full truncate py-1 pl-2 cursor-pointer"
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
                      class="outline-none alias-status-background rounded-full flex items-center justify-center mx-1.5"
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
                          alias.local_part
                        }}</span
                        ><span>@{{ alias.domain }}</span>
                      </div>
                      <div v-if="alias.description" class="flex items-center">
                        <span
                          class="inline-block text-grey-400 text-sm truncate py-1 border border-transparent dark:text-grey-50"
                        >
                          {{ alias.description }}
                        </span>
                      </div>
                    </span>
                  </div>

                  <div class="flex items-center flex-none py-1 pr-2 h-full">
                    <div class="cursor-pointer text-grey-400 dark:text-grey-200" title="Copy Alias">
                      <clipboard
                        v-clipboard="() => alias.email"
                        v-clipboard:success="aliasCopied"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="aliasesHaveNextPage" class="p-3">
                <button
                  @click="showMoreAliases"
                  class="w-full flex justify-center items-center px-4 py-2 border border-grey-300 shadow-sm text-sm font-medium rounded-md text-grey-700 bg-white hover:bg-grey-50 dark:bg-grey-600 dark:text-white dark:border-grey-800 dark:hover:bg-grey-500"
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
            class="p-3 uppercase shadow text-sm tracking-wide text-grey-600 bg-white flex justify-between dark:bg-grey-700 dark:text-white"
          >
            <div class="flex">
              Settings (<a
                :href="`${instance}`"
                target="_blank"
                rel="noopener noreferrer nofollow"
                class="flex text-indigo-700 hover:text-indigo-500 dark:text-white dark:hover:text-grey-50 cursor-pointer"
                >Visit Dashboard <external-link class="h-4 w-4 ml-1" /></a
              >)
            </div>
            <button
              @click="selected = 'Aliases'"
              class="back-icon text-grey-600 hover:bg-grey-50 -m-3 flex justify-center items-center focus:outline-none dark:text-white dark:hover:bg-grey-800"
            >
              <chevron-left />
            </button>
          </div>

          <div class="w-full text-left p-3 border-b border-grey-200">
            <label for="select_theme" class="block text-grey-700 dark:text-white mb-1"
              >Extension Theme:</label
            >
            <div class="relative">
              <select
                v-model="theme"
                id="select_theme"
                class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white"
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
                  class="fill-current h-4 w-4"
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

          <div class="w-full text-left p-3 border-b border-grey-200">
            <div class="flex space-x-4">
              <div class="w-full">
                <label for="default_sort" class="block text-grey-700 dark:text-white mb-1"
                  >Default Alias Sort By:</label
                >
                <div class="relative">
                  <select
                    v-model="defaultAliasSort"
                    id="default_sort"
                    class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white"
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
                      class="fill-current h-4 w-4"
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
                <label for="default_sort_dir" class="block text-grey-700 dark:text-white mb-1"
                  >Direction:</label
                >
                <div class="relative">
                  <select
                    v-model="defaultAliasSortDir"
                    id="default_sort_dir"
                    class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white"
                    required
                  >
                    <option value="-">Descending</option>
                    <option value="">Ascending</option>
                  </select>
                  <div
                    class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
                  >
                    <svg
                      class="fill-current h-4 w-4"
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

          <div class="w-full text-left p-3 border-b border-grey-200">
            <label for="select_default_tab" class="block text-grey-700 dark:text-white mb-1"
              >Tab To Show On Open:</label
            >
            <div class="relative">
              <select
                v-model="defaultSelected"
                id="select_default_tab"
                class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white"
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
                  class="fill-current h-4 w-4"
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

          <div class="w-full text-left p-3 border-b border-grey-200">
            <label for="select_auto_copy_new_alias" class="block text-grey-700 dark:text-white mb-1"
              >Automatically Copy New Aliases to Clipboard:</label
            >
            <div class="relative">
              <select
                v-model="autoCopyNewAlias"
                id="select_auto_copy_new_alias"
                class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white"
                required
              >
                <option :value="true">Enabled</option>
                <option :value="false">Disabled</option>
              </select>
              <div
                class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
              >
                <svg
                  class="fill-current h-4 w-4"
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

          <div class="w-full text-left p-3 border-b border-grey-200">
            <label
              for="select_show_search_suggestions"
              class="block text-grey-700 dark:text-white mb-1"
              >Show Search Suggestions:</label
            >
            <div class="relative">
              <select
                v-model="showSearchSuggestions"
                id="select_show_search_suggestions"
                class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white"
                required
              >
                <option :value="true">Enabled</option>
                <option :value="false">Disabled</option>
              </select>
              <div
                class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-grey-700 dark:text-white"
              >
                <svg
                  class="fill-current h-4 w-4"
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

          <div class="w-full text-left p-3 border-b border-grey-200">
            <label
              for="select_auto_fill_local_part"
              class="block text-grey-700 dark:text-white mb-1"
              >Automatically Fill New Alias Local Parts When Using The Custom Alias Format:</label
            >
            <div class="relative">
              <select
                v-model="autoFillLocalPart"
                id="select_auto_fill_local_part"
                class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white"
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
                  class="fill-current h-4 w-4"
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
            class="w-full text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
            :class="domainOptionsLoading ? 'cursor-not-allowed' : ''"
            :disabled="domainOptionsLoading"
          >
            Refresh Domains and Defaults
            <loader class="h-5 w-5" v-if="domainOptionsLoading" />
          </button>
          <button
            @click="getRecipientsRequest()"
            class="w-full text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
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
            class="w-full flex items-center justify-between text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
          >
            <span class="flex items-center"
              >Rate the Extension<heart class="h-5 w-5 ml-1 text-cyan-500"
            /></span>
            <external-link class="h-5 w-5" />
          </a>
          <button
            @click="logoutModalOpen = true"
            class="w-full text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
          >
            Logout
          </button>
          <div
            v-if="extensionVersion"
            class="w-full text-center p-3 border-grey-200 text-grey-600 dark:text-grey-100"
          >
            v{{ extensionVersion }}
          </div>
        </div>
        <div v-else-if="selected == 'ViewAlias'">
          <!-- View Alias Tab -->
          <div
            class="p-3 uppercase shadow text-sm tracking-wide text-grey-600 bg-white flex justify-between dark:bg-grey-700 dark:text-white"
          >
            Alias Details
            <button
              @click="selected = 'Aliases'"
              class="back-icon text-grey-600 hover:bg-grey-50 -m-3 flex justify-center items-center focus:outline-none dark:text-white dark:hover:bg-grey-800"
            >
              <chevron-left />
            </button>
          </div>
          <div class="p-3">
            <div class="flex items-center mb-4">
              <span
                :class="getAliasStatus(aliasToView).backgroundColour"
                class="outline-none alias-status-background rounded-full flex items-center justify-center mx-1.5"
                :title="getAliasStatus(aliasToView).status"
                tabindex="-1"
              >
                <span
                  :class="getAliasStatus(aliasToView).foregroundColour"
                  class="alias-status-foreground rounded-full"
                ></span>
              </span>

              <span class="block break-words w-full">
                <div
                  class="break-words cursor-pointer"
                  title="Click To Copy Alias"
                  v-clipboard="() => aliasToView.email"
                  v-clipboard:success="aliasCopied"
                >
                  <span class="font-semibold text-indigo-800 dark:text-indigo-100">{{
                    aliasToView.local_part
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
                    class="grow text-sm appearance-none bg-white border text-grey-700 focus:outline-none rounded-sm px-2 py-1 shadow dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
                    :class="
                      aliasDescriptionToEdit.length > 200 ? 'border-red-500' : 'border-transparent'
                    "
                    placeholder="Add description"
                    tabindex="0"
                    autofocus
                  />
                  <cross
                    class="inline-block w-6 h-6 text-red-300 cursor-pointer flex-none"
                    @click="cancelEditDescription"
                  />
                  <check
                    class="inline-block w-6 h-6 text-cyan-500 cursor-pointer flex-none"
                    @click="editAliasDescription(aliasToView)"
                  />
                </div>
                <div v-else-if="aliasToView.description" class="flex items-center">
                  <span
                    class="inline-block break-words cursor-pointer text-grey-400 text-sm py-1 border border-transparent dark:text-grey-50"
                    title="Click To Copy Description"
                    v-clipboard="() => aliasToView.description"
                    v-clipboard:success="aliasCopied"
                  >
                    {{ aliasToView.description }}
                  </span>
                  <edit
                    class="inline-block w-6 h-6 ml-2 text-grey-300 cursor-pointer flex-none dark:text-grey-200"
                    @click="
                      ;(aliasToViewDescriptionEditing = true),
                        (aliasDescriptionToEdit = aliasToView.description)
                    "
                  />
                </div>
                <div v-else>
                  <span
                    class="inline-block text-grey-300 dark:text-grey-200 text-sm cursor-pointer py-1 border border-transparent"
                    @click=";(aliasToViewDescriptionEditing = true), (aliasDescriptionToEdit = '')"
                    >Add description</span
                  >
                </div>
              </span>
            </div>
            <dl class="grid gap-3 grid-cols-2">
              <div class="relative bg-white dark:bg-grey-700 p-3 shadow rounded-lg overflow-hidden">
                <dt>
                  <div class="absolute bg-indigo-500 rounded-md p-3">
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
                    class="text-sm text-grey-500 dark:text-grey-50 leading-none"
                    :title="$filters.formatDateTime(aliasToView.last_forwarded)"
                  >
                    {{ $filters.timeAgoHuman(aliasToView.last_forwarded) }}
                  </p>
                </dd>
              </div>
              <div class="relative bg-white dark:bg-grey-700 p-3 shadow rounded-lg overflow-hidden">
                <dt>
                  <div class="absolute bg-indigo-500 rounded-md p-3">
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
                    class="text-sm text-grey-500 dark:text-grey-50 leading-none"
                    :title="$filters.formatDateTime(aliasToView.last_replied)"
                  >
                    {{ $filters.timeAgoHuman(aliasToView.last_replied) }}
                  </p>
                </dd>
              </div>
              <div class="relative bg-white dark:bg-grey-700 p-3 shadow rounded-lg overflow-hidden">
                <dt>
                  <div class="absolute bg-indigo-500 rounded-md p-3">
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
                    class="text-sm text-grey-500 dark:text-grey-50 leading-none"
                    :title="$filters.formatDateTime(aliasToView.last_sent)"
                  >
                    {{ $filters.timeAgoHuman(aliasToView.last_sent) }}
                  </p>
                </dd>
              </div>
              <div class="relative bg-white dark:bg-grey-700 p-3 shadow rounded-lg overflow-hidden">
                <dt>
                  <div class="absolute bg-indigo-500 rounded-md p-3">
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
                    class="text-sm text-grey-500 dark:text-grey-50 leading-none"
                    :title="$filters.formatDateTime(aliasToView.last_blocked)"
                  >
                    {{ $filters.timeAgoHuman(aliasToView.last_blocked) }}
                  </p>
                </dd>
              </div>
            </dl>
          </div>
          <div
            class="p-3 uppercase shadow text-sm tracking-wide text-grey-600 bg-white dark:bg-grey-700 dark:text-white"
          >
            Actions
          </div>
          <button
            @click="openSendFromAlias"
            class="w-full text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
          >
            Send from this alias
          </button>
          <div v-if="!aliasToView.deleted_at">
            <button
              v-if="aliasToView.active"
              @click="deactivateAlias(aliasToView)"
              class="w-full text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
              :class="deactivateAliasLoading ? 'cursor-not-allowed' : ''"
              :disabled="deactivateAliasLoading"
            >
              Deactivate this alias
              <loader class="h-5 w-5" v-if="deactivateAliasLoading" />
            </button>
            <button
              v-else
              @click="activateAlias(aliasToView)"
              class="w-full text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
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
            class="w-full text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
          >
            Restore this alias
          </button>
          <button
            v-else
            @click="deleteAliasModalOpen = true"
            class="w-full text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
          >
            Delete this alias
          </button>
          <button
            @click="forgetAliasModalOpen = true"
            class="w-full text-left p-3 focus:outline-none hover:bg-indigo-50 border-b border-grey-200 dark:hover:bg-grey-800"
          >
            Forget this alias
          </button>
        </div>
        <div v-else-if="selected == 'SendFromAlias'">
          <!-- Send From Alias Tab -->
          <div
            class="p-3 uppercase shadow text-sm tracking-wide text-grey-600 bg-white flex justify-between dark:bg-grey-700 dark:text-white"
          >
            Send From Alias
            <button
              @click="selected = 'ViewAlias'"
              class="back-icon text-grey-600 hover:bg-grey-50 -m-3 flex justify-center items-center focus:outline-none dark:text-white dark:hover:bg-grey-800"
            >
              <chevron-left />
            </button>
          </div>

          <div class="p-3">
            <p class="text-grey-700 dark:text-white mb-2">
              Use this to automatically create the correct address to send an email to in order to
              send an email from this alias.
            </p>

            <div
              class="flex items-center justify-center rounded-sm text-sm border-t-4 text-indigo-800 border-indigo-600 bg-indigo-50 p-2 mb-4"
              role="alert"
            >
              <information class="text-indigo-800 mr-2 flex-none" />
              You must send the email from a verified recipient on your addy.io account.
            </div>

            <label for="send_from_alias" class="block text-grey-700 dark:text-grey-50 mb-1">
              Alias to send from:
            </label>
            <input
              v-model="aliasToView.email"
              id="send_from_alias"
              type="text"
              class="appearance-none shadow bg-white rounded-sm w-full p-2 text-grey-700 focus:ring mb-4 dark:bg-grey-600 dark:text-white"
              disabled
            />
            <label
              for="send_from_alias_destination"
              class="block text-grey-700 dark:text-grey-50 mb-1"
            >
              Email destination:
            </label>
            <input
              v-model="sendFromAliasDestination"
              @keyup.enter="displaySendFromAddress"
              id="send_from_alias_destination"
              type="text"
              class="appearance-none shadow bg-white rounded-sm w-full p-2 text-grey-700 focus:ring mb-4 dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
              placeholder="Enter destination email"
            />

            <div v-if="sendFromAliasEmailToSendTo">
              <p class="mb-1 text-grey-700 dark:text-white">Send your message to this email:</p>
              <div
                v-clipboard="() => sendFromAliasEmailToSendTo"
                v-clipboard:success="setSendFromAddressCopied"
                class="flex items-center justify-between cursor-pointer text-sm border-t-4 rounded-sm text-green-800 border-green-600 bg-green-100 p-2 mb-4"
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
                class="flex items-center justify-between cursor-pointer text-sm border-t-4 rounded-sm text-green-800 border-green-600 bg-green-100 p-2 mb-4"
                role="alert"
                title="Click To Open Mail Application"
              >
                Click to open mail application
              </a>
            </div>
            <button
              @click="displaySendFromAddress"
              class="px-3 py-2 w-full text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
            >
              Show Address
            </button>
          </div>
        </div>
        <div v-else>
          <!-- Create Alias Tab -->
          <div
            class="p-3 uppercase shadow text-sm tracking-wide text-grey-600 bg-white flex justify-between dark:bg-grey-700 dark:text-white"
          >
            Create A New Alias
            <button
              @click="selected = 'Aliases'"
              class="back-icon text-grey-600 hover:bg-grey-50 -m-3 flex justify-center items-center focus:outline-none dark:text-white dark:hover:bg-grey-800"
            >
              <chevron-left />
            </button>
          </div>
          <div class="p-3">
            <div v-if="newAlias">
              <p for="alias_domain" class="block text-grey-700 dark:text-white mb-1">
                {{ autoCopyNewAlias ? 'This is' : 'Click To Copy' }} Your New Alias:
              </p>
              <div
                v-clipboard="() => newAlias"
                v-clipboard:success="setNewAliasCopied"
                class="flex items-center justify-between cursor-pointer text-sm border-t-4 rounded-sm text-green-800 border-green-600 bg-green-100 p-2 mb-4"
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

            <label for="alias_domain" class="block text-grey-700 dark:text-grey-50 mb-1">
              Alias Domain:
            </label>
            <div class="block relative w-full mb-4">
              <select
                v-model="domain"
                id="alias_domain"
                class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white"
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
                  class="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
                  />
                </svg>
              </div>
            </div>
            <label for="alias_format" class="block text-grey-700 dark:text-grey-50 mb-1">
              Alias Format:
            </label>
            <div class="block relative w-full mb-4">
              <select
                v-model="aliasFormat"
                id="alias_format"
                class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:ring dark:bg-grey-600 dark:text-white dark:placeholder-grey-100"
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
                  class="fill-current h-4 w-4"
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
              <label for="alias_local_part" class="block text-grey-700 dark:text-grey-50 mb-1">
                Alias Local Part:
              </label>
              <input
                v-model="localPart"
                id="alias_local_part"
                type="text"
                placeholder="Enter local part"
                class="appearance-none shadow bg-white rounded-sm w-full p-2 text-grey-700 focus:ring dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
                :class="localPartSuggestions.length ? '' : 'mb-4'"
              />
              <p
                v-if="localPartSuggestions.length"
                class="text-sm mt-1 mb-3 text-grey-600 dark:text-grey-100"
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
            <label for="alias_description" class="block text-grey-700 dark:text-grey-50 mb-1">
              Description: (optional)
            </label>
            <input
              v-model="description"
              id="alias_description"
              type="text"
              :placeholder="currentTabHostname"
              autofocus="autofocus"
              class="appearance-none shadow bg-white rounded-sm w-full p-2 text-grey-700 focus:ring dark:bg-grey-600 dark:text-white dark:placeholder-grey-200"
            />
            <p class="text-xs mt-1 mb-3 text-grey-600 dark:text-grey-100">
              If left empty the description will default to the current tab's hostname.
            </p>

            <label for="alias_recipient_ids" class="block text-grey-700 dark:text-grey-50 mb-1">
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
              class="mt-4 px-3 py-2 w-full text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
              :class="createAliasLoading ? 'cursor-not-allowed' : ''"
              :disabled="createAliasLoading"
            >
              Create Alias
              <loader class="h-5 w-5" v-if="createAliasLoading" />
            </button>
          </div>
        </div>
      </content>

      <nav class="-mb-px flex h-14 w-full absolute bottom-0 bg-indigo-900" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          :title="tab.name"
          @click="selected = tab.name"
          :class="[
            selected == tab.name
              ? 'border-white text-white'
              : 'border-transparent text-indigo-100 hover:text-white',
            'group w-1/2 inline-flex justify-center items-center py-4 px-1 border-b-2 font-medium text-sm',
          ]"
          :aria-current="selected == tab.name ? 'page' : undefined"
        >
          <component
            :is="tab.icon"
            :class="[
              selected == tab.name ? 'text-white' : 'text-indigo-100 group-hover:text-white',
              '-ml-0.5 mr-2 h-5 w-5',
            ]"
            aria-hidden="true"
          />
          <span>{{ tab.name }}</span>
        </button>
      </nav>
    </div>

    <Modal :open="restoreAliasModalOpen" @close="restoreAliasModalOpen = false" class="px-3">
      <div class="w-full bg-white dark:bg-grey-800 rounded-md shadow-2xl p-4">
        <div>
          <div
            class="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-cyan-50"
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
            class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-cyan-400 text-base font-medium text-cyan-900 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-300"
            @click="restoreAlias(aliasToView)"
            :class="restoreAliasLoading ? 'cursor-not-allowed' : ''"
            :disabled="restoreAliasLoading"
          >
            Restore
            <loader class="h-5 w-5" v-if="restoreAliasLoading" />
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-grey-300 px-4 py-2 bg-white text-base font-medium text-grey-700 shadow-sm hover:bg-grey-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-grey-500 dark:text-white dark:border-grey-600"
            @click="restoreAliasModalOpen = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>

    <Modal :open="deleteAliasModalOpen" @close="deleteAliasModalOpen = false" class="px-3">
      <div class="w-full bg-white dark:bg-grey-800 rounded-md shadow-2xl p-4">
        <div>
          <div
            class="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100"
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
            class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            @click="deleteAlias(aliasToView)"
            :class="deleteAliasLoading ? 'cursor-not-allowed' : ''"
            :disabled="deleteAliasLoading"
          >
            Delete
            <loader class="h-5 w-5" v-if="deleteAliasLoading" />
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-grey-300 px-4 py-2 bg-white text-base font-medium text-grey-700 shadow-sm hover:bg-grey-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-grey-500 dark:text-white dark:border-grey-600"
            @click="deleteAliasModalOpen = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>

    <Modal :open="forgetAliasModalOpen" @close="forgetAliasModalOpen = false" class="px-3">
      <div class="w-full bg-white dark:bg-grey-800 rounded-md shadow-2xl p-4">
        <div>
          <div
            class="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100"
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
                class="text-sm text-grey-500 dark:text-white mt-2"
              >
                <b>Note:</b> This alias uses a shared domain so it can <b>never be restored</b> or
                used again so make sure you are certain. Once forgotten, this alias will
                <b>reject any emails sent to it</b>
              </p>
              <p v-else class="text-sm text-grey-500 dark:text-white mt-2">
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
            class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            @click="forgetAlias(aliasToView)"
            :class="forgetAliasLoading ? 'cursor-not-allowed' : ''"
            :disabled="forgetAliasLoading"
          >
            Forget
            <loader class="h-5 w-5" v-if="forgetAliasLoading" />
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-grey-300 px-4 py-2 bg-white text-base font-medium text-grey-700 shadow-sm hover:bg-grey-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-grey-500 dark:text-white dark:border-grey-600"
            @click="forgetAliasModalOpen = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>

    <Modal :open="logoutModalOpen" @close="logoutModalOpen = false" class="px-3">
      <div class="w-full bg-white dark:bg-grey-800 rounded-md shadow-2xl p-4">
        <div>
          <div
            class="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-cyan-50"
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
            class="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-cyan-400 text-base font-medium text-cyan-900 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-300"
            @click="logout()"
            :class="logoutLoading ? 'cursor-not-allowed' : ''"
            :disabled="logoutLoading"
          >
            Logout
            <loader class="h-5 w-5" v-if="logoutLoading" />
          </button>
          <button
            type="button"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-grey-300 px-4 py-2 bg-white text-base font-medium text-grey-700 shadow-sm hover:bg-grey-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-grey-500 dark:text-white dark:border-grey-600"
            @click="logoutModalOpen = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>

    <notifications position="bottom center" width="100%" />
  </div>
</template>

<script>
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
import debounce from 'lodash/debounce'
import Modal from './../components/Modal.vue'
import Multiselect from '@vueform/multiselect'

export default {
  data() {
    return {
      extensionVersion: null,
      tabs: [
        { name: 'Aliases', icon: 'AtSign' },
        { name: 'Settings', icon: 'Cog' },
      ],
      selected: 'Aliases',
      tokenInput: '',
      apiToken: '',
      instanceInput: 'https://app.addy.io',
      instance: '',
      changeInstance: false,
      searchInput: '',
      currentTabHostname: '',
      localPartSuggestions: [],
      description: '',
      localPart: '',
      localPartAutoFill: {},
      sendFromAliasDestination: '',
      sendFromAliasEmailToSendTo: '',
      domainOptionsLoading: false,
      recipientsLoading: false,
      createAliasLoading: false,
      activateAliasLoading: false,
      deactivateAliasLoading: false,
      deleteAliasLoading: false,
      forgetAliasLoading: false,
      restoreAliasLoading: false,
      logoutLoading: false,
      editAliasDescriptionLoading: false,
      deleteAliasModalOpen: false,
      forgetAliasModalOpen: false,
      restoreAliasModalOpen: false,
      logoutModalOpen: false,
      aliasToViewDescriptionEditing: false,
      aliasDescriptionToEdit: '',
      newAlias: '',
      newAliasCopied: false,
      sendFromAddressCopied: false,
      clipboardButtonText: 'Copy',
      error: '',
      domain: '',
      domainOptions: [],
      recipients: [],
      createAliasRecipientIds: [],
      aliasFormat: 'random_characters',
      aliasFormatOptions: [
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
      ],
      aliases: [],
      showAliasStatus: 'all',
      aliasesTitle: 'Aliases',
      aliasesHaveNextPage: false,
      aliasesMeta: {},
      aliasesCurrentPage: 1,
      getAliasesLoading: false,
      showMoreAliasesLoading: false,
      aliasToView: {},
      theme: 'system',
      autoCopyNewAlias: true,
      showSearchSuggestions: true,
      autoFillLocalPart: '',
      defaultAliasSort: 'created_at',
      defaultAliasSortDir: '-',
      extensionUrl:
        'https://chrome.google.com/webstore/detail/addyio-anonymous-email-fo/iadbdpnoknmbdeolbapdackdcogdmjpe',
      aliasSortOptions: [
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
          value: 'updated_at',
          label: 'Updated At',
        },
      ],
      defaultSelected: 'Aliases',
      abortController: null,
      sharedDomains: ['anonaddy.me', '4wrd.cc', 'mailer.me', 'addymail.com', 'addy.io', 'addy.to'],
    }
  },
  components: {
    Loader,
    Plus,
    AtSign,
    Cog,
    Clipboard,
    Cross,
    Edit,
    Check,
    Block,
    Forward,
    Reply,
    Sent,
    ChevronLeft,
    Exclamation,
    ExternalLink,
    Heart,
    Information,
    Modal,
    Multiselect,
  },
  async mounted() {
    this.apiToken = await this.getApiToken()
    this.instance = await this.getInstance()
    if (this.instance == 'https://app.anonaddy.com') {
      this.instance = 'https://app.addy.io'
    }
    if (this.apiToken && !this.instance) {
      this.instance = 'https://app.addy.io'
    }
    this.domainOptions = await this.getDomainOptions()
    this.recipients = await this.getRecipients()
    this.domain = await this.getDomain()
    this.aliasFormat = await this.getAliasFormat()
    this.showAliasStatus = await this.getShowAliasStatus()
    this.theme = await this.getTheme()
    // Force update any old theme values
    if (this.theme == '') {
      this.theme = 'light'
    }
    this.autoCopyNewAlias = await this.getAutoCopyNewAlias()
    this.showSearchSuggestions = await this.getShowSearchSuggestions()
    this.autoFillLocalPart = await this.getAutoFillLocalPart()
    this.defaultAliasSort = await this.getDefaultAliasSort()
    this.defaultAliasSortDir = await this.getDefaultAliasSortDir()
    this.defaultSelected = await this.getDefaultSelected()
    this.selected = this.defaultSelected

    if (this.sharedDomainSelected && this.aliasFormat === 'custom' && !this.selfHosting) {
      this.aliasFormat = 'random_characters'
    }

    this.extensionWindow = await this.getExtensionWindow()
    this.currentTabHostname = await this.getCurrentTabHostname()

    let manifest = this.$browser.runtime.getManifest()

    // Check if Gecko based
    if (/rv:([^\)]+)\) Gecko\/\d{8}/.test(navigator.userAgent)) {
      this.extensionUrl = 'https://addons.mozilla.org/en-GB/firefox/addon/addy_io/'
    }

    if (manifest) {
      this.extensionVersion = manifest.version
    }

    if (this.apiToken) {
      document.getElementById('search').focus()
      this.getAliases(true)

      if (this.recipients.length == 0) {
        this.getRecipientsRequest()
      }
    }
  },
  watch: {
    apiToken: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ apiToken: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    instance: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ instance: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    domainOptions: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ domainOptions: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    recipients: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ recipients: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    domain: {
      async handler(val) {
        if (this.sharedDomainSelected) {
          this.aliasFormat = 'random_characters'
        }
        try {
          await this.$browser.storage.sync.set({ domain: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    aliasFormat: {
      async handler(val) {
        // If alias format changes to custom and autoFillLocalPart is enabled then update localPart
        if (val === 'custom' && this.autoFillLocalPart !== '') {
          this.localPart = this.localPartAutoFill[this.autoFillLocalPart]
        } else {
          this.localPart = ''
        }

        try {
          await this.$browser.storage.sync.set({ aliasFormat: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    showAliasStatus: {
      async handler(val, oldVal) {
        try {
          await this.$browser.storage.sync.set({ showAliasStatus: val })
        } catch (error) {
          console.log(error)
        }

        if (!this.aliases.length && oldVal === 'all') {
          // No need to make another request if there are no aliases when the status is 'all'
        } else {
          this.aliasesCurrentPage = 1
          this.getAliases()
        }
      },
    },
    theme: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ theme: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    autoCopyNewAlias: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ autoCopyNewAlias: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    showSearchSuggestions: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ showSearchSuggestions: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    autoFillLocalPart: {
      async handler(val) {
        if (this.aliasFormat === 'custom' && val !== '') {
          this.localPart = this.localPartAutoFill[val]
        }
        try {
          await this.$browser.storage.sync.set({ autoFillLocalPart: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    defaultAliasSort: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ defaultAliasSort: val })
        } catch (error) {
          console.log(error)
        }

        if (this.aliases.length) {
          this.aliasesCurrentPage = 1
          this.getAliases(true)
        }
      },
    },
    defaultAliasSortDir: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ defaultAliasSortDir: val })
        } catch (error) {
          console.log(error)
        }

        if (this.aliases.length) {
          this.aliasesCurrentPage = 1
          this.getAliases(true)
        }
      },
    },
    defaultSelected: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ defaultSelected: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    tokenInput: function () {
      this.error = ''
    },
    description: function () {
      this.error = ''
    },
    localPart: function () {
      this.error = ''
    },
    selected: function (val) {
      this.error = ''
      this.cancelEditDescription()
    },
    searchInput: {
      handler: debounce(function (val) {
        if (val == '' || val.length > 2) {
          // If there is already a request loading then abort it
          if (this.getAliasesLoading || this.showMoreAliasesLoading) {
            this.abortController.abort()
            this.showMoreAliasesLoading = false
          }
          this.aliasesCurrentPage = 1
          this.getAliases()
        }
      }, 300),
    },
    aliasToViewDescriptionEditing: {
      handler: debounce(function (val) {
        if (val === true) {
          document.getElementById('description-input').focus()
        }
      }, 100),
    },
  },
  computed: {
    subscribed() {
      return Object.values(this.domainOptions).length > 3
    },
    selfHosting() {
      return !['https://app.anonaddy.com', 'https://app.addy.io'].includes(this.instance)
    },
    subscribedOrSelfHosting() {
      return this.subscribed || this.selfHosting
    },
    aliasToViewHasSharedDomain() {
      if (!this.aliasToView.domain) {
        return false
      }
      return this.sharedDomains.includes(this.aliasToView.domain)
    },
    sharedDomainSelected() {
      return this.sharedDomains.includes(this.domain)
    },
    showDeletedAliases() {
      if (this.showAliasStatus === 'all') {
        return 'with'
      } else if (this.showAliasStatus === 'deleted') {
        return 'only'
      } else {
        return 'without'
      }
    },
    showActiveAliases() {
      if (this.showAliasStatus === 'inactive') {
        return false
      } else if (this.showAliasStatus === 'active') {
        return true
      } else {
        return ''
      }
    },
    activeTheme() {
      // If the user has chosen system theme then return this here
      if (this.theme === 'system') {
        // Detect system theme
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark'
        } else {
          return 'light'
        }
      }

      // light or dark
      return this.theme
    },
  },
  methods: {
    popout() {
      let href = this.extensionWindow.location.href

      if (
        typeof this.$browser !== 'undefined' &&
        this.$browser.windows &&
        this.$browser.windows.create
      ) {
        if (href.indexOf('?uilocation=') > -1) {
          href = href
            .replace('uilocation=popup', 'uilocation=popout')
            .replace('uilocation=tab', 'uilocation=popout')
            .replace('uilocation=sidebar', 'uilocation=popout')
        } else {
          const hrefParts = href.split('#')
          href =
            hrefParts[0] + '?uilocation=popout' + (hrefParts.length > 0 ? '#' + hrefParts[1] : '')
        }

        const bodyRect = document.querySelector('body').getBoundingClientRect()
        this.$browser.windows.create({
          url: href,
          type: 'popup',
          width: Math.round(bodyRect.width ? bodyRect.width + 60 : 375),
          height: Math.round(bodyRect.height || 600),
        })

        this.$browser.tabs.update({ active: true }).finally(this.extensionWindow.close)
      } else if (
        typeof this.$browser !== 'undefined' &&
        this.$browser.tabs &&
        this.$browser.tabs.create
      ) {
        href = href
          .replace('uilocation=popup', 'uilocation=tab')
          .replace('uilocation=popout', 'uilocation=tab')
          .replace('uilocation=sidebar', 'uilocation=tab')
        this.$browser.tabs.create({
          url: href,
        })
      }
    },
    async getApiToken() {
      try {
        var result = await this.$browser.storage.sync.get({ apiToken: '' })
        return result.apiToken
      } catch (error) {
        console.log(error)
      }
    },
    async getInstance() {
      try {
        var result = await this.$browser.storage.sync.get({ instance: '' })
        return result.instance
      } catch (error) {
        console.log(error)
      }
    },
    async getDomainOptions() {
      try {
        var result = await this.$browser.storage.sync.get({ domainOptions: [''] })
        return result.domainOptions
      } catch (error) {
        console.log(error)
      }
    },
    async getRecipients() {
      try {
        var result = await this.$browser.storage.sync.get({ recipients: [''] })
        return result.recipients
      } catch (error) {
        console.log(error)
      }
    },
    async getDomain() {
      try {
        var result = await this.$browser.storage.sync.get({ domain: '' })
        return result.domain
      } catch (error) {
        console.log(error)
      }
    },
    async getAliasFormat() {
      try {
        var result = await this.$browser.storage.sync.get({ aliasFormat: 'random_characters' })
        return result.aliasFormat
      } catch (error) {
        console.log(error)
      }
    },
    async getShowAliasStatus() {
      try {
        var result = await this.$browser.storage.sync.get({ showAliasStatus: 'all' })
        return result.showAliasStatus
      } catch (error) {
        console.log(error)
      }
    },
    async getTheme() {
      try {
        var result = await this.$browser.storage.sync.get({ theme: 'system' })
        return result.theme
      } catch (error) {
        console.log(error)
      }
    },
    async getAutoCopyNewAlias() {
      try {
        var result = await this.$browser.storage.sync.get({ autoCopyNewAlias: true })
        return result.autoCopyNewAlias
      } catch (error) {
        console.log(error)
      }
    },
    async getShowSearchSuggestions() {
      try {
        var result = await this.$browser.storage.sync.get({ showSearchSuggestions: true })
        return result.showSearchSuggestions
      } catch (error) {
        console.log(error)
      }
    },
    async getAutoFillLocalPart() {
      try {
        var result = await this.$browser.storage.sync.get({ autoFillLocalPart: '' })
        return result.autoFillLocalPart
      } catch (error) {
        console.log(error)
      }
    },
    async getDefaultAliasSort() {
      try {
        var result = await this.$browser.storage.sync.get({ defaultAliasSort: 'created_at' })
        return result.defaultAliasSort
      } catch (error) {
        console.log(error)
      }
    },
    async getDefaultAliasSortDir() {
      try {
        var result = await this.$browser.storage.sync.get({ defaultAliasSortDir: '-' })
        return result.defaultAliasSortDir
      } catch (error) {
        console.log(error)
      }
    },
    async getDefaultSelected() {
      try {
        var result = await this.$browser.storage.sync.get({ defaultSelected: 'Aliases' })
        return result.defaultSelected
      } catch (error) {
        console.log(error)
      }
    },
    async getCurrentTabHostname() {
      try {
        var result = await this.$browser.tabs.query({ active: true, currentWindow: true })
        if (result[0].url && this.extensionWindow) {
          var url = new URL(result[0].url)

          let parsed = window.psl.parse(url.hostname)
          if (parsed.sld) {
            this.localPartSuggestions.push(parsed.sld)
            this.localPartAutoFill.sld = parsed.sld
          }
          if (parsed.domain) {
            this.localPartSuggestions.push(parsed.domain)
            this.localPartAutoFill.domain = parsed.domain
          }
          if (url.hostname && url.hostname !== parsed.domain) {
            this.localPartSuggestions.push(url.hostname)
            this.localPartAutoFill.full = url.hostname
          }

          if (url.hostname === parsed.domain) {
            this.localPartAutoFill.full = url.hostname
          }

          // Also add a suggestion with a random alphanumeric string appended
          if (parsed.sld) {
            let random = parsed.sld + '.' + Math.random().toString(36).substring(2, 5)
            this.localPartSuggestions.push(random)
            this.localPartAutoFill.random = random
          }

          // Set the alias local part if the format is custom and autoFill is enabled
          if (this.aliasFormat === 'custom' && this.autoFillLocalPart !== '') {
            this.localPart = this.localPartAutoFill[this.autoFillLocalPart]
          }

          return url.hostname
        }
        return null
      } catch (error) {
        console.log(error)
      }
    },
    async getExtensionWindow() {
      try {
        let result = await this.$browser.extension.getViews({ type: 'popup' })

        return result[0]
      } catch (error) {
        console.log(error)
      }
    },
    async getAliases(calledFromMounted = false) {
      this.error = ''

      // To prevent overriding the users choice of tab to display on extension open
      if (!calledFromMounted) {
        this.selected = 'Aliases'
      }

      if (this.aliasesCurrentPage == 1) {
        this.getAliasesLoading = true
      }

      this.abortController = new AbortController()
      const signal = this.abortController.signal

      try {
        const response = await fetch(
          `${this.instance}/api/v1/aliases?filter[deleted]=${
            this.showDeletedAliases
          }&filter[active]=${this.showActiveAliases}&filter[search]=${
            this.searchInput.length > 2 ? this.searchInput : ''
          }&sort=${this.defaultAliasSortDir}${this.defaultAliasSort}&page[number]=${
            this.aliasesCurrentPage
          }&page[size]=10`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Requested-From': 'browser-extension',
              Authorization: `Bearer ${this.apiToken}`,
            },
            signal: signal,
          }
        )

        if (response.status === 200) {
          let data = await response.json()

          if (this.aliasesCurrentPage > 1) {
            this.aliases = this.aliases.concat(data.data)
          } else {
            this.aliases = data.data
          }

          if (this.searchInput) {
            this.aliasesTitle = `Search Results (${data.meta.total} `

            this.aliasesTitle += data.meta.total === 1 ? 'match)' : 'matches)'
          } else {
            this.aliasesTitle = 'Aliases'
          }

          if (data.links) {
            this.aliasesHaveNextPage = data.links.next ? true : false
          } else {
            this.aliasesHaveNextPage = false
          }

          this.aliasesMeta = data.meta
        } else if (response.status === 401) {
          this.logout(true)
          this.error =
            "Unauthenticated, your API key has either expired or been revoked. You've been automatically logged out."
        } else {
          this.error = 'An Error Has Occurred'
        }

        if (this.aliasesCurrentPage == 1) {
          this.getAliasesLoading = false
        } else {
          this.showMoreAliasesLoading = false
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          if (this.aliasesCurrentPage == 1) {
            this.getAliasesLoading = false
          } else {
            this.showMoreAliasesLoading = false
          }

          this.error = 'An Error Has Occurred'
          console.log(error)
        }
      }
    },
    async getAliasDomainOptions(token, instance) {
      this.error = ''

      if (!token) {
        return (this.error = 'An API key is required to login!')
      }

      if (!this.validToken(token)) {
        return (this.error =
          "Invalid API key format, please check that you've entered it correctly!")
      }

      if (token.length < 40) {
        return (this.error =
          "That API key is too short, please check that you've entered it correctly!")
      }

      if (token.length > 60) {
        return (this.error =
          "That API key is too long, please check that you've entered it correctly!")
      }

      if (!this.validInstance(instance) && this.changeInstance) {
        return (this.error =
          'Please enter a valid URL for the instance with no trailing slash, e.g. "https://app.example.com"')
      }

      this.domainOptionsLoading = true

      try {
        const response = await fetch(`${instance}/api/v1/domain-options`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-From': 'browser-extension',
            Authorization: `Bearer ${token}`,
          },
        })

        this.domainOptionsLoading = false

        if (response.status === 401) {
          if (!this.apiToken) {
            this.error =
              "Error, invalid API key, please check that you've entered it correctly and that you have the correct instance (if self-hosting)"
          } else {
            this.logout(true)
            this.error =
              "Unauthenticated, your API key has either expired or been revoked. You've been automatically logged out."
          }
        } else if (response.status === 200) {
          if (!this.instance) {
            this.instance = instance
          }

          if (!this.apiToken) {
            this.apiToken = token
            this.getAliases()
            this.getRecipientsRequest()

            this.success('Logged in successfully')
          } else {
            this.success('Domains and defaults refreshed')
          }

          let data = await response.json()
          this.domainOptions = data.data
          this.domain = data.defaultAliasDomain ? data.defaultAliasDomain : data.data[0]
          this.aliasFormat = data.defaultAliasFormat ? data.defaultAliasFormat : 'random_characters'

          if (this.sharedDomainSelected && this.aliasFormat === 'custom' && !this.selfHosting) {
            this.aliasFormat = 'random_characters'
          }
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.domainOptionsLoading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }
    },
    async getRecipientsRequest() {
      this.recipientsLoading = true

      try {
        const response = await fetch(`${this.instance}/api/v1/recipients?filter[verified]=true`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-From': 'browser-extension',
            Authorization: `Bearer ${this.apiToken}`,
          },
        })

        let data = await response.json()

        this.recipients = data.data.map(function (recipient) {
          return {
            id: recipient.id,
            email: recipient.email,
          }
        })

        if (this.selected == 'Settings') {
          this.success('Recipients refreshed')
        }

        this.recipientsLoading = false
      } catch (error) {
        this.recipientsLoading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }
    },
    async createAlias() {
      // Validate alias local part
      if (
        !this.sharedDomainSelected &&
        this.aliasFormat === 'custom' &&
        !this.validLocalPart(this.localPart)
      ) {
        return (this.error = 'Valid local part required')
      }

      if (this.description.length > 200) {
        return (this.error = 'Description cannot be more than 200 characters')
      }

      if (!Object.values(this.domainOptions).find((domain) => domain === this.domain)) {
        return (this.error = 'Invalid alias domain name')
      }

      this.createAliasLoading = true
      this.error = ''

      try {
        const response = await fetch(`${this.instance}/api/v1/aliases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-From': 'browser-extension',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({
            domain: this.domain,
            local_part: this.localPart,
            description: this.description ? this.description : this.currentTabHostname,
            format: this.aliasFormat,
            recipient_ids: this.createAliasRecipientIds,
          }),
        })

        this.createAliasLoading = false

        if (response.status === 403) {
          this.error = 'You have reached your active shared domain alias limit'
        } else if (response.status === 429) {
          this.error = 'You have reached your hourly limit for creating new aliases'
        } else if (response.status === 422) {
          let error = await response.json()
          this.error = error.errors[Object.keys(error.errors)[0]][0]
        } else if (response.status === 401) {
          this.logout(true)
          this.error =
            "Unauthenticated, your API key has either expired or been revoked. You've been automatically logged out."
        } else if (response.status === 201) {
          let data = await response.json()
          this.localPart = ''
          this.description = ''
          this.createAliasRecipientIds = []
          this.newAlias = data.data.email

          // If auto copy is enabled
          if (this.autoCopyNewAlias) {
            this.$clipboard(data.data.email)
            this.success('New alias copied to clipboard')
          }

          this.aliases = [data.data].concat(this.aliases)
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.createAliasLoading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }
    },
    async editAliasDescription(alias) {
      this.editAliasDescriptionLoading = true

      try {
        const response = await fetch(`${this.instance}/api/v1/aliases/${alias.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-From': 'browser-extension',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({
            description: this.aliasDescriptionToEdit,
          }),
        })

        this.editAliasDescriptionLoading = false

        if (response.status === 200) {
          alias.description = this.aliasDescriptionToEdit
          this.aliasDescriptionToEdit = ''
          this.aliasToViewDescriptionEditing = false
          this.success('Alias description updated successfully')
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.editAliasDescriptionLoading = false
        this.aliasDescriptionToEdit = ''
        this.aliasToViewDescriptionEditing = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }
    },
    async activateAlias(alias) {
      this.activateAliasLoading = true

      try {
        const response = await fetch(`${this.instance}/api/v1/active-aliases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-From': 'browser-extension',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({
            id: alias.id,
          }),
        })

        this.activateAliasLoading = false

        if (response.status === 403) {
          this.error = 'You have reached your active shared domain alias limit'
        } else if (response.status === 200) {
          alias.active = true
          this.success('Alias activated successfully')
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.activateAliasLoading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }
    },
    async deactivateAlias(alias) {
      this.deactivateAliasLoading = true

      try {
        const response = await fetch(`${this.instance}/api/v1/active-aliases/${alias.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-From': 'browser-extension',
            Authorization: `Bearer ${this.apiToken}`,
          },
        })

        this.deactivateAliasLoading = false

        if (response.status === 204) {
          alias.active = false
          this.success('Alias deactivated successfully')
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.deactivateAliasLoading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }
    },
    async deleteAlias(alias) {
      this.deleteAliasLoading = true

      try {
        const response = await fetch(`${this.instance}/api/v1/aliases/${alias.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-From': 'browser-extension',
            Authorization: `Bearer ${this.apiToken}`,
          },
        })

        this.deleteAliasLoading = false

        if (response.status === 204) {
          alias.deleted_at = this.$filters.nowToString()
          alias.active = false
          this.success('Alias deleted successfully')
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.deleteAliasLoading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }

      this.deleteAliasModalOpen = false
    },
    async forgetAlias(alias) {
      this.forgetAliasLoading = true

      try {
        const response = await fetch(`${this.instance}/api/v1/aliases/${alias.id}/forget`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-From': 'browser-extension',
            Authorization: `Bearer ${this.apiToken}`,
          },
        })

        this.forgetAliasLoading = false

        if (response.status === 204) {
          this.aliases = this.aliases.filter((a) => a.id !== alias.id)
          this.success('Alias forgotten successfully')
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.forgetAliasLoading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }

      this.selected = 'Aliases'
      this.forgetAliasModalOpen = false
    },
    async restoreAlias(alias) {
      this.retoreAliasLoading = true

      try {
        const response = await fetch(`${this.instance}/api/v1/aliases/${alias.id}/restore`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Requested-From': 'browser-extension',
            Authorization: `Bearer ${this.apiToken}`,
          },
        })

        this.retoreAliasLoading = false

        if (response.status === 200) {
          alias.deleted_at = null
          alias.active = true
          this.success('Alias restored successfully')
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.retoreAliasLoading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }

      this.restoreAliasModalOpen = false
    },
    async logout(expiredToken = false) {
      if (!expiredToken) {
        this.logoutLoading = true
      }

      Object.assign(this.$data, this.$options.data.apply(this))

      try {
        await this.$browser.storage.sync.remove([
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
        this.apiToken = await this.getApiToken()
        this.instance = await this.getInstance()
        this.domainOptions = await this.getDomainOptions()
        this.recipients = await this.getRecipients()
        this.domain = await this.getDomain()
        this.aliasFormat = await this.getAliasFormat()
        this.showAliasStatus = await this.getShowAliasStatus()
        this.theme = await this.getTheme()
        this.autoCopyNewAlias = await this.getAutoCopyNewAlias()
        this.showSearchSuggestions = await this.getShowSearchSuggestions()
        this.autoFillLocalPart = await this.getAutoFillLocalPart()
        this.defaultAliasSort = await this.getDefaultAliasSort()
        this.defaultAliasSortDir = await this.getDefaultAliasSortDir()
        this.defaultSelected = await this.getDefaultSelected()

        if (!expiredToken) {
          this.logoutLoading = false
          this.success('Logged out successfully')
        }
      } catch (error) {
        this.logoutLoading = false
        console.log(error)
      }
    },
    displaySendFromAddress() {
      this.error = ''
      this.sendFromAddressCopied = false

      if (!this.validEmail(this.sendFromAliasDestination)) {
        this.error = 'Valid Email required'
        return
      }

      this.sendFromAliasEmailToSendTo = `${
        this.aliasToView.local_part
      }+${this.sendFromAliasDestination.replace('@', '=')}@${this.aliasToView.domain}`
    },
    openSendFromAlias() {
      if (this.aliasToView.deleted_at) {
        return (this.error = 'You must restore this alias first')
      }

      if (!this.aliasToView.active) {
        return (this.error = 'You must activate this alias first')
      }

      this.sendFromAliasDestination = ''
      this.sendFromAliasEmailToSendTo = ''
      this.sendFromAddressCopied = false
      this.selected = 'SendFromAlias'
    },
    viewAlias(alias) {
      this.selected = 'ViewAlias'

      this.aliasToView = alias
    },
    getAliasStatus(alias) {
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
    },
    showMoreAliases() {
      this.aliasesCurrentPage++
      this.showMoreAliasesLoading = true

      this.getAliases()
    },
    cancelEditDescription() {
      this.aliasToViewDescriptionEditing = false
      this.aliasDescriptionToEdit = ''
    },
    cancelChangeInstance() {
      this.instanceInput = 'https://app.addy.io'
      this.changeInstance = false
    },
    validInstance(instance) {
      let re =
        /^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+(?<!\/)$/
      return re.test(instance)
    },
    validLocalPart(part) {
      let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))$/
      return re.test(part)
    },
    validEmail(email) {
      let re =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      return re.test(email)
    },
    validToken(token) {
      let re = /^(addy_io_)?[a-zA-Z0-9]+$/

      return re.test(token)
    },
    setNewAliasCopied() {
      this.newAliasCopied = true
      this.aliasCopied()
    },
    setSendFromAddressCopied() {
      this.sendFromAddressCopied = true
      this.aliasCopied()
    },
    clipboardSuccess() {
      this.clipboardButtonText = 'Copied!'
    },
    clipboardError() {
      this.clipboardButtonText = 'Error!'
    },
    aliasCopied() {
      this.success('Copied to clipboard')
    },
    success(text = '') {
      this.$notify({
        text: text,
        type: 'success',
      })
    },
  },
}
</script>

<style src="@vueform/multiselect/themes/default.css"></style>
