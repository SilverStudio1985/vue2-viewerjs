<template>
  <div class="demo-basic">
    <h2 class="demo-title">基础单图预览</h2>
    <p class="demo-desc">展示最基本的单张图片预览功能，支持缩放、拖拽、旋转、镜像等操作。</p>

    <div class="demo-actions">
      <button class="demo-btn" @click="openViewer">打开预览</button>
      <button class="demo-btn" @click="openWithOptions">自定义配置预览</button>
    </div>

    <div class="demo-preview">
      <img
        :src="previewImage.url"
        :alt="previewImage.alt"
        class="preview-image"
        @click="openViewer"
      />
      <div class="preview-hint">点击图片打开预览</div>
    </div>

    <viewer
      v-if="showViewer"
      :images="images"
      :options="viewerOptions"
      @close="handleClose"
      @viewed="handleViewed"
    />
  </div>
</template>

<script>
import Viewer from '../components/viewer.vue';

export default {
  name: 'DemoBasic',

  components: {
    Viewer
  },

  data() {
    return {
      showViewer: false,
      previewImage: {
        url: 'https://picsum.photos/id/1015/800/600',
        alt: '风景图片'
      },
      images: [
        {
          src: 'https://picsum.photos/id/1015/800/600',
          alt: '风景图片1',
          title: '美丽的自然风景'
        },
        {
          src: 'https://picsum.photos/id/1016/800/600',
          alt: '风景图片2',
          title: '山脉与湖泊'
        },
        {
          src: 'https://picsum.photos/id/1018/800/600',
          alt: '风景图片3',
          title: '森林小路'
        }
      ],
      viewerOptions: {
        navbar: true,
        toolbar: true,
        title: true,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
        keyboard: true,
        interval: 3000,
        fullscreen: true
      }
    };
  },

  methods: {
    openViewer() {
      this.showViewer = true;
    },

    openWithOptions() {
      this.viewerOptions = {
        ...this.viewerOptions,
        initialViewIndex: 1,
        zIndex: 3000
      };
      this.showViewer = true;
    },

    handleClose() {
      this.showViewer = false;
    },

    handleViewed({ index, image }) {
      console.log('Viewed:', index, image);
    }
  }
};
</script>

<style scoped>
.demo-basic {
  color: #fff;
}

.demo-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.demo-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 24px;
}

.demo-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.demo-btn {
  padding: 10px 20px;
  border: none;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.demo-btn:hover {
  opacity: 0.9;
}

.demo-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-image {
  max-width: 400px;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.preview-image:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.3);
}

.preview-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
</style>
