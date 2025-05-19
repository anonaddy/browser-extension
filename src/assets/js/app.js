import { createApp } from 'vue'

import App from './components/App.vue'

import Notifications from '@kyvg/vue3-notification'

import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

window.psl = require('psl')

dayjs.extend(advancedFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)

var locale_en = require('dayjs/locale/en')
locale_en.name = 'en-min'
locale_en.relativeTime = {
  future: 'in %s',
  past: '%s ago',
  s: '1s',
  m: '1m',
  mm: '%dm',
  h: '1h',
  hh: '%dh',
  d: '1d',
  dd: '%dd',
  M: '1m',
  MM: '%dm',
  y: '1y',
  yy: '%dy',
}

dayjs.locale('en-min', locale_en)

const app = createApp(App)

app.use(Notifications)

// Mozilla's polyfill
app.config.globalProperties.$browser = require('webextension-polyfill')

// Global filters
app.config.globalProperties.$filters = {
  formatDate(value) {
    return dayjs.utc(value).local().format('Do MMM YYYY')
  },
  timeAgo(value) {
    // If it was less than an hour ago just display 1h
    if (dayjs().utc().subtract(1, 'hour').isBefore(dayjs.utc(value))) {
      return '1h'
    }
    return dayjs.utc(value).fromNow(true)
  },
  nowToString() {
    return dayjs().toString()
  },
  formatDateTime(value) {
    return dayjs.utc(value).local().format('Do MMM YYYY h:mm A')
  },
  timeAgoHuman(value) {
    return dayjs.utc(value).locale('en').fromNow()
  },
}

app.mount('#app')
