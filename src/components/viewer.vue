<template>
  <div
    v-if="isVisible"
    ref="viewer"
    class="vue-viewer"
    :class="[
      {
        'vue-viewer-modal': !options.inline,
        'vue-viewer-inline': options.inline,
        'vue-viewer-fullscreen': isFullscreen,
        'vue-viewer-one-to-one': viewMode === VIEW_MODE_ONE_TO_ONE,
        'vue-viewer-zoomed': isZoomed
      },
      `vue-viewer-toolbar-${toolbarPosition}`,
      `vue-viewer-navbar-${navbarPosition}`
    ]"
    :style="viewerStyle"
    @click="handleViewerClick"
  >
    <div v-if="!options.inline" class="vue-viewer-backdrop" :style="backdropStyle"></div>

    <div class="vue-viewer-container" :style="containerStyle">
      <!-- 工具栏插槽（位置由 toolbarPosition 决定） -->
      <div v-if="options.toolbar && !isPlaying" class="vue-viewer-toolbar-wrapper" :class="`pos-${toolbarPosition}`">
        <slot
          name="toolbar"
          :current-image="currentImage"
          :current-index="currentIndex"
          :total="images.length"
          :zoom-ratio="zoomRatio"
          :is-zoomed="isZoomed"
          :actions="toolbarActions"
        >
          <viewer-toolbar
            :options="options"
            :current-index="currentIndex"
            :total="images.length"
            :zoom-ratio="zoomRatio"
            @zoom-in="zoomIn"
            @zoom-out="zoomOut"
            @reset="reset"
            @rotate-left="rotateLeft"
            @rotate-right="rotateRight"
            @flip-horizontal="flipHorizontal"
            @flip-vertical="flipVertical"
            @prev="prev"
            @next="next"
            @play="togglePlay"
            @fullscreen="toggleFullscreen"
            @close="close"
          />
        </slot>
      </div>

      <div ref="canvas" class="vue-viewer-canvas" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
        <!-- 动画关闭时直接渲染，避免 <transition> 引发的抖动/位移 -->
        <viewer-image
          v-if="transitionDisabled && currentImage"
          :key="getImageKey(currentImage, currentIndex)"
          ref="currentImageRef"
          :image="currentImage"
          :options="options"
          :index="currentIndex"
          :active="true"
          :transform="getImageTransform(currentIndex)"
          :loaded="loadedImages.has(currentIndex)"
          :loading="loadingImages.has(currentIndex)"
          :error="errorImages.has(currentIndex)"
          :retry-count="retryCounts[currentIndex] || 0"
          @load="handleImageLoad(currentIndex)"
          @error="handleImageError(currentIndex)"
          @retry="handleImageRetry(currentIndex)"
          @toggle-zoom="toggleZoom"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @drag="handleImageDrag"
        />
        <!-- 动画启用时走 transition -->
        <transition v-else :name="transitionEffect" :mode="transitionMode" :duration="transitionDuration">
          <viewer-image
            v-if="currentImage"
            :key="getImageKey(currentImage, currentIndex)"
            ref="currentImageRef"
            :image="currentImage"
            :options="options"
            :index="currentIndex"
            :active="true"
            :transform="getImageTransform(currentIndex)"
            :loaded="loadedImages.has(currentIndex)"
            :loading="loadingImages.has(currentIndex)"
            :error="errorImages.has(currentIndex)"
            :retry-count="retryCounts[currentIndex] || 0"
            @load="handleImageLoad(currentIndex)"
            @error="handleImageError(currentIndex)"
            @retry="handleImageRetry(currentIndex)"
            @toggle-zoom="toggleZoom"
            @zoom-in="zoomIn"
            @zoom-out="zoomOut"
            @drag="handleImageDrag"
          />
        </transition>

        <!-- canvas 内自定义浮层插槽（如水印、标记） -->
        <slot name="canvas-overlay" :current-image="currentImage" :current-index="currentIndex"></slot>
      </div>

      <button
        v-if="options.button !== false && !options.inline"
        type="button"
        class="vue-viewer-button vue-viewer-close"
        title="关闭"
        @click.stop="close"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div v-if="options.title && currentImage" class="vue-viewer-title">
        <slot name="title" :current-image="currentImage" :current-index="currentIndex" :total="images.length">
          <span v-if="typeof options.title === 'function'">{{ options.title(currentImage, currentIndex) }}</span>
          <template v-else>{{ currentImage.alt || currentImage.title || '' }}</template>
        </slot>
      </div>

      <!-- 缩略图导航栏插槽（位置由 navbarPosition 决定） -->
      <div
        v-if="options.navbar && images.length > 1 && !isPlaying"
        v-show="!options.navbarHover || showNavbar"
        class="vue-viewer-navbar-wrapper"
        :class="[`pos-${navbarPosition}`, { 'is-hover-hidden': options.navbarHover }]"
        @mouseenter="showNavbar = true"
        @mouseleave="showNavbar = false"
      >
        <div class="vue-viewer-navbar-content">
          <slot
            name="navbar"
            :images="images"
            :current-index="currentIndex"
            :go-to="goTo"
          >
            <thumbnail-virtual-list
              :images="images"
              :current-index="currentIndex"
              :options="options"
              :container-width="containerWidth"
              :direction="isVerticalNavbar ? 'vertical' : 'horizontal'"
              @select="goTo"
            />
          </slot>
        </div>
      </div>

      <div v-if="loading" class="vue-viewer-loading" :style="loadingStyle">
        <div class="vue-viewer-loading-indicator"></div>
      </div>

      <div v-if="tooltipEnabled" class="vue-viewer-tooltip" :class="{ 'is-centered': tooltipCentered }" :style="tooltipStyle" v-show="tooltipText">
        {{ tooltipText }}
      </div>

      <!-- 全屏播放状态指示器 -->
      <div v-if="isPlaying" class="vue-viewer-play-indicator" @click.stop="togglePlay">
        <div class="vv-play-progress-bar">
          <div class="vv-play-progress-fill" :style="{ width: playProgressPercent + '%' }"></div>
        </div>
        <div class="vv-play-controls">
          <span class="vv-play-index">{{ currentIndex + 1 }} / {{ images.length }}</span>
          <button class="vv-play-btn" type="button" :title="isPlaying ? '暂停' : '播放'">
            <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
          <span class="vv-play-hint">按 ESC 退出播放</span>
        </div>
      </div>
    </div>

    <div v-if="options.keyboard" class="vue-viewer-hint" v-show="hintVisible">
      <span v-for="(hint, i) in hints" :key="i" class="vue-viewer-hint-item">{{ hint }}</span>
    </div>
  </div>
</template>

<script>
import Vue from 'vue';
import ViewerImage from './viewer-image.vue';
import Toolbar from './toolbar.vue';
import ThumbnailVirtualList from './thumbnail-virtual-list.vue';
import { ImageLoader } from '../utils/image-loader';
import { MemoryManager } from '../utils/memory-manager';
import { TileRenderer } from '../utils/tile-renderer';

const VIEW_MODE_ORIGINAL = 0;
const VIEW_MODE_FIT = 1;
const VIEW_MODE_STRICT_FIT = 2;
const VIEW_MODE_ONE_TO_ONE = 3;

const EVENT_SHOWN = 'shown';
const EVENT_HIDDEN = 'hidden';
const EVENT_VIEW = 'view';
const EVENT_VIEWED = 'viewed';
const EVENT_OPEN = 'open';
const EVENT_CLOSE = 'close';
const EVENT_DESTROY = 'destroy';
const EVENT_ERROR = 'error';

const KEY_CODES = {
  ESC: 27,
  ENTER: 13,
  SPACE: 32,
  TAB: 9,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
  ZERO: 48,
  ONE: 49,
  L: 76,
  F: 70,
  Q: 81,
  E: 69,
  R: 82
};

export default {
  name: 'VueViewerjs',

  components: {
    ViewerImage,
    Toolbar,
    ThumbnailVirtualList
  },

  props: {
    images: {
      type: Array,
      default: () => []
    },
    options: {
      type: Object,
      default: () => ({})
    },
    visible: {
      type: Boolean,
      default: false
    },
    /**
     * 工具栏位置：top | bottom | left | right
     */
    toolbarPosition: {
      type: String,
      default: 'bottom',
      validator: (v) => ['top', 'bottom', 'left', 'right'].includes(v)
    },
    /**
     * 缩略图导航栏位置：top | bottom | left | right
     */
    navbarPosition: {
      type: String,
      default: 'bottom',
      validator: (v) => ['top', 'bottom', 'left', 'right'].includes(v)
    },
    /**
     * 缩略图导航栏是否鼠标悬停才显示：true | false
     */
    navbarHover: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      currentIndex: 0,
      isVisible: true,
      isFullscreen: false,
      isPlaying: false,
      isZoomed: false,
      isMoved: false,
      isRotated: false,
      isScaled: false,
      viewMode: VIEW_MODE_FIT,
      zoomRatio: 1,
      rotateAngle: 0,
      scaleX: 1,
      scaleY: 1,
      translateX: 0,
      translateY: 0,
      containerWidth: 0,
      containerHeight: 0,
      canvasWidth: 0,
      canvasHeight: 0,
      imageWidth: 0,
      imageHeight: 0,
      loading: false,
      currentTransitionName: 'fade',
      transitionPlayIndex: 0,
      tooltipText: '',
      tooltipX: 0,
      tooltipY: 0,
      tooltipCentered: false,
      hintVisible: false,
      showNavbar: true,
      hints: [
        '←/→ 上一张/下一张',
        '+/- 缩放',
        '←/→/↑/↓ 移动',
        'R 旋转',
        'F 镜像',
        'Q 退出'
      ],
      loadedImages: new Set(),
      loadingImages: new Set(),
      errorImages: new Set(),
      retryCounts: {},
      imageRefs: {},
      imageLoader: null,
      memoryManager: null,
      tileRenderer: null,
      playInterval: null,
      touchStartX: 0,
      touchStartY: 0,
      touchStartTime: 0,
      pinchStartDistance: 0,
      pinchStartScale: 1,
      VIEW_MODE_ORIGINAL,
      VIEW_MODE_FIT,
      VIEW_MODE_STRICT_FIT,
      VIEW_MODE_ONE_TO_ONE
    };
  },

  computed: {
    currentImage() {
      return this.images[this.currentIndex] || null;
    },

    isVerticalNavbar() {
      return this.navbarPosition === 'left' || this.navbarPosition === 'right';
    },

    /**
     * 内置动画名集合
     */
    transitionPresets() {
      return ['fade', 'slide', 'slide-reverse', 'slide-vertical', 'slide-vertical-reverse',
        'zoom', 'zoom-out', 'flip', 'flip-vertical', 'rotate', 'rotate-reverse',
        'blur', 'push', 'blinds', 'blinds-vertical'];
    },

    /** 是否完全关闭切换动画 */
    transitionDisabled() {
      const t = this.options.transition;
      return t === false || t === 'none';
    },

    /**
     * 切换动画效果名（实际用于 <transition name=""> 的最终值）
     * 通过 options.transition 配置：
     *   - false / 'none'  : 关闭动画
     *   - true            : 默认 'fade'
     *   - 字符串          : 内置动画名
     *   - 'random'        : 每次切换随机选一种内置动画
     *   - 数组            : 用户自定义动画合集，按顺序循环或随机抽取
     */
    transitionEffect() {
      const t = this.options.transition;
      if (t === false || t === 'none') return 'vue-viewer-none';
      // 数组合集 / 随机模式 → 由 currentTransitionName 动态决定
      if (Array.isArray(t) || t === 'random') return `vue-viewer-${this.currentTransitionName}`;
      if (typeof t === 'string') return `vue-viewer-${t}`;
      return 'vue-viewer-fade';
    },

    transitionMode() {
      // 同时进出的动画体验更明显
      return 'default';
    },

    transitionDuration() {
      const d = this.options.transitionDuration;
      return typeof d === 'number' ? d : 350;
    },

    toolbarActions() {
      // 暴露给 slot 使用，方便用户自定义工具栏复用内置行为
      return {
        zoomIn: this.zoomIn,
        zoomOut: this.zoomOut,
        reset: this.reset,
        rotateLeft: this.rotateLeft,
        rotateRight: this.rotateRight,
        flipHorizontal: this.flipHorizontal,
        flipVertical: this.flipVertical,
        prev: this.prev,
        next: this.next,
        play: this.togglePlay,
        fullscreen: this.toggleFullscreen,
        close: this.close,
        goTo: this.goTo
      };
    },

    viewerStyle() {
      const zIndex = this.options.zIndex || 2015;
      return {
        zIndex
      };
    },

    backdropStyle() {
      return {
        backgroundColor: this.options.backdropBackground || 'rgba(0, 0, 0, 0.8)'
      };
    },

    containerStyle() {
      if (this.options.inline) {
        return {
          width: this.options.width || '100%',
          height: this.options.height || '400px'
        };
      }
      return {};
    },

    loadingStyle() {
      return {
        backgroundColor: this.options.loadingBackground || 'rgba(0, 0, 0, 0.8)',
        fontSize: `${this.options.loadingFontSize || 16}px`
      };
    },

    tooltipStyle() {
      if (this.tooltipCentered) {
        return {
          left: '50%',
          top: 'auto',
          bottom: '80px',
          transform: 'translateX(-50%)'
        };
      }
      return {
        left: `${this.tooltipX}px`,
        top: `${this.tooltipY}px`
      };
    },

    /** 是否启用缩放比例提示（兜底默认 true） */
    tooltipEnabled() {
      const t = (this.mergedOptions || {}).tooltip;
      return t !== false;
    },

    mergedOptions() {
      return { ...this.$options.defaultOptions, ...this.options };
    },

    /** 播放进度百分比 */
    playProgressPercent() {
      if (!this.images || this.images.length === 0) return 0;
      return (this.currentIndex / (this.images.length - 1)) * 100;
    }
  },

  watch: {
    visible: {
      handler(val) {
        if (val) {
          this.show();
        } else if (this.isVisible) {
          this.hide();
        }
      }
    },
    currentIndex(val, oldVal) {
      this.pickTransitionName();
      this.onViewing(val, oldVal);
      this.preloadImages(val);
      this.cleanupMemory(oldVal);
      this.$emit('view', { index: val, image: this.images[val] });
    }
  },

  created() {
    this.imageLoader = new ImageLoader();
    this.memoryManager = new MemoryManager();
    this.tileRenderer = new TileRenderer();

    this.mergeOptions();
    this.bindEvents();
  },

  mounted() {
    // 组件挂载即显示（外层一般用 v-if 控制装载/卸载）
    this.init();
  },

  beforeDestroy() {
    this.destroy();
  },

  methods: {
    /**
     * 根据 options.transition 选取本次切换使用的动画名
     * - 字符串 'random' : 从内置合集随机
     * - 数组 ['fade','zoom','rotate']：按顺序循环；当 options.transitionRandom=true 则随机抽取
     * - 其他情况按字符串原样使用（由 transitionEffect 直接处理）
     */
    pickTransitionName() {
      const t = this.options.transition;
      const presets = this.transitionPresets;
      const random = this.options.transitionRandom === true;

      if (t === 'random') {
        const idx = Math.floor(Math.random() * presets.length);
        this.currentTransitionName = presets[idx];
        return;
      }
      if (Array.isArray(t) && t.length > 0) {
        if (random) {
          this.currentTransitionName = t[Math.floor(Math.random() * t.length)];
        } else {
          this.currentTransitionName = t[this.transitionPlayIndex % t.length];
          this.transitionPlayIndex++;
        }
        return;
      }
      // 单值字符串模式由 transitionEffect 计算属性直接处理，无需更新
    },

    mergeOptions() {
      const defaultOptions = this.$root.$options.VueViewerjs?.defaultOptions ||
        (this.$options.VueViewerjs?.defaultOptions) || {};
      this.$options.defaultOptions = { ...defaultOptions, ...this.options };
    },

    init() {
      this.isVisible = true;
      this.currentIndex = this.options.initialViewIndex || 0;

      Vue.nextTick(() => {
        // 模态模式：将根节点移动到 body，避免被父级 overflow/z-index 影响
        if (!this.options.inline && this.$el && this.$el.parentNode !== document.body) {
          document.body.appendChild(this.$el);
        }
        this.updateContainerSize();
        this.preloadImages(this.currentIndex);
        this.$emit(EVENT_OPEN);
        this.$emit(EVENT_SHOWN);
      });
    },

    show() {
      this.init();
    },

    hide() {
      this.isVisible = false;
      this.stopPlay();
      this.$emit(EVENT_CLOSE);
      this.$emit(EVENT_HIDDEN);
    },

    close() {
      this.stopPlay();
      this.hide();
    },

    destroy() {
      this.stopPlay();
      this.clearImageCache();
      this.memoryManager?.clearAll();
      this.$emit(EVENT_DESTROY);
    },

    bindEvents() {
      if (this.options.keyboard) {
        document.addEventListener('keydown', this.handleKeydown);
      }

      window.addEventListener('resize', this.handleResize);
      window.addEventListener('scroll', this.handleScroll, true);
    },

    unbindEvents() {
      if (this.options.keyboard) {
        document.removeEventListener('keydown', this.handleKeydown);
      }

      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('scroll', this.handleScroll, true);
    },

    handleKeydown(e) {
      if (!this.isVisible) return;

      const keyCode = e.keyCode || e.which;
      const ctrlKey = e.ctrlKey || e.metaKey;
      const shiftKey = e.shiftKey;

      switch (keyCode) {
        case KEY_CODES.ESC:
          e.preventDefault();
          if (this.isPlaying) {
            this.stopPlay();
          } else {
            this.close();
          }
          break;
        case KEY_CODES.Q:
          e.preventDefault();
          if (this.isPlaying) {
            this.stopPlay();
          } else {
            this.close();
          }
          break;
        case KEY_CODES.ARROW_LEFT:
          e.preventDefault();
          if (ctrlKey) {
            this.reset();
          } else {
            this.prev();
          }
          break;
        case KEY_CODES.ARROW_RIGHT:
          e.preventDefault();
          if (ctrlKey) {
            this.reset();
          } else {
            this.next();
          }
          break;
        case KEY_CODES.ARROW_UP:
          e.preventDefault();
          this.zoomIn(0.1);
          break;
        case KEY_CODES.ARROW_DOWN:
          e.preventDefault();
          this.zoomOut(0.1);
          break;
        case KEY_CODES.ZERO:
        case KEY_CODES.ONE:
          if (ctrlKey) {
            e.preventDefault();
            this.viewMode = keyCode === KEY_CODES.ZERO ? VIEW_MODE_FIT : VIEW_MODE_ONE_TO_ONE;
          }
          break;
        case KEY_CODES.SPACE:
          e.preventDefault();
          if (this.isPlaying) {
            this.stopPlay();
          } else {
            this.play();
          }
          break;
        case KEY_CODES.L:
          if (!ctrlKey) {
            e.preventDefault();
            this.toggleFullscreen();
          }
          break;
        case KEY_CODES.F:
          if (!ctrlKey) {
            e.preventDefault();
            this.flipHorizontal();
          }
          break;
        case KEY_CODES.E:
          if (!ctrlKey) {
            e.preventDefault();
            this.rotateRight();
          }
          break;
        case KEY_CODES.R:
          if (!ctrlKey) {
            e.preventDefault();
            this.rotateLeft();
          }
          break;
      }
    },

    handleResize() {
      this.updateContainerSize();
    },

    handleScroll() {
      if (this.options.inline) return;
    },

    handleViewerClick(e) {
      // 点击背景区域：已缩放则重置，未缩放则关闭
      if (e.target.classList.contains('vue-viewer-backdrop')) {
        if (this.isZoomed) {
          this.resetZoom();
        } else if (!this.options.inline) {
          this.close();
        }
        return;
      }
      // 点击 canvas 空白区域：原版 ViewerJS 行为为关闭预览（非内联模式）
      if (e.target.classList.contains('vue-viewer-canvas') ||
          e.target.classList.contains('vue-viewer-image-container')) {
        if (!this.options.inline) {
          this.close();
        }
      }
    },

    handleImageDrag({ translateX, translateY }) {
      this.translateX = translateX;
      this.translateY = translateY;
    },

    handleTouchStart(e) {
      if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
        this.isMoved = false;
      } else if (e.touches.length === 2) {
        this.pinchStartDistance = this.getDistance(e.touches[0], e.touches[1]);
        this.pinchStartScale = this.zoomRatio;
      }
    },

    handleTouchMove(e) {
      if (e.touches.length === 1 && !this.isZoomed) {
        const deltaX = e.touches[0].clientX - this.touchStartX;
        const deltaY = e.touches[0].clientY - this.touchStartY;

        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          this.isMoved = true;
        }
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const distance = this.getDistance(e.touches[0], e.touches[1]);
        const scale = distance / this.pinchStartDistance;
        const newRatio = this.pinchStartScale * scale;
        this.zoomRatio = Math.max(0.1, Math.min(10, newRatio));
        this.isZoomed = this.zoomRatio !== 1;
      }
    },

    handleTouchEnd(e) {
      if (e.touches.length === 0) {
        const touchEndTime = Date.now();
        const deltaTime = touchEndTime - this.touchStartTime;

        if (deltaTime < 300 && !this.isMoved && !this.isZoomed) {
          this.toggleZoom();
        }
      }
      this.isMoved = false;
    },

    getDistance(touch1, touch2) {
      return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
    },

    updateContainerSize() {
      const container = this.$refs.viewer?.parentElement || document.body;
      this.containerWidth = container.clientWidth;
      this.containerHeight = container.clientHeight;
    },

    goTo(index) {
      if (index < 0) {
        index = this.images.length - 1;
      } else if (index >= this.images.length) {
        index = 0;
      }
      this.currentIndex = index;
    },

    prev() {
      const prevIndex = this.currentIndex - 1;
      if (prevIndex >= 0) {
        this.goTo(prevIndex);
      }
    },

    next() {
      const nextIndex = this.currentIndex + 1;
      if (nextIndex < this.images.length) {
        this.goTo(nextIndex);
      }
    },

    zoomIn(ratio) {
      ratio = ratio || this.options.zoomRatio || 0.1;
      this.zoomRatio = Math.min(this.options.maxZoomRatio || 400, this.zoomRatio + ratio);
      this.isZoomed = this.zoomRatio !== 1;
      this.showZoomToast();
    },

    zoomOut(ratio) {
      ratio = ratio || this.options.zoomRatio || 0.1;
      this.zoomRatio = Math.max(this.options.minZoomRatio || 0.1, this.zoomRatio - ratio);
      if (this.zoomRatio === 1) {
        this.isZoomed = false;
        this.translateX = 0;
        this.translateY = 0;
      }
      this.showZoomToast();
    },

    zoomTo(ratio) {
      this.zoomRatio = Math.max(0.1, Math.min(400, ratio));
      this.isZoomed = this.zoomRatio !== 1;
      this.showZoomToast();
    },

    resetZoom() {
      this.zoomTo(1);
      this.showZoomToast();
      this.translateX = 0;
      this.translateY = 0;
    },

    rotate(angle) {
      this.rotateAngle = (this.rotateAngle + angle) % 360;
      this.isRotated = this.rotateAngle !== 0;
    },

    rotateLeft() {
      this.rotate(-90);
    },

    rotateRight() {
      this.rotate(90);
    },

    flip(direction) {
      if (direction === 'horizontal') {
        this.scaleX = -this.scaleX;
      } else {
        this.scaleY = -this.scaleY;
      }
      this.isScaled = this.scaleX !== 1 || this.scaleY !== 1;
    },

    flipHorizontal() {
      this.flip('horizontal');
    },

    flipVertical() {
      this.flip('vertical');
    },

    reset() {
      this.resetZoom();
      this.rotateAngle = 0;
      this.scaleX = 1;
      this.scaleY = 1;
      this.isRotated = false;
      this.isScaled = false;
    },

    toggleZoom() {
      if (this.isZoomed) {
        this.resetZoom();
      } else {
        this.zoomTo(2);
      }
    },

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        this.$refs.viewer?.requestFullscreen?.() ||
          this.$refs.viewer?.webkitRequestFullscreen?.();
        this.isFullscreen = true;
      } else {
        document.exitFullscreen?.() ||
          document.webkitExitFullscreen?.();
        this.isFullscreen = false;
      }
    },

    play() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.playInterval = setInterval(() => {
        this.next();
      }, this.options.interval || 5000);
    },

    stopPlay() {
      if (this.playInterval) {
        clearInterval(this.playInterval);
        this.playInterval = null;
      }
      this.isPlaying = false;
    },

    togglePlay() {
      if (this.isPlaying) {
        this.stopPlay();
      } else {
        this.play();
      }
    },

    getImageTransform(index) {
      if (index !== this.currentIndex) return null;

      const transforms = {
        scaleX: this.scaleX,
        scaleY: this.scaleY,
        rotate: this.rotateAngle,
        translateX: this.translateX,
        translateY: this.translateY,
        zoom: this.zoomRatio
      };

      return transforms;
    },

    getImageKey(image, index) {
      return image.src || image.url || image || index;
    },

    setImageRef(el, index) {
      if (el) {
        this.imageRefs[index] = el;
      }
    },

    handleImageLoad(index) {
      this.loadedImages.add(index);
      this.loadingImages.delete(index);
      this.errorImages.delete(index);
      this.$emit('viewed', { index, image: this.images[index] });
    },

    handleImageError(index) {
      this.errorImages.add(index);
      this.loadingImages.delete(index);
      this.$emit(EVENT_ERROR, { index, image: this.images[index] });
    },

    handleImageRetry(index) {
      const retryCount = this.retryCounts[index] || 0;
      const maxRetries = this.options.retry || 3;
      const retryInterval = this.options.retryInterval || 1000;

      if (retryCount < maxRetries) {
        this.retryCounts[index] = retryCount + 1;
        this.loadingImages.add(index);
        this.errorImages.delete(index);

        setTimeout(() => {
          const imageData = this.images[index];
          // 仅当目标 index 是当前展示项时才有 currentImageRef
          if (index === this.currentIndex && this.$refs.currentImageRef?.loadImage) {
            this.$refs.currentImageRef.loadImage(imageData);
          }
        }, retryInterval);
      }
    },

    preloadImages(centerIndex) {
      if (!this.options.lazyLoad) return;
      const bufferSize = this.options.bufferSize || 2;
      const startIndex = Math.max(0, centerIndex - bufferSize);
      const endIndex = Math.min(this.images.length - 1, centerIndex + bufferSize);

      // 仅做后台预热，不影响 UI 状态（避免与子组件 <img> 重复请求时阻塞 spinner）
      for (let i = startIndex; i <= endIndex; i++) {
        if (i === centerIndex) continue; // 当前项由子组件 <img> 自身加载
        const imageData = this.images[i];
        if (!imageData) continue;
        const src = imageData.src || imageData.url || imageData;
        if (!src) continue;
        // 浏览器缓存预热即可，不维护 loadedImages 状态
        this.imageLoader && this.imageLoader.load(src).catch(() => {});
      }
    },

    loadImage(index) {
      // 兼容保留：仅对显式调用且需要瓦片渲染的大图执行
      const imageData = this.images[index];
      if (!imageData) return;
      const src = imageData.src || imageData.url || imageData;
      const size = imageData.size;
      if (size && size > (this.options.largeImageThreshold || 2048)) {
        this.tileRenderer.render(src, this.$refs.canvas, {
          width: this.containerWidth,
          height: this.containerHeight,
          threshold: this.options.largeImageThreshold || 2048,
          onProgress: (progress) => {
            this.$emit('progress', { index, progress });
          }
        }).catch(() => {
          this.handleImageError(index);
        });
      }
    },

    cleanupMemory(index) {
      if (!this.options.autoGC) return;

      const bufferSize = this.options.bufferSize || 2;
      const keepRange = {
        start: Math.max(0, index - bufferSize),
        end: Math.min(this.images.length - 1, index + bufferSize)
      };

      for (let i = 0; i < this.images.length; i++) {
        if (i < keepRange.start || i > keepRange.end) {
          if (this.loadedImages.has(i)) {
            this.loadedImages.delete(i);
            this.memoryManager.releaseImage(this.images[i]);
          }
        }
      }
    },

    clearImageCache() {
      this.loadedImages.clear();
      this.loadingImages.clear();
      this.errorImages.clear();
      this.imageLoader?.clearCache();
      this.memoryManager?.clearAll();
    },

    onViewing(newIndex, oldIndex) {
      if (this.options.view) {
        this.options.view({
          index: newIndex,
          image: this.images[newIndex]
        });
      }
    },

    showTooltip(text, x, y, centered = false) {
      this.tooltipText = text;
      this.tooltipX = x || 0;
      this.tooltipY = y || 0;
      this.tooltipCentered = centered;
      setTimeout(() => {
        this.tooltipText = '';
        this.tooltipCentered = false;
      }, 800);
    },

    /** 显示缩放比例 toast（居中底部） */
    showZoomToast() {
      const percent = Math.round(this.zoomRatio * 100);
      this.showTooltip(`${percent}%`, -1, 0, true);
    }
  }
};
</script>

<style>
.vue-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.vue-viewer-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.vue-viewer-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2147483647 !important;
}

.vue-viewer-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
}

.vue-viewer-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ============ 工具栏与缩略图栏定位包装 ============ */
.vue-viewer-toolbar-wrapper,
.vue-viewer-navbar-wrapper {
  position: absolute;
  pointer-events: none;
}
.vue-viewer-toolbar-wrapper {
  z-index: 5;
}
.vue-viewer-navbar-wrapper {
  /* 必须高于 canvas 内部放大的图片，否则缩略图被盖住 */
  z-index: 4;
}
.vue-viewer-toolbar-wrapper > *,
.vue-viewer-navbar-wrapper > * {
  pointer-events: auto;
}

.vue-viewer-toolbar-wrapper.pos-top {
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 12px;
}
.vue-viewer-navbar-wrapper.pos-top {
  top: 56px;  /* 让出工具栏高度 */
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 8px;
}
.vue-viewer-toolbar-wrapper.pos-bottom {
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 12px;
}
.vue-viewer-navbar-wrapper.pos-bottom {
  bottom: 56px;  /* 让出工具栏高度 */
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 8px;
}
.vue-viewer-toolbar-wrapper.pos-left {
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  padding: 12px;
}
.vue-viewer-navbar-wrapper.pos-left {
  top: 0;
  bottom: 0;
  left: 56px;  /* 让出工具栏宽度 */
  display: flex;
  align-items: center;
  padding: 8px;
}
.vue-viewer-toolbar-wrapper.pos-right {
  top: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 12px;
}
.vue-viewer-navbar-wrapper.pos-right {
  top: 0;
  bottom: 0;
  right: 56px;  /* 让出工具栏宽度 */
  display: flex;
  align-items: center;
  padding: 8px;
}

/* 容器在 navbar/toolbar 同侧时，canvas 需叠加工具栏+缩略图栏的总空间 */
.vue-viewer-navbar-left .vue-viewer-canvas { margin-left: 88px; }
.vue-viewer-navbar-right .vue-viewer-canvas { margin-right: 88px; }
.vue-viewer-navbar-top .vue-viewer-canvas { margin-top: 76px; }
.vue-viewer-navbar-bottom .vue-viewer-canvas { margin-bottom: 76px; }
.vue-viewer-toolbar-left .vue-viewer-canvas { margin-left: 56px; }
.vue-viewer-toolbar-right .vue-viewer-canvas { margin-right: 56px; }
.vue-viewer-toolbar-top .vue-viewer-canvas { margin-top: 56px; }
.vue-viewer-toolbar-bottom .vue-viewer-canvas { margin-bottom: 56px; }

/* navbar + toolbar 同侧时，叠加拿出总空间 */
.vue-viewer-navbar-left.vue-viewer-toolbar-left .vue-viewer-canvas { margin-left: 144px; }
.vue-viewer-navbar-right.vue-viewer-toolbar-right .vue-viewer-canvas { margin-right: 144px; }
.vue-viewer-navbar-top.vue-viewer-toolbar-top .vue-viewer-canvas { margin-top: 132px; }
.vue-viewer-navbar-bottom.vue-viewer-toolbar-bottom .vue-viewer-canvas { margin-bottom: 132px; }

/* ============ 图片切换动画 ============ */
/* 关闭动画 */
.vue-viewer-none-enter-active,
.vue-viewer-none-leave-active { transition: none !important; }

/* 1. 淡入淡出 fade */
.vue-viewer-fade-enter-active,
.vue-viewer-fade-leave-active {
  transition: opacity 0.3s ease;
  position: absolute;
  inset: 0;
}
.vue-viewer-fade-enter,
.vue-viewer-fade-leave-to { opacity: 0; }

/* 2. 横向滑动 slide */
.vue-viewer-slide-enter-active,
.vue-viewer-slide-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s;
  position: absolute;
  inset: 0;
}
.vue-viewer-slide-enter { transform: translateX(100%); opacity: 0; }
.vue-viewer-slide-leave-to { transform: translateX(-100%); opacity: 0; }

/* 3. 纵向滑动 slide-vertical */
.vue-viewer-slide-vertical-enter-active,
.vue-viewer-slide-vertical-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s;
  position: absolute;
  inset: 0;
}
.vue-viewer-slide-vertical-enter { transform: translateY(100%); opacity: 0; }
.vue-viewer-slide-vertical-leave-to { transform: translateY(-100%); opacity: 0; }

/* 4. 缩放 zoom */
.vue-viewer-zoom-enter-active,
.vue-viewer-zoom-leave-active {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
  position: absolute;
  inset: 0;
}
.vue-viewer-zoom-enter { transform: scale(0.5); opacity: 0; }
.vue-viewer-zoom-leave-to { transform: scale(1.4); opacity: 0; }

/* 5. 翻转 flip */
.vue-viewer-flip-enter-active,
.vue-viewer-flip-leave-active {
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s;
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  perspective: 1200px;
}
.vue-viewer-flip-enter { transform: rotateY(-90deg); opacity: 0; }
.vue-viewer-flip-leave-to { transform: rotateY(90deg); opacity: 0; }

/* 6. 旋转 rotate */
.vue-viewer-rotate-enter-active,
.vue-viewer-rotate-leave-active {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s;
  position: absolute;
  inset: 0;
}
.vue-viewer-rotate-enter { transform: rotate(-180deg) scale(0.4); opacity: 0; }
.vue-viewer-rotate-leave-to { transform: rotate(180deg) scale(0.4); opacity: 0; }

/* 7. 模糊 blur */
.vue-viewer-blur-enter-active,
.vue-viewer-blur-leave-active {
  transition: filter 0.4s ease, opacity 0.4s ease;
  position: absolute;
  inset: 0;
}
.vue-viewer-blur-enter,
.vue-viewer-blur-leave-to { filter: blur(20px); opacity: 0; }

/* 8. 反向横滑 slide-reverse */
.vue-viewer-slide-reverse-enter-active,
.vue-viewer-slide-reverse-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s;
  position: absolute;
  inset: 0;
}
.vue-viewer-slide-reverse-enter { transform: translateX(-100%); opacity: 0; }
.vue-viewer-slide-reverse-leave-to { transform: translateX(100%); opacity: 0; }

/* 9. 反向纵滑 slide-vertical-reverse */
.vue-viewer-slide-vertical-reverse-enter-active,
.vue-viewer-slide-vertical-reverse-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s;
  position: absolute;
  inset: 0;
}
.vue-viewer-slide-vertical-reverse-enter { transform: translateY(-100%); opacity: 0; }
.vue-viewer-slide-vertical-reverse-leave-to { transform: translateY(100%); opacity: 0; }

/* 10. 缩出 zoom-out（旧的放大消失，新的缩入） */
.vue-viewer-zoom-out-enter-active,
.vue-viewer-zoom-out-leave-active {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s;
  position: absolute;
  inset: 0;
}
.vue-viewer-zoom-out-enter { transform: scale(1.6); opacity: 0; }
.vue-viewer-zoom-out-leave-to { transform: scale(0.4); opacity: 0; }

/* 11. 垂直翻转 flip-vertical */
.vue-viewer-flip-vertical-enter-active,
.vue-viewer-flip-vertical-leave-active {
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s;
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  perspective: 1200px;
}
.vue-viewer-flip-vertical-enter { transform: rotateX(-90deg); opacity: 0; }
.vue-viewer-flip-vertical-leave-to { transform: rotateX(90deg); opacity: 0; }

/* 12. 反向旋转 rotate-reverse */
.vue-viewer-rotate-reverse-enter-active,
.vue-viewer-rotate-reverse-leave-active {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s;
  position: absolute;
  inset: 0;
}
.vue-viewer-rotate-reverse-enter { transform: rotate(180deg) scale(0.4); opacity: 0; }
.vue-viewer-rotate-reverse-leave-to { transform: rotate(-180deg) scale(0.4); opacity: 0; }

/* 13. 推入 push（新图从右推入，旧图被挤到左侧并淡化缩小） */
.vue-viewer-push-enter-active,
.vue-viewer-push-leave-active {
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s;
  position: absolute;
  inset: 0;
}
.vue-viewer-push-enter { transform: translateX(100%) scale(0.9); opacity: 0.4; }
.vue-viewer-push-leave-to { transform: translateX(-30%) scale(0.85); opacity: 0; }

/* 14. 百叶窗 blinds（横向 6 条逐条翻入，使用 clip-path 多边形动画） */
@keyframes vue-viewer-blinds-in {
  from {
    clip-path: polygon(
      0 0, 100% 0, 100% 0, 0 0,
      0 16.66%, 100% 16.66%, 100% 16.66%, 0 16.66%,
      0 33.33%, 100% 33.33%, 100% 33.33%, 0 33.33%,
      0 50%, 100% 50%, 100% 50%, 0 50%,
      0 66.66%, 100% 66.66%, 100% 66.66%, 0 66.66%,
      0 83.33%, 100% 83.33%, 100% 83.33%, 0 83.33%
    );
  }
  to {
    clip-path: polygon(
      0 0, 100% 0, 100% 16.66%, 0 16.66%,
      0 16.66%, 100% 16.66%, 100% 33.33%, 0 33.33%,
      0 33.33%, 100% 33.33%, 100% 50%, 0 50%,
      0 50%, 100% 50%, 100% 66.66%, 0 66.66%,
      0 66.66%, 100% 66.66%, 100% 83.33%, 0 83.33%,
      0 83.33%, 100% 83.33%, 100% 100%, 0 100%
    );
  }
}
@keyframes vue-viewer-blinds-out {
  from {
    clip-path: polygon(
      0 0, 100% 0, 100% 16.66%, 0 16.66%,
      0 16.66%, 100% 16.66%, 100% 33.33%, 0 33.33%,
      0 33.33%, 100% 33.33%, 100% 50%, 0 50%,
      0 50%, 100% 50%, 100% 66.66%, 0 66.66%,
      0 66.66%, 100% 66.66%, 100% 83.33%, 0 83.33%,
      0 83.33%, 100% 83.33%, 100% 100%, 0 100%
    );
  }
  to {
    clip-path: polygon(
      0 0, 100% 0, 100% 0, 0 0,
      0 16.66%, 100% 16.66%, 100% 16.66%, 0 16.66%,
      0 33.33%, 100% 33.33%, 100% 33.33%, 0 33.33%,
      0 50%, 100% 50%, 100% 50%, 0 50%,
      0 66.66%, 100% 66.66%, 100% 66.66%, 0 66.66%,
      0 83.33%, 100% 83.33%, 100% 83.33%, 0 83.33%
    );
  }
}
.vue-viewer-blinds-enter-active {
  animation: vue-viewer-blinds-in 0.55s cubic-bezier(0.4, 0, 0.2, 1) both;
  position: absolute;
  inset: 0;
}
.vue-viewer-blinds-leave-active {
  animation: vue-viewer-blinds-out 0.55s cubic-bezier(0.4, 0, 0.2, 1) both;
  position: absolute;
  inset: 0;
}

/* 15. 垂直百叶窗 blinds-vertical（纵向 6 条） */
@keyframes vue-viewer-blinds-vertical-in {
  from {
    clip-path: polygon(
      0 0, 0 100%, 0 100%, 0 0,
      16.66% 0, 16.66% 100%, 16.66% 100%, 16.66% 0,
      33.33% 0, 33.33% 100%, 33.33% 100%, 33.33% 0,
      50% 0, 50% 100%, 50% 100%, 50% 0,
      66.66% 0, 66.66% 100%, 66.66% 100%, 66.66% 0,
      83.33% 0, 83.33% 100%, 83.33% 100%, 83.33% 0
    );
  }
  to {
    clip-path: polygon(
      0 0, 0 100%, 16.66% 100%, 16.66% 0,
      16.66% 0, 16.66% 100%, 33.33% 100%, 33.33% 0,
      33.33% 0, 33.33% 100%, 50% 100%, 50% 0,
      50% 0, 50% 100%, 66.66% 100%, 66.66% 0,
      66.66% 0, 66.66% 100%, 83.33% 100%, 83.33% 0,
      83.33% 0, 83.33% 100%, 100% 100%, 100% 0
    );
  }
}
@keyframes vue-viewer-blinds-vertical-out {
  from {
    clip-path: polygon(
      0 0, 0 100%, 16.66% 100%, 16.66% 0,
      16.66% 0, 16.66% 100%, 33.33% 100%, 33.33% 0,
      33.33% 0, 33.33% 100%, 50% 100%, 50% 0,
      50% 0, 50% 100%, 66.66% 100%, 66.66% 0,
      66.66% 0, 66.66% 100%, 83.33% 100%, 83.33% 0,
      83.33% 0, 83.33% 100%, 100% 100%, 100% 0
    );
  }
  to {
    clip-path: polygon(
      0 0, 0 100%, 0 100%, 0 0,
      16.66% 0, 16.66% 100%, 16.66% 100%, 16.66% 0,
      33.33% 0, 33.33% 100%, 33.33% 100%, 33.33% 0,
      50% 0, 50% 100%, 50% 100%, 50% 0,
      66.66% 0, 66.66% 100%, 66.66% 100%, 66.66% 0,
      83.33% 0, 83.33% 100%, 83.33% 100%, 83.33% 0
    );
  }
}
.vue-viewer-blinds-vertical-enter-active {
  animation: vue-viewer-blinds-vertical-in 0.55s cubic-bezier(0.4, 0, 0.2, 1) both;
  position: absolute;
  inset: 0;
}
.vue-viewer-blinds-vertical-leave-active {
  animation: vue-viewer-blinds-vertical-out 0.55s cubic-bezier(0.4, 0, 0.2, 1) both;
  position: absolute;
  inset: 0;
}


.vue-viewer-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.vue-viewer-canvas:active {
  cursor: grabbing;
}

.vue-viewer-button {
  position: absolute;
  padding: 0;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  outline: none;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.vue-viewer-button:hover {
  opacity: 1;
}

.vue-viewer-close {
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  z-index: 10;
}

.vue-viewer-close svg {
  width: 100%;
  height: 100%;
}

.vue-viewer-title {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 14px;
  border-radius: 4px;
  max-width: 80%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vue-viewer-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  z-index: 5;
}

.vue-viewer-loading-indicator {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: vue-viewer-spin 1s linear infinite;
}

@keyframes vue-viewer-spin {
  to {
    transform: rotate(360deg);
  }
}

.vue-viewer-tooltip {
  position: absolute;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 12px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 100;
  transform: translate(-50%, -150%);
}
.vue-viewer-tooltip.is-centered {
  transform: translateX(-50%);
  bottom: 80px;
  top: auto;
  left: 50%;
}

.vue-viewer-hint {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  z-index: 10;
}

.vue-viewer-hint-item {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  white-space: nowrap;
}

.vue-viewer-one-to-one {
  cursor: move;
}

.vue-viewer-zoomed {
  cursor: move;
}

/* ============ 全屏播放指示器 ============ */
.vue-viewer-play-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 12px 20px 16px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: auto;
}

.vv-play-progress-bar {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}
.vv-play-progress-fill {
  height: 100%;
  background: #4fc3f7;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.vv-play-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
.vv-play-index {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  min-width: 60px;
}
.vv-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.vv-play-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
.vv-play-btn svg {
  width: 14px;
  height: 14px;
}
.vv-play-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-left: auto;
}
</style>
