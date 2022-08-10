import { createApp } from 'vue'

import App from './components/App.vue'

import Clipboard from 'v-clipboard/src'
import Notifications from '@kyvg/vue3-notification'

import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import updateLocale from 'dayjs/plugin/updateLocale'

window.psl = require('psl')

dayjs.extend(advancedFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(updateLocale)

dayjs.updateLocale('en', {
  relativeTime: {
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
  },
})

const app = createApp(App)

app.use(Notifications)
app.use(Clipboard)

// Mozilla's polyfill
app.config.globalProperties.$browser = require('webextension-polyfill')

// Global filters
app.config.globalProperties.$filters = {
  formatDate(value) {
    return dayjs(value).format('Do MMM YYYY')
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
}

app.mount('#app')
