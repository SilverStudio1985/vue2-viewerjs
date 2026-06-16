<template>
  <div id="app">
    <div class="demo-header">
      <h1>Vue2-ViewerJS 图片预览组件</h1>
      <p class="subtitle">高性能 Vue2 图片预览组件 - 基于 ViewerJS 重构</p>
    </div>

    <div class="demo-nav">
      <button
        v-for="demo in demos"
        :key="demo.id"
        :class="['demo-nav-btn', { active: currentDemo === demo.id }]"
        @click="currentDemo = demo.id"
      >
        {{ demo.name }}
      </button>
    </div>

    <div class="demo-content">
      <demo-basic v-if="currentDemo === 'basic'" />
      <demo-gallery v-if="currentDemo === 'gallery'" />
      <demo-inline v-if="currentDemo === 'inline'" />
    </div>
  </div>
</template>

<script>
import DemoBasic from './demos/DemoBasic.vue';
import DemoGallery from './demos/DemoGallery.vue';
import DemoInline from './demos/DemoInline.vue';

export default {
  name: 'App',

  components: {
    DemoBasic,
    DemoGallery,
    DemoInline
  },

  data() {
    return {
      currentDemo: 'basic',
      demos: [
        { id: 'basic', name: '基础单图预览' },
        { id: 'gallery', name: '200张大图画廊' },
        { id: 'inline', name: '页面内联嵌入' }
      ]
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  min-height: 100vh;
  color: #fff;
}

#app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
}

.demo-header {
  text-align: center;
  margin-bottom: 40px;
}

.demo-header h1 {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.demo-header .subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.demo-nav {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.demo-nav-btn {
  padding: 12px 24px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.demo-nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.demo-nav-btn.active {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.demo-content {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 32px;
  min-height: 500px;
}
</style>
