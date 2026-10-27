import browser from 'webextension-polyfill'
import {
  PICKER_CLASS,
  openAliasPicker,
  closeAliasPicker,
  isAliasPickerOpenFor,
} from './assets/js/aliasPicker.js'

const ICON_SIZE = 20
const ICON_INSET = 8
const ICON_OUTSIDE_GAP = 6
const ICON_VIEWPORT_MARGIN = 4
const WRAPPER_CLASS = 'addy-io-extension-wrapper'
const ICON_CLASS = 'addy-io-extension-icon'
const SPINNER_CLASS = 'addy-io-extension-spinner'
const HIDDEN_ATTR = 'data-addy-io-injected'
/** Fallback for layout shifts that move a field without resizing it. Only in-view fields are measured. */
const POSITION_FALLBACK_MS = 1000
/** Coalesce DOM mutations into one scan */
const SCAN_DELAY_MS = 150
/** Above this many added nodes a full document scan is cheaper than scanning each one */
const MAX_INCREMENTAL_ROOTS = 50
/** Fields already in the DOM can become visible later, so rescan everything at most this often */
const FULL_SCAN_MIN_INTERVAL_MS = 2000
/** Minimum size so we don't attach to hidden/honeypot inputs (e.g. inside article text) */
const MIN_INPUT_WIDTH = 50
const MIN_INPUT_HEIGHT = 18

/** Shadow roots watched by the current mutation observer */
let observedShadowRoots = new WeakSet()

/**
 * Collect elements matching selector in root (and root itself) and inside any
 * open shadow roots. Shadow roots found here are watched for later changes,
 * since a body observer does not see mutations inside them.
 */
function queryAllIncludingShadowRoots(selector, root = document) {
  const results = []
  try {
    if (root.nodeType === Node.ELEMENT_NODE && root.matches(selector)) results.push(root)
    root.querySelectorAll(selector).forEach((el) => results.push(el))

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
    for (let el = walker.currentNode; el; el = walker.nextNode()) {
      if (!el.shadowRoot) continue
      observeShadowRoot(el.shadowRoot)
      results.push(...queryAllIncludingShadowRoots(selector, el.shadowRoot))
    }
  } catch (_) {}
  return results
}

/** Pages where we skip injection (e.g. known problematic layout / honeypot inputs) */
function shouldSkipPage() {
  try {
    const host = (window.location.hostname || '').toLowerCase()
    const path = (window.location.pathname || '').toLowerCase()
    if (host.includes('addy.io') && path.startsWith('/blog')) return true
    return false
  } catch (_) {
    return false
  }
}

/** Data URL for the icon (set after first request to background); avoids CSP blocking extension URLs on pages */
let iconDataUrl = null

/** 'inside' overlays the right side of the field. 'outside' sits to the right of the field. */
let iconPosition = 'inside'
let reuseExistingAlias = true

function iconTitle() {
  return reuseExistingAlias ? 'Pick or create an addy.io alias' : 'Create new addy.io alias'
}

function normaliseIconPosition(value) {
  return value === 'outside' ? 'outside' : 'inside'
}

/** Map from input element to { wrapper, intersectionObserver, resizeObserver } for cleanup */
const trackedInputs = new Map()

function createSpinner() {
  const spinner = document.createElement('div')
  spinner.className = SPINNER_CLASS
  spinner.setAttribute('aria-hidden', 'true')
  spinner.style.cssText = `
    width:100%;
    height:100%;
    border:2px solid rgba(0,0,0,0.1);
    border-top-color:#6366f1;
    border-radius:50%;
    animation:addy-io-spin 0.7s linear infinite;
    box-sizing:border-box;
  `
  if (!document.getElementById('addy-io-spinner-styles')) {
    const style = document.createElement('style')
    style.id = 'addy-io-spinner-styles'
    style.textContent = `@keyframes addy-io-spin{to{transform:rotate(360deg)}}`
    document.head.appendChild(style)
  }
  return spinner
}

function isEmailInput(el) {
  if (!el || el.nodeName !== 'INPUT') return false
  const type = (el.getAttribute('type') || '').toLowerCase()
  const name = (el.getAttribute('name') || '').toLowerCase()
  const placeholder = (el.getAttribute('placeholder') || '').toLowerCase()
  const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase()
  if (type === 'email') return true
  if (autocomplete === 'email' || autocomplete === 'e-mail') return true
  if (/^(e-?mail|mail)(_address)?$/i.test(name.trim())) return true
  // Placeholder only if it looks like a short email label (e.g. "Email Address"), not long text
  if (placeholder.length > 0 && placeholder.length < 50 && /e-?mail/i.test(placeholder)) return true
  return false
}

function isValidEmailInput(element) {
  const style = getComputedStyle(element)
  if (
    style.visibility === 'hidden' ||
    style.display === 'none' ||
    style.opacity === '0' ||
    style.pointerEvents === 'none' ||
    element.disabled ||
    (element.type !== 'text' && element.type !== 'email')
  ) {
    return false
  }
  // Skip inputs that are clearly too small (hidden/honeypot). We also hide the icon in
  // updateButtonPosition when rect is small, so dynamically loaded fields (e.g. newsletter)
  // get the icon once they have size.
  if (element.offsetWidth > 0 && element.offsetHeight > 0) {
    if (element.offsetWidth < MIN_INPUT_WIDTH || element.offsetHeight < MIN_INPUT_HEIGHT) {
      return false
    }
  }
  return true
}

/**
 * Place the floating button on the input.
 * 'inside' overlays the right side of the field.
 * 'outside' sits to the right of the field, clear of password-manager icons.
 * Uses position:fixed + viewport coords so we must update on scroll/resize.
 */
function untrackInput(input) {
  const entry = trackedInputs.get(input)
  if (!entry) return
  entry.intersectionObserver.disconnect()
  entry.resizeObserver?.disconnect()
  entry.wrapper.remove()
  delete input._addyWrapper
  input.removeAttribute(HIDDEN_ATTR)
  trackedInputs.delete(input)
  if (!trackedInputs.size) stopPositionFallback()
}

function updateButtonPosition(input, wrapper) {
  if (!input.isConnected) {
    untrackInput(input)
    return
  }

  // A field can move into the top layer later, e.g. when its dialog opens
  const container = iconContainerFor(input)
  if (wrapper.parentNode !== container) container.appendChild(wrapper)

  const rect = input.getBoundingClientRect()
  let left
  if (iconPosition === 'outside') {
    left = rect.right + ICON_OUTSIDE_GAP
    const maxLeft = window.innerWidth - ICON_SIZE - ICON_VIEWPORT_MARGIN
    if (left > maxLeft) left = Math.max(ICON_VIEWPORT_MARGIN, maxLeft)
  } else {
    left = rect.right - ICON_SIZE - ICON_INSET
  }
  const top = rect.top + (rect.height - ICON_SIZE) / 2

  wrapper.style.left = left + 'px'
  wrapper.style.top = top + 'px'
  wrapper.style.width = ICON_SIZE + 'px'
  wrapper.style.height = ICON_SIZE + 'px'

  const sizeOk = rect.width >= MIN_INPUT_WIDTH && rect.height >= MIN_INPUT_HEIGHT
  const inView = wrapper._addyInView !== false
  wrapper.style.visibility = sizeOk && inView ? 'visible' : 'hidden'
}

function updateAllPositions() {
  trackedInputs.forEach(({ wrapper }, input) => updateButtonPosition(input, wrapper))
}

let positionFrame = 0

/** At most one position update per animation frame */
function schedulePositionUpdate() {
  if (positionFrame) return
  positionFrame = requestAnimationFrame(() => {
    positionFrame = 0
    updateAllPositions()
  })
}

let fallbackTimer = null

function updateVisiblePositions() {
  trackedInputs.forEach(({ wrapper }, input) => {
    if (!input.isConnected) untrackInput(input)
    else if (wrapper._addyInView) updateButtonPosition(input, wrapper)
  })
}

function startPositionFallback() {
  if (!fallbackTimer) fallbackTimer = setInterval(updateVisiblePositions, POSITION_FALLBACK_MS)
}

function stopPositionFallback() {
  clearInterval(fallbackTimer)
  fallbackTimer = null
}

/** Modal dialogs and popovers render in the top layer, above anything in body */
function iconContainerFor(input) {
  return input.closest('dialog[open], [popover]') || document.body
}

function injectIconIntoInput(input) {
  if (input.getAttribute(HIDDEN_ATTR) === 'true') return
  if (trackedInputs.has(input)) return
  if (!isValidEmailInput(input)) return

  input.setAttribute(HIDDEN_ATTR, 'true')

  const wrapper = document.createElement('div')
  wrapper.className = WRAPPER_CLASS
  wrapper.style.cssText = `
    position:fixed;
    z-index:999999;
    pointer-events:auto;
    box-sizing:border-box;
  `
  iconContainerFor(input).appendChild(wrapper)
  wrapper._addyInView = true

  const icon = document.createElement('img')
  icon.className = ICON_CLASS
  icon.src = iconDataUrl || ''
  icon.alt = ''
  icon.title = iconTitle()
  icon.setAttribute('aria-label', iconTitle())
  icon.setAttribute('role', 'button')
  icon.setAttribute('tabindex', '0')
  icon.style.cssText = `
    display:block;
    width:100%;
    height:100%;
    cursor:pointer;
    opacity:0.7;
    pointer-events:auto;
  `
  icon.addEventListener('mouseenter', () => {
    icon.style.opacity = '1'
  })
  icon.addEventListener('mouseleave', () => {
    icon.style.opacity = '0.7'
  })
  // Page scripts can call icon.click(); only act on real user input.
  icon.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.isTrusted) return
    handleIconClick(input, icon, wrapper)
  })
  icon.addEventListener('keydown', (e) => {
    if (!e.isTrusted) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleIconClick(input, icon, wrapper)
    }
  })
  wrapper.appendChild(icon)

  wrapper._addyInput = input

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const w = entry.target._addyWrapper
        if (!w) continue
        w._addyInView = entry.isIntersecting && entry.intersectionRatio >= 0.5
        updateButtonPosition(entry.target, w)
      }
    },
    { threshold: [0, 0.5, 1], root: null }
  )
  input._addyWrapper = wrapper
  intersectionObserver.observe(input)

  const resizeObserver =
    typeof ResizeObserver === 'function' ? new ResizeObserver(schedulePositionUpdate) : null
  resizeObserver?.observe(input)

  updateButtonPosition(input, wrapper)
  trackedInputs.set(input, { wrapper, intersectionObserver, resizeObserver })
  startPositionFallback()
}

/** Set the value through the native setter so React and similar frameworks see the change */
function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  if (setter) {
    setter.call(input, value)
  } else {
    input.value = value
  }
}

function fillInput(input, email) {
  setInputValue(input, email)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Swap the icon for a spinner. Returns a function that restores it. */
function showBusy(icon, wrapper) {
  wrapper._addyLoading = true
  icon.style.display = 'none'
  wrapper.style.cursor = 'not-allowed'
  const spinner = createSpinner()
  wrapper.appendChild(spinner)
  return () => {
    if (!spinner.isConnected) return
    spinner.remove()
    wrapper._addyLoading = false
    icon.style.display = ''
    wrapper.style.cursor = ''
  }
}

function currentHostname() {
  try {
    return window.location.hostname || ''
  } catch (_) {
    return ''
  }
}

async function createAliasForInput(input, icon, wrapper, hostname) {
  const stopBusy = showBusy(icon, wrapper)
  try {
    const response = await browser.runtime.sendMessage({
      type: 'CREATE_ALIAS_FOR_INPUT',
      description: hostname,
      forceCreate: true,
    })
    if (response && response.aliasEmail) {
      fillInput(input, response.aliasEmail)
    } else if (response && response.error) {
      console.warn('[addy.io]', response.error)
    }
  } catch (err) {
    console.warn('[addy.io]', err)
  } finally {
    stopBusy()
  }
}

/**
 * Show this site's aliases to pick from, or create one straight away when it
 * has none (or alias reuse is off).
 */
async function handleIconClick(input, icon, wrapper) {
  if (isAliasPickerOpenFor(input)) {
    closeAliasPicker({ refocus: true })
    return
  }
  if (wrapper._addyLoading) return

  const hostname = currentHostname()
  const stopBusy = showBusy(icon, wrapper)
  let aliases
  try {
    const response = await browser.runtime.sendMessage({
      type: 'FIND_ALIASES_FOR_INPUT',
      hostname,
    })
    if (response && response.error) {
      console.warn('[addy.io]', response.error)
      return
    }
    aliases = (response && response.aliases) || []
  } catch (err) {
    console.warn('[addy.io]', err)
    return
  } finally {
    stopBusy()
  }

  if (!aliases.length) {
    await createAliasForInput(input, icon, wrapper, hostname)
    return
  }

  openAliasPicker({
    input,
    container: iconContainerFor(input),
    toggle: wrapper,
    hostname,
    aliases,
    onPick: (alias) => fillInput(input, alias.email),
    onCreate: () => createAliasForInput(input, icon, wrapper, hostname),
  })
}

const INPUT_SELECTOR = "input[type='email'], input[type='text']"

function scanAndInject(roots = [document]) {
  if (shouldSkipPage()) {
    removeAllInjected()
    return
  }
  const inputs = roots.flatMap((root) => queryAllIncludingShadowRoots(INPUT_SELECTOR, root))
  inputs.forEach((input) => {
    if (input.getAttribute(HIDDEN_ATTR) === 'true') return
    if (isEmailInput(input) && isValidEmailInput(input)) {
      injectIconIntoInput(input)
    }
  })
}

function removeAllInjected() {
  closeAliasPicker()
  // untrackInput also clears the marker on inputs inside shadow roots
  Array.from(trackedInputs.keys()).forEach(untrackInput)
  stopPositionFallback()
  document.querySelectorAll(`[${HIDDEN_ATTR}="true"]`).forEach((el) => {
    el.removeAttribute(HIDDEN_ATTR)
  })
}

function setupScrollAndResizeListeners() {
  if (window._addyScrollResizeSetup) return
  window._addyScrollResizeSetup = true
  window.addEventListener('scroll', schedulePositionUpdate, { passive: true, capture: true })
  window.addEventListener('resize', schedulePositionUpdate)
}

function isLoggedIn(apiToken) {
  return typeof apiToken === 'string' && apiToken.trim().length > 0
}

let mutationObserver = null
let pendingRoots = new Set()
let pendingFullScan = false
let fullScanDue = false
let lastFullScanAt = 0
let scanTimer = null

function isOwnNode(node) {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node.classList.contains(WRAPPER_CLASS) ||
      node.classList.contains(SPINNER_CLASS) ||
      node.classList.contains(PICKER_CLASS) ||
      node.id === 'addy-io-spinner-styles')
  )
}

function scheduleFlush() {
  if (scanTimer) return
  const sinceFullScan = Date.now() - lastFullScanAt
  const wait =
    pendingRoots.size || pendingFullScan
      ? SCAN_DELAY_MS
      : Math.max(SCAN_DELAY_MS, FULL_SCAN_MIN_INTERVAL_MS - sinceFullScan)
  scanTimer = setTimeout(flushScan, wait)
}

function flushScan() {
  scanTimer = null
  const full =
    pendingFullScan || (fullScanDue && Date.now() - lastFullScanAt >= FULL_SCAN_MIN_INTERVAL_MS)
  let roots
  if (full) {
    roots = [document]
    lastFullScanAt = Date.now()
    fullScanDue = false
  } else {
    roots = Array.from(pendingRoots).filter((node) => node.isConnected)
  }
  pendingRoots = new Set()
  pendingFullScan = false
  if (roots.length) scanAndInject(roots)
  schedulePositionUpdate()
  // A burst that ended before the full-scan interval still gets one trailing full scan
  if (fullScanDue) scheduleFlush()
}

/**
 * Added subtrees are scanned soon after a burst of mutations. The whole page is
 * rescanned at most every FULL_SCAN_MIN_INTERVAL_MS for fields that were hidden.
 */
function onMutations(records) {
  let pageChanged = false
  for (const record of records) {
    if (isOwnNode(record.target)) continue
    for (const node of record.removedNodes) {
      if (!isOwnNode(node)) pageChanged = true
    }
    for (const node of record.addedNodes) {
      if (isOwnNode(node)) continue
      pageChanged = true
      if (node.nodeType === Node.ELEMENT_NODE) pendingRoots.add(node)
    }
  }
  if (!pageChanged) return
  fullScanDue = true
  if (pendingRoots.size > MAX_INCREMENTAL_ROOTS) pendingFullScan = true
  scheduleFlush()
}

function observeShadowRoot(shadowRoot) {
  if (!mutationObserver || observedShadowRoots.has(shadowRoot)) return
  observedShadowRoots.add(shadowRoot)
  mutationObserver.observe(shadowRoot, { childList: true, subtree: true })
}

function ensureMutationObserver() {
  if (mutationObserver || !document.body) return
  mutationObserver = new MutationObserver(onMutations)
  mutationObserver.observe(document.body, { childList: true, subtree: true })
}

function stopMutationObserver() {
  mutationObserver?.disconnect()
  mutationObserver = null
  // A new observer has to watch them again
  observedShadowRoots = new WeakSet()
  clearTimeout(scanTimer)
  scanTimer = null
  pendingRoots = new Set()
  pendingFullScan = false
  fullScanDue = false
}

function run(showIcon, loggedIn) {
  const shouldShow = showIcon && loggedIn
  if (shouldShow) {
    setupScrollAndResizeListeners()
    if (iconDataUrl) {
      ensureMutationObserver()
      scanAndInject()
    } else {
      browser.runtime
        .sendMessage({ type: 'GET_ICON_DATA_URL' })
        .then((response) => {
          if (response && response.dataUrl) {
            iconDataUrl = response.dataUrl
            ensureMutationObserver()
            scanAndInject()
          }
        })
        .catch(() => {})
    }
  } else {
    stopMutationObserver()
    removeAllInjected()
  }
}

function refreshFromStorage() {
  return Promise.all([
    browser.storage.sync.get({
      showIconInEmailFields: true,
      emailFieldIconPosition: 'inside',
      reuseExistingAlias: true,
    }),
    browser.storage.local.get({ apiToken: '' }),
  ])
    .then(([prefs, local]) => ({ ...prefs, apiToken: local.apiToken }))
    .then(
      ({ showIconInEmailFields, emailFieldIconPosition, reuseExistingAlias: reuse, apiToken }) => {
        iconPosition = normaliseIconPosition(emailFieldIconPosition)
        reuseExistingAlias = reuse !== false
        run(showIconInEmailFields, isLoggedIn(apiToken))
        updateAllPositions()
        trackedInputs.forEach(({ wrapper }) => {
          const icon = wrapper.querySelector(`.${ICON_CLASS}`)
          if (!icon) return
          icon.title = iconTitle()
          icon.setAttribute('aria-label', iconTitle())
        })
      }
    )
}

refreshFromStorage()

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync' && areaName !== 'local') return
  if (
    changes.showIconInEmailFields ||
    changes.emailFieldIconPosition ||
    changes.reuseExistingAlias ||
    changes.apiToken
  ) {
    refreshFromStorage()
  }
})

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'COPY_TO_CLIPBOARD' && message.text) {
    const textarea = document.createElement('textarea')
    textarea.value = message.text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
    } catch (_) {}
    document.body.removeChild(textarea)
  }
})
