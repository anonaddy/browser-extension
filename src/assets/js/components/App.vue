<template>
  <div class="px-3 pb-3 pt-4">
    <div v-if="!apiToken">
      <input
        v-model="tokenInput"
        type="text"
        name="token"
        placeholder="Enter your API token..."
        required="required"
        autofocus="autofocus"
        class="appearance-none bg-white rounded-sm w-full p-2 text-grey-700 focus:shadow-outline mb-3"
      />

      <p v-if="error" class="text-white text-xs italic mb-3">
        {{ error }}
      </p>

      <button
        @click="saveApiToken"
        class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
      >
        Add API Token
      </button>

      <p class="w-full text-xs text-center text-indigo-100 mt-3">
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
      <div v-if="newAlias" class="text-white text-sm mb-3">
        {{ newAlias }}
      </div>

      <p v-if="error" class="text-white text-xs italic mb-3">
        {{ error }}
      </p>

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

      <p class="w-full text-xs text-center text-indigo-100 mt-3">
        <a @click="deleteApiToken" class="text-grey-50 hover:text-indigo-50 cursor-pointer">
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
          await browser.storage.sync.set({ apiToken: val })
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
        var result = await browser.storage.sync.get({ apiToken: '' })
        return result.apiToken
      } catch (error) {
        console.log(error)
      }
    },
    async getCurrentTabHostname() {
      try {
        var result = await browser.tabs.query({ active: true, currentWindow: true })
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
        await browser.storage.sync.remove('apiToken')
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
          this.error = 'You have reached your UUID alias limit'
        } else if (response.status === 429) {
          this.error = 'You have reached your hourly limit for creating new aliases'
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
