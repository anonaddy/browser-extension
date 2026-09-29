import browser from 'webextension-polyfill'

const STORAGE_KEY = 'aliasesCreatedCount'
const SHOWN_KEY = 'rateExtensionLinkShown'
export const RATE_EXTENSION_AFTER_CREATES = 5

export async function incrementAliasesCreatedCount() {
  const stored = await browser.storage.local.get({ [STORAGE_KEY]: 0 })
  const current = Number(stored[STORAGE_KEY] || 0)
  const count = Number.isFinite(current) && current > 0 ? current + 1 : 1
  await browser.storage.local.set({ [STORAGE_KEY]: count })
  return count
}

/** True only the first time the count reaches the review threshold. */
export async function claimRateExtensionLink(count) {
  if (count < RATE_EXTENSION_AFTER_CREATES) return false
  const stored = await browser.storage.local.get({ [SHOWN_KEY]: false })
  if (stored[SHOWN_KEY]) return false
  await browser.storage.local.set({ [SHOWN_KEY]: true })
  return true
}
