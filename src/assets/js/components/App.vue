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
      <div v-if="changeInstance">
        <label for="instance" class="block text-indigo-100 text-xs mb-1">
          AnonAddy Instance:
        </label>
        <input
          v-model="instanceInput"
          id="instance"
          type="text"
          required="required"
          class="appearance-none bg-white rounded-sm w-full p-2 text-grey-700 focus:shadow-outline mb-4"
        />
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
        @click="getAliasDomainOptions(tokenInput, instanceInput)"
        class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
        :class="domainOptionsloading ? 'cursor-not-allowed' : ''"
        :disabled="domainOptionsloading"
      >
        Sign In
        <loader v-if="domainOptionsloading" />
      </button>
      <div class="flex justify-between mt-3">
        <p class="text-xs text-indigo-100">
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
        <span
          @click="changeInstance = true"
          class="block text-xs text-white hover:text-indigo-50 cursor-pointer"
        >
          Change Instance
        </span>
      </div>
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
        <div class="flex">
          <button
            v-clipboard="() => newAlias"
            v-clipboard:success="clipboardSuccess"
            v-clipboard:error="clipboardError"
            class="px-3 py-2 mr-3 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
          >
            {{ clipboardButtonText }}
          </button>
          <button
            @click="newAlias = ''"
            class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
          >
            Back
          </button>
        </div>
      </div>
      <div v-else>
        <div v-if="lastCreated">
          <p for="alias_domain" class="block text-indigo-100 text-xs mb-1">
            Last Created:
          </p>
          <div
            v-clipboard="() => lastCreated"
            v-clipboard:success="setLastCreatedCopied"
            class="flex items-center justify-between cursor-pointer text-xs border-t-4 rounded-sm text-green-800 border-green-600 bg-green-100 p-2 mb-3"
            role="alert"
          >
            <span>
              {{ lastCreated }}
            </span>
            <svg
              v-if="lastCreatedCopied"
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
              :key="domainOption"
              :value="domainOption"
              >{{ domainOption }}</option
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
        <label for="alias_format" class="block text-indigo-100 text-xs mb-1">
          Alias Format:
        </label>
        <div class="block relative w-full mb-3">
          <select
            v-model="aliasFormat"
            id="alias_format"
            class="block appearance-none w-full text-grey-700 bg-white p-2 pr-8 rounded shadow focus:shadow-outline"
            required
          >
            <option
              v-for="formatOption in aliasFormatOptions"
              :key="formatOption.value"
              :value="formatOption.value"
              :disabled="
                (!subscibedOrSelfHosting && formatOption.paid) ||
                  (formatOption.value === 'custom' && sharedDomainSelected)
              "
              >{{ formatOption.label }}
              {{ !subscibedOrSelfHosting && formatOption.paid ? '(Subscribe To Unlock)' : ''
              }}{{
                formatOption.value === 'custom' && sharedDomainSelected
                  ? '(Not available for shared domains)'
                  : ''
              }}</option
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
        <div v-if="!sharedDomainSelected && aliasFormat === 'custom'">
          <label for="alias_local_part" class="block text-indigo-100 text-xs mb-1">
            Alias Local Part:
          </label>
          <input
            v-model="localPart"
            id="alias_local_part"
            type="text"
            placeholder="Enter local part..."
            class="appearance-none bg-white rounded-sm w-full p-2 text-grey-700 focus:shadow-outline mb-4"
          />
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
          @click="createAlias"
          class="px-3 py-2 w-full text-sm text-cyan-900 font-semibold bg-cyan-400 hover:bg-cyan-300 border border-transparent rounded-sm focus:outline-none"
          :class="loading ? 'cursor-not-allowed' : ''"
          :disabled="loading"
        >
          Create Alias
          <loader v-if="loading" />
        </button>
      </div>
      <div class="w-full text-xs mt-3 flex justify-between">
        <a
          @click="getAliasDomainOptions(apiToken, instance)"
          class="text-grey-200 hover:text-indigo-50 cursor-pointer"
        >
          Refresh Domains and Defaults
        </a>
        <a @click="logout" class="text-grey-200 hover:text-indigo-50 cursor-pointer">
          Logout
        </a>
      </div>
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
      instanceInput: 'https://app.anonaddy.com',
      instance: '',
      changeInstance: false,
      currentTabHostname: '',
      description: '',
      localPart: '',
      domainOptionsloading: false,
      loading: false,
      newAlias: '',
      lastCreated: '',
      lastCreatedCopied: false,
      clipboardButtonText: 'Copy',
      error: '',
      domain: '',
      domainOptions: [],
      aliasFormat: 'uuid',
      aliasFormatOptions: [
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
    }
  },
  async mounted() {
    this.apiToken = await this.getApiToken()
    this.instance = await this.getInstance()
    if (this.apiToken && !this.instance) {
      this.instance = 'https://app.anonaddy.com'
    }
    this.domainOptions = await this.getDomainOptions()
    this.domain = await this.getDomain()
    this.aliasFormat = this.sharedDomainSelected ? 'uuid' : await this.getAliasFormat()
    this.lastCreated = await this.getLastCreated()
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
    domain: {
      async handler(val) {
        if (this.sharedDomainSelected) {
          this.aliasFormat = 'uuid'
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
        try {
          await this.$browser.storage.sync.set({ aliasFormat: val })
        } catch (error) {
          console.log(error)
        }
      },
    },
    lastCreated: {
      async handler(val) {
        try {
          await this.$browser.storage.sync.set({ lastCreated: val })
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
    localPart: function() {
      this.error = ''
    },
  },
  computed: {
    subscribed() {
      return this.domainOptions.length > 3
    },
    selfHosting() {
      return this.instance !== 'https://app.anonaddy.com'
    },
    subscibedOrSelfHosting() {
      return this.subscribed || this.selfHosting
    },
    sharedDomainSelected() {
      return this.domain === 'anonaddy.me' || this.domain === '4wrd.cc'
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
        var result = await this.$browser.storage.sync.get({ aliasFormat: 'uuid' })
        return result.aliasFormat
      } catch (error) {
        console.log(error)
      }
    },
    async getLastCreated() {
      try {
        var result = await this.$browser.storage.sync.get({ lastCreated: '' })
        return result.lastCreated
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
    async getAliasDomainOptions(token, instance) {
      this.error = ''

      if (!token) {
        return (this.error = 'API token is required')
      }

      if (!this.validInstance(instance) && this.changeInstance) {
        return (this.error = 'Please enter a valid URL for the instance with no trailing slash')
      }

      this.domainOptionsloading = true

      try {
        const response = await fetch(`${instance}/api/v1/domain-options`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            Authorization: `Bearer ${token}`,
          },
        })

        this.domainOptionsloading = false

        if (response.status === 401) {
          this.error = 'Unauthenticated, please check your API token'
        } else if (response.status === 200) {
          if (!this.apiToken) {
            this.apiToken = token
          }

          if (!this.instance) {
            this.instance = instance
          }

          let data = await response.json()
          this.domainOptions = data.data
          this.domain = data.defaultAliasDomain ? data.defaultAliasDomain : data.data[0]
          this.aliasFormat = data.defaultAliasFormat ? data.defaultAliasFormat : 'uuid'

          if (this.sharedDomainSelected && this.aliasFormat === 'custom' && !this.selfHosting) {
            this.aliasFormat = 'uuid'
          }
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.domainOptionsloading = false
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

      if (this.description.length > 100) {
        return (this.error = 'Description cannot be more than 100 characters')
      }

      if (!this.domainOptions.find(domain => domain === this.domain)) {
        return (this.error = 'Invalid alias domain name')
      }

      this.loading = true
      this.error = ''

      try {
        const response = await fetch(`${this.instance}/api/v1/aliases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            Authorization: `Bearer ${this.apiToken}`,
          },
          body: JSON.stringify({
            domain: this.domain,
            local_part: this.localPart,
            description: this.description ? this.description : this.currentTabHostname,
            format: this.aliasFormat,
          }),
        })

        this.loading = false

        if (response.status === 403) {
          this.error = 'You have reached your active UUID/Random Word alias limit'
        } else if (response.status === 429) {
          this.error = 'You have reached your hourly limit for creating new aliases'
        } else if (response.status === 422) {
          let error = await response.json()
          this.error = error.errors[Object.keys(error.errors)[0]][0]
        } else if (response.status === 401) {
          this.error = 'Unauthenticated, please check your API token'
        } else if (response.status === 201) {
          let data = await response.json()
          this.localPart = ''
          this.description = ''
          this.newAlias = data.data.email
          this.lastCreated = data.data.email
        } else {
          this.error = 'An Error Has Occurred'
        }
      } catch (error) {
        this.loading = false
        this.error = 'An Error Has Occurred'
        console.log(error)
      }
    },
    async logout() {
      Object.assign(this.$data, this.$options.data.apply(this))

      try {
        await this.$browser.storage.sync.remove([
          'apiToken',
          'instance',
          'domainOptions',
          'domain',
          'aliasFormat',
          'lastCreated',
        ])
        this.apiToken = await this.getApiToken()
        this.instance = await this.getInstance()
        this.domainOptions = await this.getDomainOptions()
        this.domain = await this.getDomain()
        this.aliasFormat = await this.getAliasFormat()
        this.lastCreated = await this.getLastCreated()
      } catch (error) {
        console.log(error)
      }
    },
    validInstance(instance) {
      let re = /^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+(?<!\/)$/
      return re.test(instance)
    },
    validLocalPart(part) {
      let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))$/
      return re.test(part)
    },
    setLastCreatedCopied() {
      this.lastCreatedCopied = true
    },
    clipboardSuccess() {
      this.clipboardButtonText = 'Copied!'
    },
    clipboardError() {
      this.clipboardButtonText = 'Error!'
    },
  },
}
</script>
