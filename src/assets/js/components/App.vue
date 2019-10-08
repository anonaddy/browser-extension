<template>
  <div class="px-3 pb-3 pt-4">
    <div v-if="!apiToken">
      <div
        v-if="error"
        class="flex items-center justify-center text-xs border-t-4 rounded-sm text-yellow-800 border-yellow-600 bg-yellow-100 p-2 mb-3"
        role="alert"
      >
        {{ error }}
      </div>

      <input
        v-model="tokenInput"
        type="text"
        name="token"
        placeholder="Enter your API token from the settings page..."
        required="required"
        autofocus="autofocus"
        class="appearance-none bg-white rounded-sm w-full p-2 text-grey-700 focus:shadow-outline mb-3"
      />

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
        v-if="newAlias"
        class="flex items-center justify-center text-xs border-t-4 rounded-sm text-green-800 border-green-600 bg-green-100 p-2 mb-3"
        role="alert"
      >
        {{ newAlias }}
      </div>

      <div
        v-if="error"
        class="flex items-center justify-center text-xs border-t-4 rounded-sm text-yellow-800 border-yellow-600 bg-yellow-100 p-2 mb-3"
        role="alert"
      >
        {{ error }}
      </div>

      <button
        v-if="newAlias"
        v-clipboard="() => newAlias"
        v-clipboard:success="clipboardSuccess"
        v-clipboard:error="clipboardError"
        class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
      >
        {{ clipboardButtonText }}
      </button>

      <button
        v-else
        @click="generateAlias"
        class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
        :class="loading ? 'cursor-not-allowed' : ''"
        :disabled="loading"
      >
        Generate UUID Alias
        <loader v-if="loading" />
      </button>

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
      loading: false,
      newAlias: '',
      clipboardButtonText: 'Copy To Clipboard',
      error: '',
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
        this.error = 'API token is required'
        return
      }

      if (this.tokenInput.length !== 60) {
        this.error = 'Invalid API Token'
        return
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
      this.loading = true
      this.error = ''

      try {
        const response = await fetch('https://app.anonaddy.com/api/v1/aliases', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({
            domain: 'anonaddy.me',
            description: this.currentTabHostname,
          }),
        })

        this.loading = false

        if (response.status === 403) {
          this.error = 'You have reached your active UUID alias limit'
        } else if (response.status === 429) {
          this.error = 'You have reached your hourly limit for creating new aliases'
        } else if (response.status === 200) {
          if (response.redirected) {
            this.error = 'Please check your API token'
          } else {
            let data = await response.json()
            this.newAlias = data.data.email
          }
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
