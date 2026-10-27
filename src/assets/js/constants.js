/** Shared alias domains. Custom local parts on these need at least 2 characters. */
export const SHARED_DOMAINS = [
  'anonaddy.me',
  'anonaddy.com',
  '4wrd.cc',
  'mailer.me',
  'addymail.com',
  'addy.io',
  'addy.to',
]

/** Hosted addy.io instances. Any other instance is self-hosted. */
export const OFFICIAL_INSTANCES = ['https://app.anonaddy.com', 'https://app.addy.io']

export const DEFAULT_INSTANCE = 'https://app.addy.io'

/**
 * Best guess at the browser from the user agent.
 * @returns {'edge'|'safari'|'firefox'|'opera'|'brave'|'vivaldi'|'yandex'|'samsung'|'chrome'}
 */
export function detectBrowser(ua = navigator.userAgent) {
  if (/Edg/i.test(ua)) return 'edge'
  const apple = /Macintosh|iPad|iPhone/i.test(ua)
  if (apple && /WebKit/i.test(ua) && !/CriOS|EdgiOS|Chrome/i.test(ua)) return 'safari'
  if (/rv:([^)]+)\) Gecko\/\d{8}/.test(ua)) return 'firefox'
  if (/OPR\/|Opera/i.test(ua)) return 'opera'
  if (/Brave/i.test(ua)) return 'brave'
  if (/Vivaldi/i.test(ua)) return 'vivaldi'
  if (/YaBrowser/i.test(ua)) return 'yandex'
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  return 'chrome'
}
