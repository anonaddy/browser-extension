import Vue from 'vue'
import App from './components/App.vue'
import Clipboard from 'v-clipboard'

// Mozilla's polyfill
Vue.prototype.$browser = require('webextension-polyfill')

Vue.use(Clipboard)

new Vue({
  el: '#app',
  render: h => h(App),
})
