import browser from 'webextension-polyfill'
import psl from 'psl'
import { createAliasRequest, formatAliasEmail } from './assets/js/api/createAlias.js'
import { listAliasesForSite } from './assets/js/api/findAliasForSite.js'
import { incrementAliasesCreatedCount } from './assets/js/aliasCreateCount.js'
import { migrateSyncToLocal } from './assets/js/storage.js'
import { SHARED_DOMAINS } from './assets/js/constants.js'

const CONTEXT_MENU_ID = 'addy-generate-alias'
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
  await migrateSyncToLocal()
  const { apiToken, instance, domain, aliasFormat } = await browser.storage.local.get({
    apiToken: '',
    instance: '',
    domain: '',
    aliasFormat: 'random_characters',
  })
  const { autoFillLocalPart } = await browser.storage.sync.get({ autoFillLocalPart: '' })

  if (!apiToken || !instance || !domain) {
    throw new Error('Not logged in or missing settings. Open the addy.io extension to sign in.')
  }

  let format = aliasFormat || 'random_characters'
  let localPart = ''

  if (format === 'custom') {
    localPart = deriveCustomLocalPartFromHostname(hostname, autoFillLocalPart)

    // Shared domains require at least 2 chars for custom local parts.
    if (!localPart || (SHARED_DOMAINS.includes(domain) && localPart.length < 2)) {
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
 * This site's aliases as { email, description }, newest first. An alias made in the last few
 * minutes comes first, since a new alias can take a moment to appear in search.
 * Empty when alias reuse is turned off. A failed search also returns none, so
 * alias creation can continue. A 401 is thrown so the caller can show it.
 */
async function findSiteAliases(hostname) {
  const host = typeof hostname === 'string' ? hostname.trim() : ''
  await migrateSyncToLocal()
  const { apiToken, instance } = await browser.storage.local.get({ apiToken: '', instance: '' })
  const { reuseExistingAlias } = await browser.storage.sync.get({ reuseExistingAlias: true })
  if (reuseExistingAlias === false || !host) return []

  const found = []
  const add = (email, description) => {
    if (!found.some((alias) => alias.email === email)) found.push({ email, description })
  }
  // Aliases made here are described with the hostname
  const recent = readRecentAlias(host)
  if (recent) add(recent, host)

  if (apiToken && instance) {
    try {
      const matches = await listAliasesForSite({ instance, apiToken, hostname: host })
      matches.forEach((alias) => add(formatAliasEmail(alias), alias.description || ''))
    } catch (err) {
      if (err && err.code === 'UNAUTHENTICATED') throw err
    }
  }
  return found
}

async function createSiteAlias(hostname) {
  const host = typeof hostname === 'string' ? hostname.trim() : ''
  const aliasEmail = await createQuickAlias(host, host)
  rememberAlias(host, aliasEmail)
  return aliasEmail
}

/** For the shortcut and context menu: reuse the newest site alias, or create one. */
async function resolveAliasForSite(hostname) {
  const [existing] = await findSiteAliases(hostname)
  if (existing) {
    rememberAlias(hostname, existing.email)
    return { aliasEmail: existing.email, created: false }
  }
  return { aliasEmail: await createSiteAlias(hostname), created: true }
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
      // Top frame only, so third-party iframes never receive the alias.
      await browser.tabs.sendMessage(
        tab.id,
        { type: 'COPY_TO_CLIPBOARD', text: aliasEmail },
        { frameId: 0 }
      )
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

/** Update the menu item in place. Create it only when it does not exist yet. */
async function setContextMenuVisibility(visible, reuseExistingAlias = true) {
  const title = contextMenuTitle(reuseExistingAlias)
  try {
    await browser.contextMenus.update(CONTEXT_MENU_ID, { title, visible })
    return
  } catch (_) {
    // Not created yet
  }

  if (!visible) return

  await new Promise((resolve, reject) => {
    browser.contextMenus.create({ id: CONTEXT_MENU_ID, title, contexts: ['all'] }, () => {
      const err = browser.runtime.lastError
      // A concurrent create already made it
      if (err && !/duplicate|already exists/i.test(err.message)) reject(err)
      else resolve()
    })
  })
}

let contextMenuQueue = Promise.resolve()

/** Run one sync at a time. Install, startup, worker wake and setting changes can overlap. */
function syncContextMenuVisibility() {
  contextMenuQueue = contextMenuQueue.catch(() => {}).then(syncContextMenuVisibilityNow)
  return contextMenuQueue
}

async function syncContextMenuVisibilityNow() {
  await migrateSyncToLocal()
  const { apiToken } = await browser.storage.local.get({ apiToken: '' })
  const { showContextMenuOption, reuseExistingAlias } = await browser.storage.sync.get({
    showContextMenuOption: true,
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
  const relevant =
    areaName === 'local'
      ? changes.apiToken
      : areaName === 'sync' && (changes.showContextMenuOption || changes.reuseExistingAlias)
  if (relevant) {
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
  if (message.type === 'FIND_ALIASES_FOR_INPUT') {
    findSiteAliases(message.hostname)
      .then((aliases) => sendResponse({ aliases }))
      .catch((err) => {
        const msg = err.message || 'Failed to look up aliases'
        showErrorNotification(msg)
        sendResponse({ error: msg })
      })
    return true
  }
  if (message.type === 'CREATE_ALIAS_FOR_INPUT') {
    // forceCreate comes from the picker's "Create new alias", after the user saw the existing ones
    const resolve = message.forceCreate
      ? createSiteAlias(message.description).then((aliasEmail) => ({ aliasEmail }))
      : resolveAliasForSite(message.description)
    resolve
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
