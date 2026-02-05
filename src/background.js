import browser from 'webextension-polyfill'
import { createAliasRequest, formatAliasEmail } from './assets/js/api/createAlias.js'

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

function getDefaultRecipientIds(recipients) {
  if (!Array.isArray(recipients) || recipients.length === 0) return []
  const list = Array.isArray(recipients) ? recipients : Object.values(recipients)
  const first = list[0]
  return first && first.id ? [first.id] : []
}

async function createQuickAlias() {
  const { apiToken, instance, domain, aliasFormat, recipients } = await browser.storage.sync.get({
    apiToken: '',
    instance: '',
    domain: '',
    aliasFormat: 'random_characters',
    recipients: [],
  })

  if (!apiToken || !instance || !domain) {
    throw new Error('Not logged in or missing settings. Open the addy.io extension to sign in.')
  }

  // Quick-create cannot provide a local-part, so do not use "custom" format
  const format = aliasFormat === 'custom' ? 'random_characters' : aliasFormat || 'random_characters'

  const recipientIds = getDefaultRecipientIds(recipients)
  const { data } = await createAliasRequest({
    instance,
    apiToken,
    domain,
    format,
    recipientIds,
    description: '',
  })

  return formatAliasEmail(data)
}

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Create and copy new addy.io alias',
    contexts: ['all'],
  })
})

browser.contextMenus.onClicked.addListener(async (_info, tab) => {
  if (_info.menuItemId !== CONTEXT_MENU_ID) return
  try {
    const aliasEmail = await createQuickAlias()
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
    await browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('img/icon_128.png'),
      title: 'addy.io',
      message: `Alias created: ${aliasEmail}`,
    })
  } catch (err) {
    await showErrorNotification(err.message)
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
    createQuickAlias()
      .then((aliasEmail) => sendResponse({ aliasEmail }))
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
