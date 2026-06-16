import Vue from 'vue';
import App from './App.vue';
import VueViewerjs from './index.js';

Vue.use(VueViewerjs);

new Vue({
  render: h => h(App)
}).$mount('#app');
