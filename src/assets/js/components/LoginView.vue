<template>
  <div class="login bg-indigo-900 p-3">
    <header
      class="mb-4 flex items-center justify-between border-b border-indigo-700 bg-indigo-900 pb-3"
    >
      <a href="https://app.addy.io" target="_blank" rel="nofollow noreferrer noopener">
        <img class="h-6" src="img/logo.png" alt="addy.io Logo" />
      </a>
      <button
        v-if="showOpenInTab"
        @click="openInTab"
        type="button"
        class="rounded-xs border border-indigo-500 px-2 py-1 text-sm text-white hover:bg-indigo-800 focus:outline-hidden"
        title="Open the login form in a browser tab"
      >
        Open in a tab
      </button>
      <span v-else class="self-center text-sm text-grey-50">Anonymous Email Forwarding</span>
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

    <!-- Credentials login -->
    <template v-if="loginMode === 'credentials'">
      <template v-if="!mfaRequired">
        <form @submit.prevent="loginWithCredentials">
          <label for="login_username" class="mb-1 block text-base text-indigo-100">Username</label>
          <input
            v-model="usernameInput"
            id="login_username"
            type="text"
            autocomplete="username"
            placeholder="Your addy.io username"
            class="mb-4 w-full appearance-none rounded-xs bg-white p-2 text-base text-grey-700 shadow-sm focus:ring-3"
          />
          <label for="login_password" class="mb-1 block text-base text-indigo-100">Password</label>
          <input
            v-model="passwordInput"
            id="login_password"
            type="password"
            autocomplete="current-password"
            placeholder="Your password"
            class="mb-4 w-full appearance-none rounded-xs bg-white p-2 text-base text-grey-700 shadow-sm focus:ring-3"
          />
          <label for="require_relogin" class="mb-1 block text-base text-indigo-100">
            Require re-login after
          </label>
          <select
            v-model="requireReloginAfter"
            id="require_relogin"
            class="mb-4 w-full appearance-none rounded-xs bg-white p-2 text-base text-grey-700 shadow-sm focus:ring-3"
          >
            <option value="">Never</option>
            <option value="day">1 day</option>
            <option value="week">1 week</option>
            <option value="month">1 month</option>
            <option value="year">1 year</option>
          </select>
          <button
            type="submit"
            class="w-full rounded-xs border border-transparent bg-cyan-400 px-3 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-300 focus:outline-hidden"
            :class="credentialsLoading ? 'cursor-not-allowed' : ''"
            :disabled="credentialsLoading"
          >
            Sign In
            <loader class="h-5 w-5" v-if="credentialsLoading" />
          </button>
        </form>
        <p class="mt-3 text-center text-sm text-indigo-200">
          <span
            @click="loginMode = 'apiKey'"
            class="cursor-pointer text-white underline hover:text-indigo-50"
          >
            Login using API Key instead
          </span>
        </p>
      </template>
      <!-- MFA step (after login when 2FA is enabled) -->
      <template v-else>
        <label for="mfa_otp" class="mb-1 block text-base text-indigo-100">
          Two-factor authentication code (6 digits)
        </label>
        <input
          v-model="mfaOtp"
          ref="mfaOtpInput"
          id="mfa_otp"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="000000"
          maxlength="6"
          class="mb-4 w-full appearance-none rounded-xs bg-white p-2 text-center text-base tracking-widest text-grey-700 shadow-sm focus:ring-3"
          @keyup.enter="submitMfa"
        />
        <button
          @click="submitMfa"
          class="w-full rounded-xs border border-transparent bg-cyan-400 px-3 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-300 focus:outline-hidden"
          :class="credentialsLoading ? 'cursor-not-allowed' : ''"
          :disabled="credentialsLoading || mfaOtp.length !== 6"
        >
          Verify
          <loader class="h-5 w-5" v-if="credentialsLoading" />
        </button>
        <p class="mt-3 text-center text-sm text-indigo-200">
          <span
            @click="resetMfaStep"
            class="cursor-pointer text-white underline hover:text-indigo-50"
          >
            Back to login
          </span>
        </p>
      </template>
    </template>

    <!-- API Key login -->
    <template v-else>
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
      <p class="mt-3 text-center text-sm text-indigo-200">
        <span
          @click="switchToCredentialsLogin"
          class="cursor-pointer text-white underline hover:text-indigo-50"
        >
          Login using username and password
        </span>
      </p>
    </template>

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
</template>

<script>
// Sign in with username and password, or with an API key.
import sharedComponents from './shared.js'
import { useAddy } from '../store.js'

export default {
  name: 'LoginView',
  components: sharedComponents,
  setup() {
    return useAddy()
  },
}
</script>
