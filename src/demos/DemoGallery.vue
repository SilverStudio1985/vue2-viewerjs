<template>
  <div class="demo-gallery">
    <h2 class="demo-title">200张大图画廊</h2>
    <p class="demo-desc">
      展示组件处理大量图片的能力。采用懒加载+预缓冲策略，虚拟列表技术确保流畅运行。
    </p>

    <div class="demo-stats">
      <div class="stat-item">
        <span class="stat-label">图片数量</span>
        <span class="stat-value">{{ images.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已加载</span>
        <span class="stat-value">{{ loadedCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">当前索引</span>
        <span class="stat-value">{{ currentIndex + 1 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">内存状态</span>
        <span class="stat-value" :class="memoryStatus.class">{{ memoryStatus.text }}</span>
      </div>
    </div>

    <div class="demo-controls">
      <button class="demo-btn" @click="openGallery(0)">打开画廊</button>
      <button class="demo-btn" @click="randomPosition">随机位置</button>
      <button class="demo-btn secondary" @click="toggleAutoGC">
        自动GC: {{ autoGC ? '开' : '关' }}
      </button>

      <span class="demo-sep">|</span>

      <span class="demo-label">工具栏:</span>
      <button
        v-for="p in positions"
        :key="'tb-' + p"
        class="demo-chip"
        :class="{ active: toolbarPos === p }"
        @click="toolbarPos = p"
      >{{ p }}</button>

      <span class="demo-sep">|</span>

      <span class="demo-label">缩略图:</span>
      <button
        v-for="p in positions"
        :key="'nb-' + p"
        class="demo-chip"
        :class="{ active: navbarPos === p }"
        @click="navbarPos = p"
      >{{ p }}</button>

      <button class="demo-btn secondary" @click="navbarHover = !navbarHover">
        悬停隐藏: {{ navbarHover ? '开' : '关' }}
      </button>

      <span class="demo-sep">|</span>

      <button class="demo-btn secondary" @click="useCustomSlots = !useCustomSlots">
        自定义插槽: {{ useCustomSlots ? '开' : '关' }}
      </button>

      <span class="demo-sep">|</span>

      <span class="demo-label">切换动画:</span>
      <button
        v-for="t in transitions"
        :key="'tr-' + t.value"
        class="demo-chip"
        :class="{ active: transitionEffect === t.value }"
        @click="transitionEffect = t.value"
      >{{ t.label }}</button>

      <span class="demo-sep">|</span>

      <span class="demo-label">播放间隔:</span>
      <button
        v-for="iv in intervals"
        :key="'iv-' + iv.value"
        class="demo-chip"
        :class="{ active: playInterval === iv.value }"
        @click="playInterval = iv.value"
      >{{ iv.label }}</button>

      <button class="demo-btn primary" @click="openAndPlay">
        ▶ 全屏播放
      </button>
    </div>

    <!-- 画廊外层插槽演示 -->
    <div class="gallery-grid">
      <div
        v-for="(image, index) in images"
        :key="image.id"
        class="gallery-item"
        @click="openGallery(index)"
      >
        <img
          :src="image.thumbnail"
          :alt="image.alt"
          class="gallery-image"
          loading="lazy"
          @load="handleThumbLoad(image)"
          @error="handleThumbError(image)"
        />
        <div class="gallery-item-index">{{ index + 1 }}</div>
      </div>
    </div>

    <viewer
      ref="viewer"
      v-if="showGallery"
      :images="images"
      :options="galleryOptions"
      :toolbar-position="toolbarPos"
      :navbar-position="navbarPos"
      :navbar-hover="navbarHover"
      @close="handleClose"
      @viewed="handleViewed"
      @progress="handleProgress"
    >
      <!-- 自定义工具栏插槽 -->
      <template v-if="useCustomSlots" #toolbar="{ currentIndex, total, actions, isZoomed }">
        <div class="custom-toolbar">
          <button class="ct-btn" @click="actions.prev">‹</button>
          <span class="ct-counter">{{ currentIndex + 1 }} / {{ total }}</span>
          <button class="ct-btn" @click="actions.next">›</button>
          <span class="ct-divider"></span>
          <button class="ct-btn" @click="actions.zoomOut">−</button>
          <button class="ct-btn" @click="actions.reset">⟳</button>
          <button class="ct-btn" @click="actions.zoomIn">＋</button>
          <span class="ct-divider"></span>
          <button class="ct-btn" @click="actions.rotateLeft">↺</button>
          <button class="ct-btn" @click="actions.rotateRight">↻</button>
          <span class="ct-divider"></span>
          <button class="ct-btn danger" @click="actions.close">✕</button>
        </div>
      </template>

      <!-- 自定义标题插槽 -->
      <template v-if="useCustomSlots" #title="{ currentImage, currentIndex, total }">
        <div class="custom-title">
          <strong>【自定义】</strong> {{ currentImage.title }}
          <small>（{{ currentIndex + 1 }}/{{ total }}）</small>
        </div>
      </template>

      <!-- canvas 浮层插槽（水印） -->
      <template v-if="useCustomSlots" #canvas-overlay>
        <div class="custom-watermark">© Vue2-ViewerJS</div>
      </template>
    </viewer>
  </div>
</template>

<script>
import Viewer from '../components/viewer.vue';
import { MemoryManager } from '../utils/memory-manager';

const IMAGE_COUNT = 200;
const BASE_URL = 'https://picsum.photos/id';

export default {
  name: 'DemoGallery',

  components: {
    Viewer
  },

  data() {
    return {
      showGallery: false,
      images: [],
      currentIndex: 0,
      loadedCount: 0,
      autoGC: true,
      memoryManager: new MemoryManager(),
      positions: ['top', 'bottom', 'left', 'right'],
      toolbarPos: 'bottom',
      navbarPos: 'bottom',
      navbarHover: false,
      useCustomSlots: false,
      transitions: [
        { label: '淡入', value: 'fade' },
        { label: '横滑', value: 'slide' },
        { label: '横滑(反)', value: 'slide-reverse' },
        { label: '纵滑', value: 'slide-vertical' },
        { label: '纵滑(反)', value: 'slide-vertical-reverse' },
        { label: '缩入', value: 'zoom' },
        { label: '缩出', value: 'zoom-out' },
        { label: '横翻', value: 'flip' },
        { label: '纵翻', value: 'flip-vertical' },
        { label: '旋转', value: 'rotate' },
        { label: '反旋', value: 'rotate-reverse' },
        { label: '模糊', value: 'blur' },
        { label: '推入', value: 'push' },
        { label: '百叶横', value: 'blinds' },
        { label: '百叶纵', value: 'blinds-vertical' },
        { label: '🎲随机', value: 'random' },
        { label: '🎬合集', value: '__collection__' },
        { label: '关闭', value: 'none' }
      ],
      transitionEffect: 'fade',
      // 自定义合集（按顺序循环展示）
      transitionCollection: ['fade', 'slide', 'zoom', 'flip', 'rotate', 'blur', 'push', 'blinds'],
      intervals: [
        { label: '1s', value: 1000 },
        { label: '2s', value: 2000 },
        { label: '3s', value: 3000 },
        { label: '5s', value: 5000 }
      ],
      playInterval: 3000
    };
  },

  computed: {
    galleryOptions() {
      let transition = this.transitionEffect;
      let transitionRandom = false;
      if (this.transitionEffect === '__collection__') {
        transition = this.transitionCollection;
        transitionRandom = false; // 顺序循环；改为 true 即随机抽取
      }
      return {
        initialViewIndex: this.currentIndex,
        navbar: true,
        toolbar: true,
        title: (image) => `${image.title} (${this.currentIndex + 1}/${this.images.length})`,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
        keyboard: true,
        fullscreen: true,
        interval: this.playInterval,
        bufferSize: 1,
        thumbnailLimit: 15,
        largeImageThreshold: 4096,
        autoGC: this.autoGC,
        lazyLoad: true,
        loading: true,
        transition,
        transitionRandom,
        transitionDuration: 350,
        zIndex: 2015
      };
    },

    memoryStatus() {
      const stats = this.memoryManager.getStats();
      if (stats.memory.isHigh) {
        return { text: '高', class: 'high' };
      }
      return { text: '正常', class: 'normal' };
    }
  },

  created() {
    this.generateImages();
    this.startMemoryMonitor();
  },

  beforeDestroy() {
    this.stopMemoryMonitor();
  },

  methods: {
    generateImages() {
      const palette = [
        ['#667eea', '#764ba2'],
        ['#f093fb', '#f5576c'],
        ['#4facfe', '#00f2fe'],
        ['#43e97b', '#38f9d7'],
        ['#fa709a', '#fee140'],
        ['#30cfd0', '#330867'],
        ['#a8edea', '#fed6e3'],
        ['#ff9a9e', '#fad0c4'],
        ['#ffecd2', '#fcb69f'],
        ['#84fab0', '#8fd3f4']
      ];

      const buildSvg = (w, h, c1, c2, label) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="Arial,sans-serif" font-size="${Math.floor(Math.min(w,h)/6)}" font-weight="bold" fill="rgba(255,255,255,.9)" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      };

      const images = [];
      for (let i = 0; i < IMAGE_COUNT; i++) {
        const [c1, c2] = palette[i % palette.length];
        const w = 800 + (i % 5) * 200;
        const h = 600 + (i % 4) * 150;
        images.push({
          id: i,
          src: buildSvg(w, h, c1, c2, `#${i + 1}`),
          thumbnail: buildSvg(200, 150, c1, c2, `#${i + 1}`),
          alt: `图片 ${i + 1}`,
          title: `示例图片 ${i + 1}`,
          loaded: false
        });
      }
      this.images = images;
    },

    handleThumbLoad(image) {
      if (!image.loaded) {
        image.loaded = true;
        this.loadedCount++;
      }
    },

    handleThumbError(image) {
      image.loaded = false;
    },

    openGallery(index) {
      this.currentIndex = index;
      this.showGallery = true;
    },

    randomPosition() {
      this.currentIndex = Math.floor(Math.random() * this.images.length);
      this.openGallery(this.currentIndex);
    },

    toggleAutoGC() {
      this.autoGC = !this.autoGC;
    },

    handleClose() {
      this.showGallery = false;
    },

    /** 打开画廊并自动进入全屏播放 */
    openAndPlay() {
      this.showGallery = true;
      this.$nextTick(() => {
        const viewer = this.$refs.viewer;
        if (viewer && viewer.togglePlay) {
          viewer.togglePlay();
        }
      });
    },

    handleViewed({ index }) {
      this.currentIndex = index;
    },

    handleProgress({ index, progress }) {
    },

    startMemoryMonitor() {
      if (this.autoGC) {
        this.memoryManager.startAutoGC();
      }
    },

    stopMemoryMonitor() {
      this.memoryManager.stopAutoGC();
    }
  },

  watch: {
    autoGC(val) {
      if (val) {
        this.memoryManager.startAutoGC();
      } else {
        this.memoryManager.stopAutoGC();
      }
    }
  }
};
</script>

<style scoped>
.demo-gallery {
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

.demo-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.stat-value.high {
  color: #ff6b6b;
}

.stat-value.normal {
  color: #51cf66;
}

.demo-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
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

.demo-btn.secondary {
  background: rgba(255, 255, 255, 0.15);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.gallery-item {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.gallery-item:hover {
  transform: scale(1.03);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.gallery-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.gallery-item-index {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 控件区域 */
.demo-sep {
  color: rgba(255, 255, 255, 0.25);
  user-select: none;
}
.demo-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}
.demo-chip {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.demo-chip:hover {
  border-color: #667eea;
}
.demo-chip.active {
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-color: transparent;
  color: #fff;
}

/* 自定义工具栏（插槽内容） */
.custom-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.95), rgba(118, 75, 162, 0.95));
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}
.ct-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.ct-btn:hover {
  background: rgba(255, 255, 255, 0.32);
}
.ct-btn.danger:hover {
  background: rgba(255, 80, 80, 0.7);
}
.ct-counter {
  color: #fff;
  font-size: 13px;
  padding: 0 6px;
  user-select: none;
}
.ct-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.3);
}

.vue-viewer-toolbar-wrapper.pos-left .custom-toolbar,
.vue-viewer-toolbar-wrapper.pos-right .custom-toolbar {
  flex-direction: column;
  border-radius: 24px;
  padding: 14px 8px;
}

/* 自定义标题（插槽内容） */
.custom-title {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  letter-spacing: 0.5px;
}
.custom-title small {
  margin-left: 6px;
  color: rgba(255, 255, 255, 0.6);
}

/* canvas 浮层水印 */
.custom-watermark {
  position: absolute;
  right: 24px;
  bottom: 24px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.5);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  border-radius: 4px;
  pointer-events: none;
  user-select: none;
}
</style>
