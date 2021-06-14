import Vue from 'vue'
import App from './components/App.vue'
import Clipboard from 'v-clipboard'
import Notifications from 'vue-notification'
window.dayjs = require('dayjs')
import advancedFormat from 'dayjs/plugin/advancedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import updateLocale from 'dayjs/plugin/updateLocale'

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

// Mozilla's polyfill
Vue.prototype.$browser = require('webextension-polyfill')

Vue.use(Clipboard)
Vue.use(Notifications)

Vue.filter('formatDate', (value) => {
  return dayjs(value).format('Do MMM YYYY')
})

Vue.filter('timeAgo', (value) => {
  // If it was less than an hour ago just display 1h
  if (dayjs().utc().subtract(1, 'hour').isBefore(dayjs.utc(value))) {
    return '1h'
  }

  return dayjs.utc(value).fromNow(true)
})

new Vue({
  el: '#app',
  render: (h) => h(App),
})
