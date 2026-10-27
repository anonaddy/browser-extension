<template>
  <Modal :open="restoreAliasModalOpen" @close="restoreAliasModalOpen = false" class="px-3">
    <div class="w-full rounded-md bg-white p-4 shadow-2xl dark:bg-grey-800">
      <div>
        <div
          class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-50"
        >
          <information class="text-cyan-600" />
        </div>
        <div class="mt-3 text-center">
          <h3 class="text-lg leading-6 font-medium text-grey-900 dark:text-white" id="modal-title">
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
          <h3 class="text-lg leading-6 font-medium text-grey-900 dark:text-white" id="modal-title">
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
          <h3 class="text-lg leading-6 font-medium text-grey-900 dark:text-white" id="modal-title">
            Forget alias
          </h3>
          <div class="mt-2">
            <p class="text-sm text-grey-500 dark:text-white">
              Are you sure you want to forget this alias? Forgetting an alias will disassociate it
              from your account.
            </p>
            <p v-if="aliasToViewHasSharedDomain" class="mt-2 text-sm text-grey-500 dark:text-white">
              <b>Note:</b> This alias uses a shared domain so it can <b>never be restored</b> or
              used again so make sure you are certain. Once forgotten, this alias will
              <b>reject any emails sent to it</b>
            </p>
            <p v-else class="mt-2 text-sm text-grey-500 dark:text-white">
              <b>Note:</b> This is a standard alias so it
              <b>can be created again in the future</b> since it will be as if it never existed in
              the database. Once forgotten, if someone sends an email to this alias and you have
              catch-all enabled then it will be created automatically again. If you would like this
              alias to reject any messages sent to it then you should delete it instead.
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
          <h3 class="text-lg leading-6 font-medium text-grey-900 dark:text-white" id="modal-title">
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
          <h3 class="text-lg leading-6 font-medium text-grey-900 dark:text-white" id="modal-title">
            Logout
          </h3>
          <div class="mt-2">
            <p v-if="apiTokenFromLogin" class="text-sm text-grey-500 dark:text-white">
              Are you sure you want to logout? Logging out <b>will delete the API key</b> that the
              browser extension created when you signed in.
            </p>
            <p v-else class="text-sm text-grey-500 dark:text-white">
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
</template>

<script>
// Confirmation dialogs for restore, delete, forget, renew API key and logout.
import sharedComponents from './shared.js'
import { useAddy } from '../store.js'

export default {
  name: 'AliasModals',
  components: sharedComponents,
  setup() {
    return useAddy()
  },
}
</script>
