import browser from 'webextension-polyfill'
import psl from 'psl'
import { createAliasRequest, formatAliasEmail } from './assets/js/api/createAlias.js'
import { findAliasForSite } from './assets/js/api/findAliasForSite.js'
import { incrementAliasesCreatedCount } from './assets/js/aliasCreateCount.js'

const CONTEXT_MENU_ID = 'addy-generate-alias'
const SHARED_DOMAINS = new Set([
  'anonaddy.me',
  'anonaddy.com',
  '4wrd.cc',
  'mailer.me',
  'addymail.com',
  'addy.io',
  'addy.to',
])
let iconDataUrlCache = null

async function getIconDataUrl() {
  if (iconDataUrlCache) return iconDataUrlCache
  const url = browser.runtime.getURL('img/icon.svg')
  const response = await fetch(url)
  const blob = await response.blob()
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  iconDataUrlCache = dataUrl
  return dataUrl
}

function deriveCustomLocalPartFromHostname(hostname, autoFillLocalPart) {
  if (!hostname || !autoFillLocalPart) return ''
  const parsed = psl.parse(hostname)
  const sld = parsed && typeof parsed.sld === 'string' ? parsed.sld : ''
  const domain = parsed && typeof parsed.domain === 'string' ? parsed.domain : ''

  if (autoFillLocalPart === 'sld') return sld
  if (autoFillLocalPart === 'domain') return domain
  if (autoFillLocalPart === 'full') return hostname
  if (autoFillLocalPart === 'random' && sld) {
    return `${sld}.${Math.random().toString(36).substring(2, 5)}`
  }
  return ''
}

async function createQuickAlias(description = '', hostname = '') {
  const { apiToken, instance, domain, aliasFormat, autoFillLocalPart } =
    await browser.storage.sync.get({
      apiToken: '',
      instance: '',
      domain: '',
      aliasFormat: 'random_characters',
      autoFillLocalPart: '',
    })

  if (!apiToken || !instance || !domain) {
    throw new Error('Not logged in or missing settings. Open the addy.io extension to sign in.')
  }

  let format = aliasFormat || 'random_characters'
  let localPart = ''

  if (format === 'custom') {
    localPart = deriveCustomLocalPartFromHostname(hostname, autoFillLocalPart)

    // Shared domains require at least 2 chars for custom local parts.
    if (!localPart || (SHARED_DOMAINS.has(domain) && localPart.length < 2)) {
      // Fall back to random when custom cannot be safely derived.
      format = 'random_characters'
      localPart = ''
    }
  }

  const { data } = await createAliasRequest({
    instance,
    apiToken,
    domain,
    localPart,
    format,
    recipientIds: [],
    description: typeof description === 'string' ? description : '',
  })

  const email = formatAliasEmail(data)
  await incrementAliasesCreatedCount()
  return email
}

const RECENT_ALIAS_MS = 10 * 60 * 1000
const recentAliasByHost = new Map()

function readRecentAlias(hostname) {
  const cached = recentAliasByHost.get(hostname)
  if (!cached) return ''
  if (Date.now() - cached.at > RECENT_ALIAS_MS) {
    recentAliasByHost.delete(hostname)
    return ''
  }
  return cached.email
}

function rememberAlias(hostname, email) {
  if (!hostname || !email) return
  recentAliasByHost.set(hostname, { email, at: Date.now() })
}

/**
 * Reuse an alias for this site when one already exists. Create one only when
 * the search has no strict match. The in-memory copy covers a second field
 * on the same page before the new alias appears in search.
 */
async function resolveAliasForSite(hostname) {
  const host = typeof hostname === 'string' ? hostname.trim() : ''
  const { apiToken, instance, reuseExistingAlias } = await browser.storage.sync.get({
    apiToken: '',
    instance: '',
    reuseExistingAlias: true,
  })

  if (reuseExistingAlias === false) {
    const aliasEmail = await createQuickAlias(host, host)
    return { aliasEmail, created: true }
  }

  const recent = host ? readRecentAlias(host) : ''
  if (recent) return { aliasEmail: recent, created: false }

  if (host && apiToken && instance) {
    try {
      const existing = await findAliasForSite({ instance, apiToken, hostname: host })
      if (existing && existing.email) {
        rememberAlias(host, existing.email)
        return { aliasEmail: existing.email, created: false }
      }
    } catch (err) {
      if (err && err.code === 'UNAUTHENTICATED') throw err
    }
  }

  const aliasEmail = await createQuickAlias(host, host)
  rememberAlias(host, aliasEmail)
  return { aliasEmail, created: true }
}

function getHostnameFromTab(tab) {
  try {
    if (!tab || !tab.url) return ''
    return new URL(tab.url).hostname || ''
  } catch (_) {
    return ''
  }
}

async function getActiveTab() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    return tabs && tabs.length ? tabs[0] : null
  } catch (_) {
    return null
  }
}

async function createAndCopyAliasForTab(tab) {
  const hostname = getHostnameFromTab(tab)
  const { aliasEmail, created } = await resolveAliasForSite(hostname)

  if (tab && tab.id) {
    try {
      await browser.tabs.sendMessage(tab.id, {
        type: 'COPY_TO_CLIPBOARD',
        text: aliasEmail,
      })
    } catch (_) {
      // Content script might not be loaded; clipboard from background is limited
    }
  }

  const { showAliasCreatedNotification } = await browser.storage.sync.get({
    showAliasCreatedNotification: true,
  })
  if (showAliasCreatedNotification === false) return

  await browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('img/icon_128.png'),
    title: 'addy.io',
    message: created ? `Alias created: ${aliasEmail}` : `Existing alias copied: ${aliasEmail}`,
  })
}

async function openExtensionViaCommand() {
  // Chromium
  if (browser.action && typeof browser.action.openPopup === 'function') {
    try {
      await browser.action.openPopup()
      return
    } catch (_) {}
  }

  // Firefox fallback (sidebar_action)
  if (browser.sidebarAction && typeof browser.sidebarAction.open === 'function') {
    try {
      await browser.sidebarAction.open()
    } catch (_) {}
  }
}

async function toggleSidebarViaCommand() {
  if (!browser.sidebarAction) return

  try {
    // Firefox-native toggle when available.
    if (typeof browser.sidebarAction.toggle === 'function') {
      await browser.sidebarAction.toggle()
      return
    }

    if (typeof browser.sidebarAction.open !== 'function') return

    const windowInfo = await browser.windows.getLastFocused()
    const windowId = windowInfo && typeof windowInfo.id === 'number' ? windowInfo.id : undefined

    if (typeof browser.sidebarAction.isOpen === 'function') {
      const isOpen = await browser.sidebarAction.isOpen({ windowId })
      if (isOpen && typeof browser.sidebarAction.close === 'function') {
        await browser.sidebarAction.close({ windowId })
        return
      }
    }

    await browser.sidebarAction.open({ windowId })
  } catch (err) {
    console.warn('[addy.io] failed to toggle sidebar', err)
  }
}

function contextMenuTitle(reuseExistingAlias) {
  return reuseExistingAlias === false
    ? 'Create and copy new addy.io alias'
    : 'Use or create and copy addy.io alias'
}

async function setContextMenuVisibility(visible, reuseExistingAlias = true) {
  try {
    await browser.contextMenus.remove(CONTEXT_MENU_ID)
  } catch (_) {}

  if (!visible) return

  await browser.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: contextMenuTitle(reuseExistingAlias),
    contexts: ['all'],
  })
}

async function syncContextMenuVisibility() {
  const { showContextMenuOption, apiToken, reuseExistingAlias } = await browser.storage.sync.get({
    showContextMenuOption: true,
    apiToken: '',
    reuseExistingAlias: true,
  })
  const loggedIn = typeof apiToken === 'string' && apiToken.trim().length > 0
  await setContextMenuVisibility(showContextMenuOption && loggedIn, reuseExistingAlias)
}

browser.runtime.onInstalled.addListener(() => {
  syncContextMenuVisibility().catch(() => {})
})

browser.runtime.onStartup.addListener(() => {
  syncContextMenuVisibility().catch(() => {})
})

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return
  if (changes.showContextMenuOption || changes.reuseExistingAlias || changes.apiToken) {
    syncContextMenuVisibility().catch(() => {})
  }
})

syncContextMenuVisibility().catch(() => {})

browser.contextMenus.onClicked.addListener(async (_info, tab) => {
  if (_info.menuItemId !== CONTEXT_MENU_ID) return
  try {
    await createAndCopyAliasForTab(tab)
  } catch (err) {
    await showErrorNotification(err.message)
  }
})

browser.commands.onCommand.addListener(async (command) => {
  if (command === 'open_addy_extension') {
    await openExtensionViaCommand()
    return
  }

  if (command === 'toggle_addy_sidebar') {
    await toggleSidebarViaCommand()
    return
  }

  if (command === 'create_and_copy_alias') {
    try {
      const tab = await getActiveTab()
      await createAndCopyAliasForTab(tab)
    } catch (err) {
      await showErrorNotification(err.message)
    }
  }
})

function showErrorNotification(message) {
  return browser.notifications.create({
    type: 'basic',
    iconUrl: browser.runtime.getURL('img/icon_128.png'),
    title: 'addy.io',
    message: message || 'Failed to create alias',
  })
}

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CREATE_ALIAS_FOR_INPUT') {
    resolveAliasForSite(message.description)
      .then(({ aliasEmail }) => sendResponse({ aliasEmail }))
      .catch((err) => {
        const msg = err.message || 'Failed to create alias'
        showErrorNotification(msg)
        sendResponse({ error: msg })
      })
    return true
  }
  if (message.type === 'GET_ICON_DATA_URL') {
    getIconDataUrl()
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }
})
