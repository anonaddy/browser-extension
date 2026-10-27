/**
 * Shared state and actions for the popup. The module runs once, so every
 * component that calls useAddy() gets the same refs.
 */
import {
  ref,
  customRef,
  computed,
  watch,
  defineAsyncComponent,
  markRaw,
  nextTick,
  toRaw,
} from 'vue'
import debounce from 'lodash/debounce'
import { useNotification } from '@kyvg/vue3-notification'
import { createAliasRequest, formatAliasEmail } from './api/createAlias.js'
import { findAliasForSite, siteSearchTerm } from './api/findAliasForSite.js'
import { claimRateExtensionLink, incrementAliasesCreatedCount } from './aliasCreateCount.js'
import { LOCAL_KEYS, migrateSyncToLocal } from './storage.js'
import { apiRequest } from './api/request.js'
import { SHARED_DOMAINS, OFFICIAL_INSTANCES, DEFAULT_INSTANCE, detectBrowser } from './constants.js'
const { notify } = useNotification()

// State
const browser = require('webextension-polyfill')
const extensionWindow = ref('')
const showOpenInTab = ref(false)
const extensionVersion = ref(null)
const tabs = ref([
  {
    name: 'Aliases',
    icon: markRaw(defineAsyncComponent(() => import('./components/icons/AtSign.vue'))),
  },
  {
    name: 'Settings',
    icon: markRaw(defineAsyncComponent(() => import('./components/icons/Cog.vue'))),
  },
])
const selected = ref('Aliases')
const tokenInput = ref('')
const apiToken = ref('')
// True when the key came from username/password sign-in, so logout can delete it
const apiTokenFromLogin = ref(false)
const instanceInput = ref(DEFAULT_INSTANCE)
const instance = ref('')
const changeInstance = ref(false)
const loginMode = ref('credentials')
const usernameInput = ref('')
const passwordInput = ref('')
const requireReloginAfter = ref('')
const mfaRequired = ref(false)
const mfaKey = ref('')
const mfaOtp = ref('')
const mfaOtpInput = ref(null)
const credentialsLoading = ref(false)
const pendingLoginDeviceName = ref('')
const pendingLoginExpiration = ref('')
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
const labelsLoading = ref(false)
const createAliasLoading = ref(false)
const activateAliasLoading = ref(false)
const deactivateAliasLoading = ref(false)
const pinAliasLoading = ref(false)
const unpinAliasLoading = ref(false)
const deleteAliasLoading = ref(false)
const forgetAliasLoading = ref(false)
const restoreAliasLoading = ref(false)
const logoutLoading = ref(false)
const editAliasDescriptionLoading = ref(false)
const editAliasLabelsLoading = ref(false)
const aliasToViewLabelsEditing = ref(false)
const aliasLabelIdsToEdit = ref([])
const deleteAliasModalOpen = ref(false)
const forgetAliasModalOpen = ref(false)
const restoreAliasModalOpen = ref(false)
const renewApiKeyModalOpen = ref(false)
const logoutModalOpen = ref(false)
const aliasToViewDescriptionEditing = ref(false)
const aliasDescriptionToEdit = ref('')
const newAlias = ref('')
const showRateExtensionLink = ref(false)
const existingAliasForSite = ref('')
// The alias behind existingAliasForSite, so it can be deactivated from the Create Alias tab
const existingSiteAlias = ref(null)
const existingAliasCount = ref(0)
const existingAliasHasMore = ref(false)
const newAliasCopied = ref(false)
const sendFromAddressCopied = ref(false)
// Goes up on every error, even a repeat of the one showing, so the banner can be scrolled into view
const errorRevision = ref(0)
const error = customRef((track, trigger) => {
  let value = ''
  return {
    get() {
      track()
      return value
    },
    set(newValue) {
      value = newValue
      trigger()
      if (newValue) errorRevision.value++
    },
  }
})
const domain = ref('')
const domainOptions = ref([])
// Shared domains the account plan can use. domain-options omits hidden domains from domainOptions.
const availableSharedDomains = ref(null)
const recipients = ref([])
const labels = ref([])
const createAliasRecipientIds = ref([])
const createAliasLabelIds = ref([])
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
    value: 'random_male_name',
    label: 'Random Male Name',
    paid: true,
  },
  {
    value: 'random_female_name',
    label: 'Random Female Name',
    paid: true,
  },
  {
    value: 'random_noun',
    label: 'Random Noun',
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
const showIconInEmailFields = ref(true)
const emailFieldIconPosition = ref('inside')
const showContextMenuOption = ref(true)
const reuseExistingAlias = ref(true)
const showAliasCreatedNotification = ref(true)
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
const AUTO_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000

const shouldAutoRefresh = (lastRefreshedAt) => {
  const last = Number(lastRefreshedAt || 0)
  if (!last || Number.isNaN(last)) return true
  return Date.now() - last >= AUTO_REFRESH_INTERVAL_MS
}

const maybeAutoRefreshDomainAndRecipients = async () => {
  if (!apiToken.value || !instance.value) return

  try {
    const { lastDomainOptionsRefreshAt, lastRecipientsRefreshAt, lastLabelsRefreshAt } =
      await browser.storage.local.get({
        lastDomainOptionsRefreshAt: 0,
        lastRecipientsRefreshAt: 0,
        lastLabelsRefreshAt: 0,
      })

    const needsPlanSharedDomains =
      availableSharedDomains.value === null && OFFICIAL_INSTANCES.includes(instance.value)
    const refreshTasks = []
    if (
      (shouldAutoRefresh(lastDomainOptionsRefreshAt) || needsPlanSharedDomains) &&
      !domainOptionsLoading.value
    ) {
      refreshTasks.push(getAliasDomainOptions(apiToken.value, instance.value, false, true))
    }
    if (
      (shouldAutoRefresh(lastRecipientsRefreshAt) || !recipients.value.length) &&
      !recipientsLoading.value
    ) {
      refreshTasks.push(getRecipientsRequest(true))
    }
    if ((shouldAutoRefresh(lastLabelsRefreshAt) || !labels.value.length) && !labelsLoading.value) {
      refreshTasks.push(getLabelsRequest(true))
    }

    if (refreshTasks.length) {
      await Promise.allSettled(refreshTasks)
    }
  } catch (error) {
    console.log(error)
  }
}

const STORE_URLS = {
  firefox: 'https://addons.mozilla.org/en-GB/firefox/addon/addy_io/',
  edge: 'https://microsoftedge.microsoft.com/addons/detail/addyio-anonymous-email/ohjlgpcfncgkijjfmabldlgnccmgcehl',
  safari: 'https://apps.apple.com/app/addy-io-safari-extension/id6670220050',
}

/** Load settings and start the first requests. App.vue calls this once mounted. */
const init = async () => {
  await migrateSyncToLocal()
  await loadSettings()

  // If session was set to expire (username/password login), require re-login when expired
  if (apiToken.value) {
    const { apiTokenExpiresAt } = await browser.storage.local.get({ apiTokenExpiresAt: '' })
    if (apiTokenExpiresAt && new Date(apiTokenExpiresAt) <= new Date()) {
      await browser.storage.local.remove(['apiToken', 'apiTokenExpiresAt', 'apiTokenFromLogin'])
      apiToken.value = ''
      apiTokenFromLogin.value = false
    }
  }
  selected.value = defaultSelected.value

  if (
    sharedDomainSelected.value &&
    aliasFormat.value === 'custom' &&
    !subscribedOrSelfHosting.value
  ) {
    aliasFormat.value = 'random_characters'
  }

  extensionUrl.value = STORE_URLS[detectBrowser()] || extensionUrl.value
  extensionVersion.value = browser.runtime.getManifest()?.version || null

  const [extensionView, inPopupOrSidebar] = await Promise.all([
    getExtensionWindow(),
    isPopupOrSidebar(),
  ])
  extensionWindow.value = extensionView
  showOpenInTab.value = inPopupOrSidebar
  currentTabHostname.value = await getCurrentTabHostname()

  if (apiToken.value) {
    document.getElementById('search')?.focus()
    const cacheShown = await showCachedAliases()
    getAliases(true, { refreshInBackground: cacheShown })
  }
  if (selected.value === 'CreateAlias') {
    lookupExistingAliasForSite()
  }
  // Runs after the alias list request has started so it does not delay it
  maybeAutoRefreshDomainAndRecipients()
}

// Computed properties
const subscribed = computed(() => {
  // addy.io is in this list for lite and pro. A hidden addy.io stays in the list.
  if (Array.isArray(availableSharedDomains.value)) {
    return availableSharedDomains.value.includes('addy.io')
  }

  return Object.values(domainOptions.value).includes('addy.io')
})
const selfHosting = computed(() => !OFFICIAL_INSTANCES.includes(instance.value))
const subscribedOrSelfHosting = computed(() => subscribed.value || selfHosting.value)
const aliasToViewHasSharedDomain = computed(() => {
  if (!aliasToView.value.domain) {
    return false
  }
  return SHARED_DOMAINS.includes(aliasToView.value.domain)
})
const sharedDomainSelected = computed(() => SHARED_DOMAINS.includes(domain.value))

/** Create Alias "Click to use"; min length 2 only when custom format + shared domain (see createAlias). */
const localPartSuggestionsForCreate = computed(() => {
  const needMin2 = aliasFormat.value === 'custom' && sharedDomainSelected.value
  if (needMin2) {
    return localPartSuggestions.value.filter((s) => String(s).length >= 2)
  }
  return localPartSuggestions.value
})

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
const showPinnedAliases = computed(() => {
  if (showAliasStatus.value === 'pinned') {
    return true
  } else if (showAliasStatus.value === 'unpinned') {
    return false
  } else {
    return ''
  }
})

const darkSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
const prefersDark = ref(darkSchemeQuery.matches)
darkSchemeQuery.addEventListener('change', (event) => {
  prefersDark.value = event.matches
})

const activeTheme = computed(() => {
  if (theme.value === 'system') {
    return prefersDark.value ? 'dark' : 'light'
  }
  return theme.value
})

// --- Settings ---
// Account data and caches live in storage.local, preferences in storage.sync.
// domain and aliasFormat belong to the signed-in account, so they are local too.
const LOCAL_DEFAULTS = {
  apiToken: '',
  apiTokenFromLogin: false,
  instance: '',
  domain: '',
  aliasFormat: 'random_characters',
  domainOptions: [],
  availableSharedDomains: null,
  recipients: [],
  labels: [],
}
const SYNC_DEFAULTS = {
  showAliasStatus: 'all',
  theme: 'system',
  autoCopyNewAlias: true,
  showSearchSuggestions: true,
  showIconInEmailFields: true,
  emailFieldIconPosition: 'inside',
  showContextMenuOption: true,
  reuseExistingAlias: true,
  showAliasCreatedNotification: true,
  autoFillLocalPart: '',
  defaultAliasSort: 'created_at',
  defaultAliasSortDir: '-',
  defaultSelected: 'Aliases',
}
const localSettings = {
  apiToken,
  apiTokenFromLogin,
  instance,
  domain,
  aliasFormat,
  domainOptions,
  availableSharedDomains,
  recipients,
  labels,
}
const syncSettings = {
  showAliasStatus,
  theme,
  autoCopyNewAlias,
  showSearchSuggestions,
  showIconInEmailFields,
  emailFieldIconPosition,
  showContextMenuOption,
  reuseExistingAlias,
  showAliasCreatedNotification,
  autoFillLocalPart,
  defaultAliasSort,
  defaultAliasSortDir,
  defaultSelected,
}

// True while loadSettings assigns stored values, so they are not written straight back
let loadingSettings = false

const persistSettings = (area, settings) => {
  for (const [key, setting] of Object.entries(settings)) {
    watch(setting, async (val) => {
      if (loadingSettings || val === null) return
      try {
        await browser.storage[area].set({ [key]: toRaw(val) })
      } catch (err) {
        console.log(err)
      }
    })
  }
}

persistSettings('local', localSettings)
persistSettings('sync', syncSettings)

const loadSettings = async () => {
  const [local, sync] = await Promise.all([
    browser.storage.local.get(LOCAL_DEFAULTS),
    browser.storage.sync.get(SYNC_DEFAULTS),
  ])

  loadingSettings = true
  for (const [key, setting] of Object.entries(localSettings)) setting.value = local[key]
  for (const [key, setting] of Object.entries(syncSettings)) setting.value = sync[key]
  await nextTick()
  loadingSettings = false

  // Tidy values older versions stored. These changes are saved.
  for (const setting of [domainOptions, recipients, labels]) {
    const value = setting.value
    const cleaned = Array.isArray(value) ? value.filter(Boolean) : []
    if (!Array.isArray(value) || cleaned.length !== value.length) setting.value = cleaned
  }
  if (!Array.isArray(availableSharedDomains.value)) availableSharedDomains.value = null
  if (instance.value === 'https://app.anonaddy.com' || (apiToken.value && !instance.value)) {
    instance.value = DEFAULT_INSTANCE
  }
  if (theme.value === '') theme.value = 'light'
  emailFieldIconPosition.value = emailFieldIconPosition.value === 'outside' ? 'outside' : 'inside'
  reuseExistingAlias.value = reuseExistingAlias.value !== false
  showAliasCreatedNotification.value = showAliasCreatedNotification.value !== false
}

// --- Watchers ---
// Side effects of a setting change. Skipped while stored settings load.
watch(domain, () => {
  if (loadingSettings) return
  if (sharedDomainSelected.value && !subscribedOrSelfHosting.value) {
    aliasFormat.value = 'random_characters'
  }
})

watch(aliasFormat, (val) => {
  if (loadingSettings) return
  // If alias format changes to custom and autoFillLocalPart is enabled then update localPart
  if (val === 'custom' && autoFillLocalPart.value !== '') {
    localPart.value = localPartAutoFill.value[autoFillLocalPart.value]
  } else {
    localPart.value = ''
  }
})

watch(showAliasStatus, (val, oldVal) => {
  if (loadingSettings) return
  if (!aliases.value.length && oldVal === 'all') {
    // No need to make another request if there are no aliases when the status is 'all'
  } else {
    aliasesCurrentPage.value = 1
    getAliases()
  }
})

watch(autoFillLocalPart, (val) => {
  if (loadingSettings) return
  if (aliasFormat.value === 'custom' && val !== '') {
    localPart.value = localPartAutoFill.value[val]
  }
})

watch([defaultAliasSort, defaultAliasSortDir], () => {
  if (loadingSettings) return
  if (aliases.value.length) {
    aliasesCurrentPage.value = 1
    getAliases(true)
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
  cancelEditLabels()
  if (val === 'CreateAlias') {
    lookupExistingAliasForSite()
  }
})

watch(mfaRequired, async (val) => {
  if (val === true) {
    await nextTick()
    mfaOtpInput.value?.focus()
  }
})

watch(
  searchInput,
  debounce((val) => {
    // getAliases aborts any request still loading
    if (val == '' || val.length > 2) {
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
const applyDomainOptionsData = (data) => {
  domainOptions.value = data.data
  if (Array.isArray(data.sharedDomains)) {
    availableSharedDomains.value = data.sharedDomains
  }
  domain.value = data.defaultAliasDomain ? data.defaultAliasDomain : data.data[0]
  aliasFormat.value = data.defaultAliasFormat ? data.defaultAliasFormat : 'random_characters'
}

const lookupExistingAliasForSite = async () => {
  existingAliasForSite.value = ''
  existingSiteAlias.value = null
  existingAliasCount.value = 0
  existingAliasHasMore.value = false
  if (reuseExistingAlias.value === false) return
  if (!currentTabHostname.value || !apiToken.value || !instance.value) return
  try {
    const found = await findAliasForSite({
      instance: instance.value,
      apiToken: apiToken.value,
      hostname: currentTabHostname.value,
    })
    existingAliasForSite.value = found.email || ''
    existingSiteAlias.value = found.alias
    existingAliasCount.value = found.count || 0
    existingAliasHasMore.value = Boolean(found.hasMore)
  } catch (error) {
    console.log(error)
  }
}

const showAliasesForSite = () => {
  // The same search that found this site's aliases on the Create Alias tab
  const term = currentTabHostname.value ? siteSearchTerm(currentTabHostname.value) : ''
  selected.value = 'Aliases'
  aliasesCurrentPage.value = 1
  if (searchInput.value === term) {
    getAliases()
    return
  }
  if (term.length > 2) {
    getAliasesLoading.value = true
  }
  searchInput.value = term
  if (term.length <= 2) {
    getAliases()
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
        const filled = localPartAutoFill.value[autoFillLocalPart.value]
        if (filled && (!sharedDomainSelected.value || String(filled).length >= 2)) {
          localPart.value = filled
        }
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

const isPopupOrSidebar = async () => {
  try {
    const popupViews = await browser.extension.getViews({ type: 'popup' })
    if (popupViews.includes(window)) return true
    // Chrome only allows type "popup" or "tab". Firefox also allows "sidebar".
    if (!browser.sidebarAction) return false
    const sidebarViews = await browser.extension.getViews({ type: 'sidebar' })
    return sidebarViews.includes(window)
  } catch (error) {
    console.log(error)
    return false
  }
}

const AUTH_EXPIRED_MESSAGE =
  "Unauthenticated, your API key has either expired or been revoked. You've been automatically logged out."
const AD_BLOCKER_MESSAGE =
  'An error occurred, please check any ad blockers (e.g. AdGuard) and add an exception for app.addy.io'
const GENERIC_ERROR_MESSAGE = 'An Error Has Occurred'

/** Call the v1 API for the logged-in account. Options can override instance or apiToken. */
const apiFetch = (path, options = {}) =>
  apiRequest({
    instance: instance.value,
    apiToken: apiToken.value,
    path: `/api/v1${path}`,
    ...options,
  })

/** Show the error for a failed response. A 401 logs out. */
const handleErrorResponse = (response, data = {}) => {
  if (response.status === 401) {
    logout(true)
    error.value = AUTH_EXPIRED_MESSAGE
  } else if (response.status === 419) {
    error.value = AD_BLOCKER_MESSAGE
  } else if (response.status === 422 && data.errors) {
    const firstKey = Object.keys(data.errors)[0]
    error.value = firstKey ? data.errors[firstKey][0] : 'Validation failed'
  } else {
    error.value = data.message || GENERIC_ERROR_MESSAGE
  }
}

// The first page of the unsearched alias list, shown at once when the popup opens
const aliasCacheKey = () =>
  [
    instance.value,
    showAliasStatus.value,
    `${defaultAliasSortDir.value}${defaultAliasSort.value}`,
  ].join('|')

/** Show the saved first page if it matches the current filters. Returns true when shown. */
const showCachedAliases = async () => {
  try {
    const { cachedAliases } = await browser.storage.local.get({ cachedAliases: null })
    if (!cachedAliases || cachedAliases.key !== aliasCacheKey()) return false
    aliases.value = cachedAliases.data
    aliasesMeta.value = cachedAliases.meta
    aliasesHaveNextPage.value = cachedAliases.hasNextPage
    aliasesTitle.value = 'Aliases'
    return true
  } catch (err) {
    console.log(err)
    return false
  }
}

const saveAliasCache = (data) =>
  browser.storage.local
    .set({
      cachedAliases: {
        key: aliasCacheKey(),
        data: data.data,
        meta: data.meta,
        hasNextPage: Boolean(data.links && data.links.next),
      },
    })
    .catch((err) => console.log(err))

/**
 * One alias can be held more than once: in the list, as the alias being
 * viewed, and as this site's alias on the Create Alias tab. Apply a change to
 * every copy, and to the saved list, so no view shows an old status.
 */
const updateAliasEverywhere = (id, changes) => {
  for (const copy of [...aliases.value, aliasToView.value, existingSiteAlias.value]) {
    if (copy && copy.id === id) Object.assign(copy, changes)
  }
  browser.storage.local
    .get({ cachedAliases: null })
    .then(({ cachedAliases }) => {
      const saved = cachedAliases?.data?.find((a) => a.id === id)
      if (!saved) return
      Object.assign(saved, changes)
      return browser.storage.local.set({ cachedAliases })
    })
    .catch((err) => console.log(err))
}

/**
 * Load a page of aliases. With refreshInBackground the list already on screen
 * stays visible instead of the loader while the request runs.
 */
const getAliases = async (calledFromMounted = false, { refreshInBackground = false } = {}) => {
  error.value = ''

  // To prevent overriding the users choice of tab to display on extension open
  if (!calledFromMounted) {
    selected.value = 'Aliases'
  }

  // A newer request replaces one still loading, so a slow response cannot overwrite it
  abortController.value?.abort()
  const controller = new AbortController()
  abortController.value = controller

  const firstPage = aliasesCurrentPage.value == 1
  if (firstPage) {
    getAliasesLoading.value = !refreshInBackground
    showMoreAliasesLoading.value = false
  }

  const params = new URLSearchParams({
    'filter[deleted]': showDeletedAliases.value,
    'filter[active]': showActiveAliases.value,
    'filter[pinned]': showPinnedAliases.value,
    'filter[search]': searchInput.value.length > 2 ? searchInput.value : '',
    sort: `${defaultAliasSortDir.value}${defaultAliasSort.value}`,
    'page[number]': aliasesCurrentPage.value,
    'page[size]': 10,
    with: 'labels',
  })

  try {
    const response = await apiFetch(`/aliases?${params}`, { signal: controller.signal })

    if (response.status === 200) {
      let data = await response.json()

      if (firstPage) {
        aliases.value = data.data
      } else {
        aliases.value = aliases.value.concat(data.data)
      }

      if (searchInput.value) {
        aliasesTitle.value = `Search Results (${data.meta.total} `
        aliasesTitle.value += data.meta.total === 1 ? 'match)' : 'matches)'
      } else {
        aliasesTitle.value = 'Aliases'
      }

      aliasesHaveNextPage.value = Boolean(data.links && data.links.next)
      aliasesMeta.value = data.meta

      if (firstPage && !searchInput.value) {
        saveAliasCache(data)
      }
    } else {
      handleErrorResponse(response)
    }
  } catch (err) {
    // The request that replaced this one owns the loading state
    if (err.name === 'AbortError') return
    error.value = GENERIC_ERROR_MESSAGE
    console.log(err)
  }

  if (abortController.value === controller) {
    getAliasesLoading.value = false
    showMoreAliasesLoading.value = false
  }
}

const getInstanceForLogin = () =>
  changeInstance.value ? instanceInput.value : instance.value || instanceInput.value

/** Save the API key from a login response and load the account's data */
const completeLogin = async (baseUrl, data) => {
  // The key belongs to the instance that issued it
  instance.value = baseUrl
  apiToken.value = data.api_key
  apiTokenFromLogin.value = true
  if (data.expires_at) {
    await browser.storage.local.set({ apiTokenExpiresAt: data.expires_at })
  }
  getAliases()
  getRecipientsRequest()
  getLabelsRequest()
  const domainResponse = await apiFetch('/domain-options')
  if (domainResponse.status === 200) {
    applyDomainOptionsData(await domainResponse.json())
  }
  success('Logged in successfully')
}

const loginWithCredentials = async () => {
  error.value = ''
  const baseUrl = getInstanceForLogin()

  if (!usernameInput.value.trim()) {
    error.value = 'Please enter your username.'
    return
  }
  if (!passwordInput.value) {
    error.value = 'Please enter your password.'
    return
  }
  const instanceMessage = changeInstance.value ? instanceError(baseUrl) : ''
  if (instanceMessage) {
    error.value = instanceMessage
    return
  }

  credentialsLoading.value = true
  const deviceName = getBrowserExtensionDeviceName()
  const expiration = requireReloginAfter.value || null

  try {
    const response = await apiRequest({
      instance: baseUrl,
      path: '/api/auth/login',
      method: 'POST',
      body: {
        username: usernameInput.value.trim(),
        password: passwordInput.value,
        device_name: deviceName,
        expiration: expiration || undefined,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (response.ok) {
      credentialsLoading.value = false
      if (!data.api_key) {
        error.value = 'Login succeeded but no API key was returned.'
        return
      }
      pendingLoginDeviceName.value = ''
      pendingLoginExpiration.value = ''
      tokenInput.value = ''
      usernameInput.value = ''
      passwordInput.value = ''
      await completeLogin(baseUrl, data)
      return
    }

    if (response.status === 422 && data.mfa_key) {
      mfaKey.value = data.mfa_key
      pendingLoginDeviceName.value = deviceName
      pendingLoginExpiration.value = expiration
      mfaRequired.value = true
      mfaOtp.value = ''
      error.value = ''
      credentialsLoading.value = false
      return
    }

    error.value = data.message || 'An error occurred during login.'
    credentialsLoading.value = false
  } catch (err) {
    credentialsLoading.value = false
    error.value = 'An error occurred during login.'
    console.log(err)
  }
}

const submitMfa = async () => {
  if (mfaOtp.value.length !== 6) return
  error.value = ''
  const baseUrl = getInstanceForLogin()

  credentialsLoading.value = true
  try {
    const response = await apiRequest({
      instance: baseUrl,
      path: '/api/auth/mfa',
      method: 'POST',
      body: {
        mfa_key: mfaKey.value,
        otp: mfaOtp.value,
        device_name: pendingLoginDeviceName.value,
        expiration: pendingLoginExpiration.value || undefined,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (response.ok) {
      credentialsLoading.value = false
      if (!data.api_key) {
        error.value = 'Verification succeeded but no API key was returned.'
        return
      }
      mfaRequired.value = false
      mfaKey.value = ''
      mfaOtp.value = ''
      pendingLoginDeviceName.value = ''
      pendingLoginExpiration.value = ''
      await completeLogin(baseUrl, data)
      return
    }

    error.value = data.message || 'Invalid or expired code. Try again or go back to login.'
    credentialsLoading.value = false
  } catch (err) {
    credentialsLoading.value = false
    error.value = 'An error occurred during verification.'
    console.log(err)
  }
}

const getAliasDomainOptions = async (token, instanceArgument, renew = false, silent = false) => {
  error.value = ''

  // Renewing shows errors as a notification because the form is in a modal
  const fail = (message) => (renew ? errorNotification(message) : (error.value = message))

  if (!token) {
    return fail('An API key is required to login!')
  }

  if (!validToken(token)) {
    return fail("Invalid API key format, please check that you've entered it correctly!")
  }

  if (token.length < 40) {
    return fail("That API key is too short, please check that you've entered it correctly!")
  }

  if (token.length > 60) {
    return fail("That API key is too long, please check that you've entered it correctly!")
  }

  const instanceMessage = changeInstance.value ? instanceError(instanceArgument) : ''
  if (instanceMessage) {
    return fail(instanceMessage)
  }

  domainOptionsLoading.value = true

  try {
    const response = await apiFetch('/domain-options', {
      instance: instanceArgument,
      apiToken: token,
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
        error.value = AUTH_EXPIRED_MESSAGE
      }
    } else if (response.status === 200) {
      // Clear token input
      tokenInput.value = ''

      if (!instance.value) {
        instance.value = instanceArgument
      }

      if (!apiToken.value) {
        apiToken.value = token
        apiTokenFromLogin.value = false
        await browser.storage.local.remove('apiTokenExpiresAt')
        getAliases()
        getRecipientsRequest(silent)
        getLabelsRequest(silent)

        if (!silent) {
          success('Logged in successfully')
        }
      } else if (renew) {
        apiToken.value = token
        apiTokenFromLogin.value = false
        // A pasted key does not expire, unlike the password sign-in it replaces
        await browser.storage.local.remove('apiTokenExpiresAt')
        renewApiKeyModalOpen.value = false

        if (!silent) {
          success('Renewed API Key successfully')
        }
      } else {
        if (!silent) {
          success('Domains and defaults refreshed')
        }
      }

      applyDomainOptionsData(await response.json())
      await browser.storage.local.set({ lastDomainOptionsRefreshAt: Date.now() })

      if (
        sharedDomainSelected.value &&
        aliasFormat.value === 'custom' &&
        !subscribedOrSelfHosting.value
      ) {
        aliasFormat.value = 'random_characters'
      }
    } else if (response.status === 419) {
      fail(AD_BLOCKER_MESSAGE)
    } else {
      fail(GENERIC_ERROR_MESSAGE)
    }
  } catch (err) {
    domainOptionsLoading.value = false
    fail(GENERIC_ERROR_MESSAGE)
    console.log(err)
  }
}

const getRecipientsRequest = async (silent = false) => {
  recipientsLoading.value = true

  try {
    const response = await apiFetch('/recipients?filter[verified]=true&alias_count=false')

    if (response.status === 200) {
      let data = await response.json()

      recipients.value = data.data.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
      }))
      await browser.storage.local.set({ lastRecipientsRefreshAt: Date.now() })

      if (!silent && ['Settings', 'CreateAlias'].includes(selected.value)) {
        success('Recipients refreshed')
      }
    } else {
      handleErrorResponse(response)
    }
  } catch (err) {
    error.value = GENERIC_ERROR_MESSAGE
    console.log(err)
  }

  recipientsLoading.value = false
}

const getLabelsRequest = async (silent = false) => {
  labelsLoading.value = true

  try {
    const response = await apiFetch('/labels')

    if (response.status === 200) {
      let data = await response.json()

      labels.value = data.data.map((label) => ({
        id: label.id,
        name: label.name,
        colour: label.colour,
      }))
      await browser.storage.local.set({ lastLabelsRefreshAt: Date.now() })

      if (!silent && ['Settings', 'CreateAlias'].includes(selected.value)) {
        success('Labels refreshed')
      }
    } else {
      handleErrorResponse(response)
    }
  } catch (err) {
    error.value = GENERIC_ERROR_MESSAGE
    console.log(err)
  }

  labelsLoading.value = false
}

const createAlias = async () => {
  // Validate alias local part
  if (aliasFormat.value === 'custom' && !validLocalPart(localPart.value)) {
    return (error.value = 'Valid local part required')
  }

  if (aliasFormat.value === 'custom' && sharedDomainSelected.value && localPart.value.length < 2) {
    return (error.value = 'Please enter at least 2 characters for the local part.')
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
    const { data } = await createAliasRequest({
      instance: instance.value,
      apiToken: apiToken.value,
      domain: domain.value,
      localPart: localPart.value,
      description: description.value ? description.value : currentTabHostname.value,
      format: aliasFormat.value,
      recipientIds: createAliasRecipientIds.value,
      labelIds: createAliasLabelIds.value,
    })

    createAliasLoading.value = false
    localPart.value = ''
    description.value = ''
    createAliasRecipientIds.value = []
    createAliasLabelIds.value = []
    newAlias.value = formatAliasEmail(data)
    const createdCount = await incrementAliasesCreatedCount()
    showRateExtensionLink.value = await claimRateExtensionLink(createdCount)

    if (autoCopyNewAlias.value) {
      await copyToClipboard(formatAliasEmail(data))
    }

    aliases.value = [data].concat(aliases.value)
  } catch (err) {
    createAliasLoading.value = false
    if (err.code === 'UNAUTHENTICATED') {
      logout(true)
      error.value = AUTH_EXPIRED_MESSAGE
    } else {
      error.value = err.message || GENERIC_ERROR_MESSAGE
      console.log(err)
    }
  }
}

const editAliasDescription = async (alias) => {
  editAliasDescriptionLoading.value = true

  try {
    const response = await apiFetch(`/aliases/${alias.id}`, {
      method: 'PATCH',
      body: { description: aliasDescriptionToEdit.value },
    })

    editAliasDescriptionLoading.value = false

    if (response.status === 200) {
      updateAliasEverywhere(alias.id, { description: aliasDescriptionToEdit.value })
      aliasDescriptionToEdit.value = ''
      aliasToViewDescriptionEditing.value = false
      success('Alias description updated successfully')
    } else {
      handleErrorResponse(response)
    }
  } catch (err) {
    editAliasDescriptionLoading.value = false
    aliasDescriptionToEdit.value = ''
    aliasToViewDescriptionEditing.value = false
    error.value = GENERIC_ERROR_MESSAGE
    console.log(err)
  }
}

const editAliasLabels = async (alias) => {
  editAliasLabelsLoading.value = true
  error.value = ''

  try {
    const response = await apiFetch('/alias-labels', {
      method: 'POST',
      body: { alias_id: alias.id, label_ids: aliasLabelIdsToEdit.value },
    })

    const data = await response.json().catch(() => ({}))

    editAliasLabelsLoading.value = false

    if (response.status === 200 && data.data) {
      updateAliasEverywhere(alias.id, { labels: data.data.labels || [] })
      aliasLabelIdsToEdit.value = []
      aliasToViewLabelsEditing.value = false
      success('Alias labels updated successfully')
    } else {
      handleErrorResponse(response, data)
    }
  } catch (err) {
    editAliasLabelsLoading.value = false
    error.value = GENERIC_ERROR_MESSAGE
    console.log(err)
  }
}

/**
 * Send one alias action. Runs onSuccess when the response has the expected
 * status, otherwise shows the error. The loading ref is set while it runs.
 */
const aliasAction = async ({ loading, path, method, body, okStatus, onSuccess, onError }) => {
  loading.value = true

  try {
    const response = await apiFetch(path, { method, body })
    loading.value = false

    if (response.status === okStatus) {
      onSuccess()
    } else if (!onError || !onError(response)) {
      handleErrorResponse(response)
    }
  } catch (err) {
    loading.value = false
    error.value = GENERIC_ERROR_MESSAGE
    console.log(err)
  }
}

const activateAlias = (alias) =>
  aliasAction({
    loading: activateAliasLoading,
    path: '/active-aliases',
    method: 'POST',
    body: { id: alias.id },
    okStatus: 200,
    onSuccess: () => {
      updateAliasEverywhere(alias.id, { active: true })
      success('Alias activated successfully')
    },
    onError: (response) => {
      if (response.status !== 403) return false
      error.value = 'You have reached your active shared domain alias limit'
      return true
    },
  })

const deactivateAlias = (alias) =>
  aliasAction({
    loading: deactivateAliasLoading,
    path: `/active-aliases/${alias.id}`,
    method: 'DELETE',
    okStatus: 204,
    onSuccess: () => {
      updateAliasEverywhere(alias.id, { active: false })
      success('Alias deactivated successfully')
    },
  })

const pinAlias = (alias) =>
  aliasAction({
    loading: pinAliasLoading,
    path: '/pinned-aliases',
    method: 'POST',
    body: { id: alias.id },
    okStatus: 200,
    onSuccess: () => {
      alias.pinned = true
      aliasesCurrentPage.value = 1
      getAliases(true) // To ensure correct pinned order
      success('Alias pinned successfully')
    },
  })

const unpinAlias = (alias) =>
  aliasAction({
    loading: unpinAliasLoading,
    path: `/pinned-aliases/${alias.id}`,
    method: 'DELETE',
    okStatus: 204,
    onSuccess: () => {
      alias.pinned = false
      aliasesCurrentPage.value = 1
      getAliases(true) // To ensure correct pinned order
      success('Alias unpinned successfully')
    },
  })

const deleteAlias = async (alias) => {
  await aliasAction({
    loading: deleteAliasLoading,
    path: `/aliases/${alias.id}`,
    method: 'DELETE',
    okStatus: 204,
    onSuccess: () => {
      updateAliasEverywhere(alias.id, { deleted_at: new Date().toISOString(), active: false })
      success('Alias deleted successfully')
    },
  })
  deleteAliasModalOpen.value = false
}

const forgetAlias = async (alias) => {
  await aliasAction({
    loading: forgetAliasLoading,
    path: `/aliases/${alias.id}/forget`,
    method: 'DELETE',
    okStatus: 204,
    onSuccess: () => {
      aliases.value = aliases.value.filter((a) => a.id !== alias.id)
      success('Alias forgotten successfully')
    },
  })
  selected.value = 'Aliases'
  forgetAliasModalOpen.value = false
}

const restoreAlias = async (alias) => {
  await aliasAction({
    loading: restoreAliasLoading,
    path: `/aliases/${alias.id}/restore`,
    method: 'PATCH',
    okStatus: 200,
    onSuccess: () => {
      updateAliasEverywhere(alias.id, { deleted_at: null, active: true })
      success('Alias restored successfully')
    },
  })
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
  cancelEditLabels()
  selected.value = 'ViewAlias'
  aliasToView.value = alias
}

const startEditAliasLabels = async () => {
  aliasToViewLabelsEditing.value = true
  aliasLabelIdsToEdit.value = (aliasToView.value.labels || []).map((label) => label.id)

  if (!labels.value.length) {
    await getLabelsRequest(true)
  }
}

const cancelEditLabels = () => {
  aliasToViewLabelsEditing.value = false
  aliasLabelIdsToEdit.value = []
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

const truncateLabelName = (name, max = 12) => {
  if (!name || name.length <= max) return name
  return `${name.slice(0, max)}…`
}

const getAdditionalAliasLabelNames = (labels) => {
  return labels
    .slice(1)
    .map((label) => label.name)
    .join(', ')
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
  instanceInput.value = DEFAULT_INSTANCE
}

const switchToCredentialsLogin = () => {
  loginMode.value = 'credentials'
  error.value = ''
}

const resetMfaStep = () => {
  mfaRequired.value = false
  mfaOtp.value = ''
  error.value = ''
}

const validInstance = (instance) => {
  let re = /^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+(?<!\/)$/
  return re.test(instance)
}

/** Plain http is only allowed where traffic stays on this machine or network */
const isLocalHostname = (hostname) =>
  /^(localhost|127(\.\d+){3}|\[::1\]|10(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2})$/.test(
    hostname
  ) || /\.(local|localhost|lan|home\.arpa)$/.test(hostname)

/** The reason this instance URL cannot be used, or '' when it is fine */
const instanceError = (url) => {
  if (!validInstance(url)) {
    return 'Please enter a valid URL for the instance with no trailing slash, e.g. "https://app.example.com"'
  }
  const { protocol, hostname } = new URL(url)
  if (protocol === 'http:' && !isLocalHostname(hostname)) {
    return 'Please use https:// for your instance. Your password and API key would be sent unencrypted over http://.'
  }
  return ''
}

const BROWSER_NAMES = {
  edge: 'Edge',
  safari: 'Safari',
  firefox: 'Firefox',
  opera: 'Opera',
  brave: 'Brave',
  vivaldi: 'Vivaldi',
  yandex: 'Yandex',
  samsung: 'Samsung Internet',
  chrome: 'Chrome',
}

const getBrowserExtensionDeviceName = () => `${BROWSER_NAMES[detectBrowser()]} browser extension`

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

const getAliasLocalPart = (alias) => {
  return alias.extension ? `${alias.local_part}+${alias.extension}` : alias.local_part
}

/** Fallback for older browsers and Safari */
const copyWithTextarea = (text) => {
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
    return document.execCommand('copy')
  } catch (err) {
    console.error('Failed to copy text: ', err)
    return false
  } finally {
    textArea.remove()
  }
}

const copyToClipboard = async (text, onSuccessCallback = null) => {
  let copied = false
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      copied = true
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }
  if (!copied) copied = copyWithTextarea(text)

  if (copied) {
    onSuccessCallback?.()
    success('Copied to clipboard')
  } else {
    errorNotification('Failed to copy to clipboard')
  }
  return copied
}

const success = (text = '') => {
  notify({ text, type: 'success' })
}

const errorNotification = (text = '') => {
  notify({ text, type: 'error' })
}

const LOGOUT_REQUEST_TIMEOUT_MS = 5000

/**
 * Delete a key the extension created at sign-in. A pasted key is left alone,
 * since it may also be in use elsewhere. Failure does not block logging out.
 */
const revokeLoginToken = async () => {
  if (!apiTokenFromLogin.value || !apiToken.value || !instance.value) return
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOGOUT_REQUEST_TIMEOUT_MS)
  try {
    await apiRequest({
      instance: instance.value,
      apiToken: apiToken.value,
      path: '/api/auth/logout',
      method: 'POST',
      signal: controller.signal,
    })
  } catch (err) {
    console.log(err)
  } finally {
    clearTimeout(timer)
  }
}

const logout = async (expiredToken = false) => {
  // A response still loading must not write the old account's aliases back
  abortController.value?.abort()

  if (!expiredToken) {
    logoutLoading.value = true
    // An expired or revoked key is already invalid on the server
    await revokeLoginToken()
  }

  try {
    // Only this device's account data. Synced preferences are shared with the
    // user's other browsers, which may still be signed in.
    await browser.storage.local.remove(LOCAL_KEYS)
    await loadSettings()

    logoutModalOpen.value = false
    if (!expiredToken) {
      logoutLoading.value = false
      success('Logged out successfully')
    }
  } catch (err) {
    logoutLoading.value = false
    console.log(err)
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

const openInTab = async () => {
  const url = browser.runtime.getURL('app.html') + '?uilocation=tab'
  await browser.tabs.create({ url })
  window.close()
}

const store = {
  apiTokenFromLogin,
  AD_BLOCKER_MESSAGE,
  AUTH_EXPIRED_MESSAGE,
  AUTO_REFRESH_INTERVAL_MS,
  BROWSER_NAMES,
  GENERIC_ERROR_MESSAGE,
  LOCAL_DEFAULTS,
  STORE_URLS,
  SYNC_DEFAULTS,
  abortController,
  activateAlias,
  activateAliasLoading,
  activeTheme,
  aliasAction,
  aliasDescriptionToEdit,
  aliasFormat,
  aliasFormatOptions,
  aliasLabelIdsToEdit,
  aliasSortOptions,
  aliasToView,
  aliasToViewDescriptionEditing,
  aliasToViewHasSharedDomain,
  aliasToViewLabelsEditing,
  aliases,
  aliasesCurrentPage,
  aliasesHaveNextPage,
  aliasesMeta,
  aliasesTitle,
  apiFetch,
  apiToken,
  applyDomainOptionsData,
  autoCopyNewAlias,
  autoFillLocalPart,
  availableSharedDomains,
  browser,
  cancelChangeInstance,
  cancelEditDescription,
  cancelEditLabels,
  changeInstance,
  completeLogin,
  copyToClipboard,
  copyWithTextarea,
  createAlias,
  createAliasLabelIds,
  createAliasLoading,
  createAliasRecipientIds,
  credentialsLoading,
  currentTabHostname,
  darkSchemeQuery,
  deactivateAlias,
  deactivateAliasLoading,
  defaultAliasSort,
  defaultAliasSortDir,
  defaultSelected,
  deleteAlias,
  deleteAliasLoading,
  deleteAliasModalOpen,
  description,
  displaySendFromAddress,
  domain,
  domainOptions,
  domainOptionsLoading,
  editAliasDescription,
  editAliasDescriptionLoading,
  editAliasLabels,
  editAliasLabelsLoading,
  emailFieldIconPosition,
  error,
  errorRevision,
  existingSiteAlias,
  errorNotification,
  existingAliasCount,
  existingAliasForSite,
  existingAliasHasMore,
  extensionUrl,
  extensionVersion,
  extensionWindow,
  forgetAlias,
  forgetAliasLoading,
  forgetAliasModalOpen,
  formatAliasEmail,
  getAdditionalAliasLabelNames,
  getAliasDomainOptions,
  getAliasLocalPart,
  getAliasStatus,
  getAliases,
  getAliasesLoading,
  getBrowserExtensionDeviceName,
  getCurrentTabHostname,
  getExtensionWindow,
  getInstanceForLogin,
  getLabelsRequest,
  getRecipientsRequest,
  handleErrorResponse,
  init,
  instance,
  instanceError,
  instanceInput,
  isLocalHostname,
  isPopupOrSidebar,
  labels,
  labelsLoading,
  loadSettings,
  localPart,
  localPartAutoFill,
  localPartSuggestions,
  localPartSuggestionsForCreate,
  localSettings,
  loginMode,
  loginWithCredentials,
  logout,
  logoutLoading,
  logoutModalOpen,
  lookupExistingAliasForSite,
  maybeAutoRefreshDomainAndRecipients,
  mfaKey,
  mfaOtp,
  mfaOtpInput,
  mfaRequired,
  newAlias,
  newAliasCopied,
  openInTab,
  openSendFromAlias,
  passwordInput,
  pendingLoginDeviceName,
  pendingLoginExpiration,
  persistSettings,
  pinAlias,
  pinAliasLoading,
  popout,
  prefersDark,
  recipients,
  recipientsLoading,
  renewApiKeyModalOpen,
  requireReloginAfter,
  resetMfaStep,
  restoreAlias,
  restoreAliasLoading,
  restoreAliasModalOpen,
  reuseExistingAlias,
  searchInput,
  selected,
  selfHosting,
  sendFromAddressCopied,
  sendFromAliasDestination,
  sendFromAliasEmailToSendTo,
  setNewAliasCopied,
  setSendFromAddressCopied,
  sharedDomainSelected,
  shouldAutoRefresh,
  showActiveAliases,
  showAliasCreatedNotification,
  showAliasStatus,
  showAliasesForSite,
  showContextMenuOption,
  showDeletedAliases,
  showIconInEmailFields,
  showMoreAliases,
  showMoreAliasesLoading,
  showOpenInTab,
  showPinnedAliases,
  showRateExtensionLink,
  showSearchSuggestions,
  startEditAliasLabels,
  submitMfa,
  subscribed,
  subscribedOrSelfHosting,
  success,
  switchToCredentialsLogin,
  syncSettings,
  tabs,
  theme,
  tokenInput,
  truncateLabelName,
  unpinAlias,
  unpinAliasLoading,
  usernameInput,
  validEmail,
  validInstance,
  validLocalPart,
  validToken,
  viewAlias,
}

export const useAddy = () => store
