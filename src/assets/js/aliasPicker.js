/**
 * The list the field icon opens when this site already has aliases: pick one
 * to fill the field, or create a new one.
 *
 * It lives in a closed shadow root, so page styles cannot change it and page
 * scripts cannot read the addresses in it. Only real user input is acted on.
 */

export const PICKER_CLASS = 'addy-io-extension-picker'

const MIN_WIDTH = 240
const MAX_WIDTH = 360
const GAP = 4
const VIEWPORT_MARGIN = 8

const STYLES = `
:host { all: initial; }
.panel {
  box-sizing: border-box;
  max-height: 280px;
  overflow-y: auto;
  font: 13px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #1f2937;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.title {
  padding: 8px 10px 4px;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.option {
  box-sizing: border-box;
  display: block;
  width: 100%;
  margin: 0;
  padding: 8px 10px;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.email,
.description {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.description {
  margin-top: 1px;
  font-size: 12px;
  color: #6b7280;
}
.option:hover,
.option:focus {
  background: #eef2ff;
  outline: none;
}
.create {
  border-top: 1px solid #e5e7eb;
  font-weight: 600;
  color: #4338ca;
}
@media (prefers-color-scheme: dark) {
  .panel { color: #f3f4f6; background: #1f2937; border-color: #4b5563; }
  .title, .description { color: #9ca3af; }
  .option:hover, .option:focus { background: #374151; }
  .create { border-top-color: #374151; color: #a5b4fc; }
}
`

let current = null

export function isAliasPickerOpenFor(input) {
  return Boolean(current && current.input === input)
}

export function closeAliasPicker({ refocus = false } = {}) {
  if (!current) return
  const { host, input, cleanup } = current
  current = null
  cleanup()
  host.remove()
  if (refocus) input.focus({ preventScroll: true })
}

function place(host, panel, input) {
  const rect = input.getBoundingClientRect()
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, rect.width))
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN)
  )
  // Below the field, or above it when there is not enough room
  const height = panel.offsetHeight
  const below = rect.bottom + GAP
  const top =
    below + height > window.innerHeight - VIEWPORT_MARGIN && rect.top - GAP - height > 0
      ? rect.top - GAP - height
      : below
  host.style.left = `${left}px`
  host.style.top = `${top}px`
  host.style.width = `${width}px`
}

/**
 * @param {{
 *   input: HTMLInputElement,
 *   container: Element,
 *   toggle: Element,
 *   hostname: string,
 *   aliases: { email: string, description: string }[],
 *   onPick: (alias: { email: string, description: string }) => void,
 *   onCreate: () => void
 * }} options
 */
export function openAliasPicker({ input, container, toggle, hostname, aliases, onPick, onCreate }) {
  closeAliasPicker()

  const host = document.createElement('div')
  host.className = PICKER_CLASS
  host.style.cssText = 'position:fixed;z-index:2147483647;margin:0;padding:0;border:0;'
  const root = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = STYLES
  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.setAttribute('role', 'listbox')
  panel.setAttribute('aria-label', `addy.io aliases for ${hostname}`)

  const title = document.createElement('div')
  title.className = 'title'
  title.textContent = `Your aliases for ${hostname}`
  panel.appendChild(title)

  // Most descriptions are just the site's name, which the title already shows
  const withoutWww = (name) => name.toLowerCase().replace(/^www\./, '')
  const extraDescription = (description) => {
    const text = String(description || '').trim()
    return text && withoutWww(text) !== withoutWww(hostname) ? text : ''
  }

  const options = []
  const addOption = (label, className, action, description = '') => {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = className
    option.setAttribute('role', 'option')
    if (description) {
      const emailLine = document.createElement('span')
      emailLine.className = 'email'
      emailLine.textContent = label
      const descriptionLine = document.createElement('span')
      descriptionLine.className = 'description'
      descriptionLine.textContent = description
      option.append(emailLine, descriptionLine)
      option.setAttribute('aria-label', `${label}, ${description}`)
      option.title = `${label}\n${description}`
    } else {
      option.textContent = label
      option.title = label
    }
    option.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!e.isTrusted) return
      closeAliasPicker()
      action()
    })
    panel.appendChild(option)
    options.push(option)
  }
  aliases.forEach((alias) =>
    addOption(alias.email, 'option', () => onPick(alias), extraDescription(alias.description))
  )
  addOption('Create new alias', 'option create', onCreate)

  panel.addEventListener('keydown', (e) => {
    if (!e.isTrusted) return
    const index = options.indexOf(root.activeElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      options[(index + step + options.length) % options.length].focus()
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      options[e.key === 'Home' ? 0 : options.length - 1].focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeAliasPicker({ refocus: true })
    } else if (e.key === 'Tab') {
      closeAliasPicker()
    }
  })

  root.append(style, panel)
  container.appendChild(host)
  place(host, panel, input)
  options[0].focus({ preventScroll: true })

  // Close on a click elsewhere, or when the page moves under the list.
  // The field icon (toggle) closes it itself.
  const onPointerDown = (e) => {
    const path = e.composedPath()
    if (!path.includes(host) && !path.includes(toggle)) closeAliasPicker()
  }
  const onViewportChange = () => closeAliasPicker()
  document.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('scroll', onViewportChange, { capture: true, passive: true })
  window.addEventListener('resize', onViewportChange)

  current = {
    host,
    input,
    cleanup: () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', onViewportChange, { capture: true })
      window.removeEventListener('resize', onViewportChange)
    },
  }
}
