<template>
  <div class="p-3">
    <div v-if="!apiToken">
      <div
        v-if="error"
        class="flex items-center justify-center text-xs border-t-4 rounded-sm text-yellow-800 border-yellow-600 bg-yellow-100 p-2 mb-3"
        role="alert"
      >
        {{ error }}
      </div>
      <label for="api_token" class="block text-indigo-100 text-xs mb-1">
        API token (from the settings page):
      </label>
      <textarea
        v-model="tokenInput"
        id="api_token"
        placeholder="Enter API token..."
        rows="3"
        required="required"
        autofocus="autofocus"
        class="appearance-none bg-white rounded-sm w-full p-2 text-grey-700 focus:shadow-outline mb-3"
      >
      </textarea>
      <button
        @click="saveApiToken"
        class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
      >
        Add API Token
      </button>
      <p class="w-full text-xs text-indigo-100 mt-3">
        Don't have an account?
        <a
          href="https://app.anonaddy.com/register"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="text-white hover:text-indigo-50 cursor-pointer"
        >
          Register
        </a>
      </p>
    </div>

    <div v-else>
      <div
        v-if="error"
        class="flex items-center justify-center text-xs border-t-4 rounded-sm text-yellow-800 border-yellow-600 bg-yellow-100 p-2 mb-3"
        role="alert"
      >
        {{ error }}
      </div>
      <div v-if="newAlias">
        <div
          class="flex items-center justify-center text-xs border-t-4 rounded-sm text-green-800 border-green-600 bg-green-100 p-2 mb-3"
          role="alert"
        >
          {{ newAlias }}
        </div>
        <button
          v-clipboard="() => newAlias"
          v-clipboard:success="clipboardSuccess"
          v-clipboard:error="clipboardError"
          class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
        >
          {{ clipboardButtonText }}
        </button>
      </div>
      <div v-else>
        <label for="alias_domain" class="block text-indigo-100 text-xs mb-1">
          Alias Domain:
        </label>
        <div class="block relative w-full mb-3">
          <select
            v-model="domain"
            id="alias_domain"
            class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:shadow-outline"
            required
          >
            <option
              v-for="domainOption in domainOptions"
              :key="domainOption.value"
              :value="domainOption.value"
              >{{ domainOption.name }}</option
            >
          </select>
          <div
            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"
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
        <label for="alias_description" class="block text-indigo-100 text-xs mb-1">
          Description (defaults to current tab's hostname):
        </label>
        <input
          v-model="description"
          id="alias_description"
          type="text"
          placeholder="Enter description (optional)..."
          autofocus="autofocus"
          class="appearance-none bg-white rounded-sm w-full p-2 text-grey-700 focus:shadow-outline mb-4"
        />
        <button
          @click="generateAlias"
          class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
          :class="loading ? 'cursor-not-allowed' : ''"
          :disabled="loading"
        >
          Generate UUID Alias
          <loader v-if="loading" />
        </button>
      </div>
      <p class="w-full text-xs text-indigo-100 mt-3">
        <a @click="deleteApiToken" class="text-grey-200 hover:text-indigo-50 cursor-pointer">
          Logout
        </a>
      </p>
    </div>
  </div>
</template>

<script>
import Loader from './Loader'

export default {
  name: 'app',
  components: {
    Loader,
  },
  data() {
    return {
      tokenInput: '',
      apiToken: '',
      currentTabHostname: '',
      description: '',
      loading: false,
      newAlias: '',
      clipboardButtonText: 'Copy To Clipboard',
      error: '',
      domain: 'anonaddy.me',
      domainOptions: [
        { name: 'anonaddy.me', value: 'anonaddy.me' },
        { name: '4wrd.cc (Pro users only)', value: '4wrd.cc' },
      ],
    }
  },
  async mounted() {
    this.apiToken = await this.getApiToken()
    this.currentTabHostname = await this.getCurrentTabHostname()
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
    tokenInput: function() {
      this.error = ''
    },
    description: function() {
      this.error = ''
    },
  },
  methods: {
    async getApiToken() {
      try {
        var result = await this.$browser.storage.sync.get({ apiToken: '' })
        return result.apiToken
      } catch (error) {
        console.log(error)
      }
    },
    async getCurrentTabHostname() {
      try {
        var result = await this.$browser.tabs.query({ active: true, currentWindow: true })
        var url = new URL(result[0].url)
        return url.hostname
      } catch (error) {
        console.log(error)
      }
    },
    async saveApiToken() {
      this.error = ''

      if (!this.tokenInput) {
        return (this.error = 'API token is required')
      }

      this.apiToken = this.tokenInput
    },
    async deleteApiToken() {
      this.error = ''

      try {
        await this.$browser.storage.sync.remove('apiToken')
        this.apiToken = await this.getApiToken()
      } catch (error) {
        console.log(error)
      }
    },
    async generateAlias() {
      if (this.description.length > 100) {
        return (this.error = 'Description cannot be more than 100 characters')
      }

      if (!this.domainOptions.find(domain => domain.value === this.domain)) {
        return (this.error = 'Invalid alias domain name')
      }

      this.loading = true
      this.error = ''

      try {
        const response = await fetch('https://app.anonaddy.com/api/v1/aliases', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({
            domain: this.domain,
            description: this.description ? this.description : this.currentTabHostname,
          }),
        })

        this.loading = false
        this.description = ''

        if (response.status === 403) {
          this.error = 'You have reached your active UUID alias limit'
        } else if (response.status === 429) {
          this.error = 'You have reached your hourly limit for creating new aliases'
        } else if (response.status === 422) {
          this.error = 'The given data was invalid'
        } else if (response.status === 401) {
          this.error = 'Unauthenticated, please check your API token'
        } else if (response.status === 200) {
          let data = await response.json()
          this.newAlias = data.data.email
        } else {
          this.error = 'An Error Has Occurred'
          console.log(error)
        }
      } catch (error) {
        this.loading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }
    },
    clipboardSuccess() {
      this.clipboardButtonText = 'Copied!'
    },
    clipboardError() {
      this.clipboardButtonText = 'Something Went Wrong'
    },
  },
}
</script>
