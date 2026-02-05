import browser from 'webextension-polyfill'

const ICON_SIZE = 20
const ICON_INSET = 8
const WRAPPER_CLASS = 'addy-io-extension-wrapper'
const ICON_CLASS = 'addy-io-extension-icon'
const SPINNER_CLASS = 'addy-io-extension-spinner'
const HIDDEN_ATTR = 'data-addy-io-injected'
const POSITION_UPDATE_MS = 200
/** Minimum size so we don't attach to hidden/honeypot inputs (e.g. inside article text) */
const MIN_INPUT_WIDTH = 50
const MIN_INPUT_HEIGHT = 18

/** Collect all elements matching selector in document and inside any shadow roots */
function queryAllIncludingShadowRoots(selector, root = document) {
  const results = []
  try {
    root.querySelectorAll(selector).forEach((el) => results.push(el))
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) {
        results.push(...queryAllIncludingShadowRoots(selector, el.shadowRoot))
      }
    })
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

/** Map from input element to { wrapper, intervalId } for cleanup */
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
 * Place the floating button over the right side of the input.
 */
function updateButtonPosition(input, wrapper) {
  if (!input.isConnected) {
    const entry = trackedInputs.get(input)
    if (entry) {
      clearInterval(entry.intervalId)
      trackedInputs.delete(input)
      entry.wrapper.remove()
    }
    return
  }

  const rect = input.getBoundingClientRect()

  // Place icon inside the input at the right edge (with inset).
  // getBoundingClientRect() is viewport-relative; our wrapper is in body so absolute positioning is viewport-relative too.
  const left = rect.right - ICON_SIZE - ICON_INSET
  const top = rect.top + (rect.height - ICON_SIZE) / 2

  wrapper.style.left = left + 'px'
  wrapper.style.top = top + 'px'
  wrapper.style.width = ICON_SIZE + 'px'
  wrapper.style.height = ICON_SIZE + 'px'
  // Only show icon when the input has a reasonable visible size (avoids wrong placement on hidden/honeypot fields)
  wrapper.style.visibility =
    rect.width >= MIN_INPUT_WIDTH && rect.height >= MIN_INPUT_HEIGHT ? 'visible' : 'hidden'
}

function injectIconIntoInput(input) {
  if (input.getAttribute(HIDDEN_ATTR) === 'true') return
  if (trackedInputs.has(input)) return
  if (!isValidEmailInput(input)) return

  input.setAttribute(HIDDEN_ATTR, 'true')

  const wrapper = document.createElement('div')
  wrapper.className = WRAPPER_CLASS
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.style.cssText = `
    position:absolute;
    z-index:999999;
    pointer-events:auto;
    box-sizing:border-box;
  `
  document.body.appendChild(wrapper)

  const icon = document.createElement('img')
  icon.className = ICON_CLASS
  icon.src = iconDataUrl || ''
  icon.alt = 'addy.io'
  icon.title = 'Create new addy.io alias'
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
  icon.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    handleIconClick(input, icon, wrapper)
  })
  icon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleIconClick(input, icon, wrapper)
    }
  })
  wrapper.appendChild(icon)

  wrapper._addyInput = input

  updateButtonPosition(input, wrapper)
  const intervalId = setInterval(() => updateButtonPosition(input, wrapper), POSITION_UPDATE_MS)
  trackedInputs.set(input, { wrapper, intervalId })
}

function handleIconClick(input, icon, wrapper) {
  icon.style.display = 'none'
  wrapper.style.cursor = 'not-allowed'
  const spinner = createSpinner()
  wrapper.appendChild(spinner)

  const cleanup = () => {
    spinner.remove()
    icon.style.display = ''
    wrapper.style.cursor = ''
  }

  browser.runtime
    .sendMessage({ type: 'CREATE_ALIAS_FOR_INPUT' })
    .then((response) => {
      if (response && response.aliasEmail) {
        input.value = response.aliasEmail
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
      } else if (response && response.error) {
        console.warn('[addy.io]', response.error)
      }
    })
    .catch((err) => console.warn('[addy.io]', err))
    .finally(cleanup)
}

function scanAndInject() {
  if (shouldSkipPage()) {
    removeAllInjected()
    return
  }
  const inputs = queryAllIncludingShadowRoots("input[type='email'], input[type='text']")
  inputs.forEach((input) => {
    if (input.getAttribute(HIDDEN_ATTR) === 'true') return
    if (isEmailInput(input) && isValidEmailInput(input)) {
      injectIconIntoInput(input)
    }
  })
}

function removeAllInjected() {
  trackedInputs.forEach(({ wrapper, intervalId }) => {
    clearInterval(intervalId)
    wrapper.remove()
  })
  trackedInputs.clear()
  document.querySelectorAll(`[${HIDDEN_ATTR}="true"]`).forEach((el) => {
    el.removeAttribute(HIDDEN_ATTR)
  })
}

function run(showIcon) {
  if (showIcon) {
    if (iconDataUrl) {
      scanAndInject()
      const observer = new MutationObserver(() => scanAndInject())
      observer.observe(document.body, { childList: true, subtree: true })
    } else {
      browser.runtime
        .sendMessage({ type: 'GET_ICON_DATA_URL' })
        .then((response) => {
          if (response && response.dataUrl) {
            iconDataUrl = response.dataUrl
            scanAndInject()
            const observer = new MutationObserver(() => scanAndInject())
            observer.observe(document.body, { childList: true, subtree: true })
          }
        })
        .catch(() => {})
    }
  } else {
    removeAllInjected()
  }
}

browser.storage.sync.get({ showIconInEmailFields: true }).then(({ showIconInEmailFields }) => {
  run(showIconInEmailFields)
})

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.showIconInEmailFields) {
    run(changes.showIconInEmailFields.newValue)
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
