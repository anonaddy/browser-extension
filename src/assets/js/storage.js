import browser from 'webextension-polyfill'

/**
 * Account data and API caches stay on this device and are cleared on logout.
 * storage.sync would copy the API token to every browser on the account, and
 * one device's logout would then break the others. Its 8 KB item limit is also
 * too small for long recipient or label lists. Preferences stay in storage.sync.
 */
export const LOCAL_KEYS = [
  'apiToken',
  'apiTokenExpiresAt',
  'apiTokenFromLogin',
  'instance',
  'domain',
  'aliasFormat',
  'domainOptions',
  'availableSharedDomains',
  'recipients',
  'labels',
  'lastDomainOptionsRefreshAt',
  'lastRecipientsRefreshAt',
  'lastLabelsRefreshAt',
  'cachedAliases',
]

let migration = null

async function copySyncToLocal() {
  // Not in LOCAL_KEYS, so it survives logout and a logged-out device does
  // not copy the old sync values again
  const { migratedFromSync } = await browser.storage.local.get({ migratedFromSync: false })
  if (migratedFromSync) return

  const fromSync = await browser.storage.sync.get(LOCAL_KEYS)
  const existing = await browser.storage.local.get(Object.keys(fromSync))
  const toCopy = { migratedFromSync: true }
  for (const [key, value] of Object.entries(fromSync)) {
    if (!(key in existing)) toCopy[key] = value
  }
  await browser.storage.local.set(toCopy)
}

/**
 * Copy account data that versions before 3.2.0 kept in storage.sync to this
 * device, once. The sync copies are left in place: browsers on the same
 * account that have not updated yet still read them, and removing them would
 * log those browsers out. Safe to call repeatedly.
 */
export function migrateSyncToLocal() {
  if (!migration) {
    migration = copySyncToLocal().catch((err) => {
      migration = null
      console.warn('[addy.io] storage migration failed', err)
    })
  }
  return migration
}
