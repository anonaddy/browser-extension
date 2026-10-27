// A fake WebExtension API, so the built popup, background and content scripts
// can run in an ordinary page under test. Tests set window.__addyTest first:
//   { local, sync, tabUrl }
// Everything the scripts do through the API is recorded in window.__addyLog.
;(() => {
  const config = window.__addyTest || {}
  const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)))

  const log = (window.__addyLog = {
    writes: [],
    notifications: [],
    tabMessages: [],
    sentMessages: [],
  })

  const changeListeners = []

  function storageArea(name, initial) {
    const data = clone(initial) || {}
    const notify = (changes) => {
      if (Object.keys(changes).length) changeListeners.forEach((l) => l(changes, name))
    }
    return {
      _data: data,
      async get(keys) {
        if (keys == null) return clone(data)
        if (typeof keys === 'string') keys = [keys]
        if (Array.isArray(keys)) {
          return clone(Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]])))
        }
        return clone(
          Object.fromEntries(Object.entries(keys).map(([k, d]) => [k, k in data ? data[k] : d]))
        )
      },
      async set(items) {
        const changes = {}
        for (const [key, value] of Object.entries(items)) {
          log.writes.push(`${name}:${key}`)
          changes[key] = { oldValue: data[key], newValue: clone(value) }
          data[key] = clone(value)
        }
        notify(changes)
      },
      async remove(keys) {
        const changes = {}
        for (const key of [].concat(keys)) {
          if (!(key in data)) continue
          changes[key] = { oldValue: data[key] }
          delete data[key]
        }
        notify(changes)
      },
    }
  }

  // Popup, background and content script share one page, so messages go to
  // every listener, as they would across extension contexts.
  const messageListeners = []
  const sender = { id: 'test', url: location.href, frameId: 0, tab: { id: 1, url: location.href } }

  function dispatch(message) {
    return new Promise((resolve) => {
      let waiting = false
      for (const listener of messageListeners) {
        const result = listener(message, sender, resolve)
        if (result === true) waiting = true
        else if (result && typeof result.then === 'function') {
          waiting = true
          result.then(resolve)
        }
      }
      if (!waiting) resolve(undefined)
    })
  }

  const event = () => {
    const listeners = []
    return { addListener: (l) => listeners.push(l), _listeners: listeners }
  }

  const menus = new Map()
  const extensionBase = new URL('../../dist/', document.currentScript.src).href

  window.browser = {
    runtime: {
      id: 'test',
      lastError: undefined,
      getManifest: () => ({ version: '0.0.0-test' }),
      getURL: (path) => extensionBase + path,
      sendMessage: (message) => {
        log.sentMessages.push(message.type)
        return dispatch(message)
      },
      onMessage: { addListener: (l) => messageListeners.push(l) },
      onInstalled: event(),
      onStartup: event(),
    },
    storage: {
      local: storageArea('local', config.local),
      sync: storageArea('sync', config.sync),
      onChanged: { addListener: (l) => changeListeners.push(l) },
    },
    tabs: {
      query: async () => [{ id: 1, url: config.tabUrl || 'https://github.com/signup' }],
      sendMessage: async (tabId, message, options) => {
        log.tabMessages.push({ tabId, message, options })
        return dispatch(message)
      },
      create: async () => ({ id: 2 }),
    },
    extension: { getViews: () => [window] },
    windows: { getLastFocused: async () => ({ id: 1 }) },
    commands: { onCommand: event() },
    notifications: {
      create: async (options) => {
        log.notifications.push(options.message)
        return 'n'
      },
    },
    contextMenus: {
      create: (props, callback) => {
        window.browser.runtime.lastError = menus.has(props.id)
          ? { message: `Cannot create item with duplicate id ${props.id}` }
          : undefined
        menus.set(props.id, props)
        callback && callback()
        window.browser.runtime.lastError = undefined
      },
      update: async (id, props) => {
        if (!menus.has(id)) throw new Error(`Cannot find menu item with id ${id}`)
        Object.assign(menus.get(id), props)
      },
      remove: async (id) => menus.delete(id),
      onClicked: event(),
      _items: menus,
    },
  }

  // webextension-polyfill refuses to load unless this looks like an extension
  window.chrome = { runtime: { id: 'test' } }
})()
