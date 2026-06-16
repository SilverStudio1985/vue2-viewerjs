<template>
  <div
    ref="container"
    class="vue-viewer-thumbnail-virtual-list"
    :class="{ 'is-vertical': isVertical }"
    @scroll="handleScroll"
    @wheel.prevent="handleWheel"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div class="vue-viewer-thumbnail-virtual-spacer" :style="spacerStyle">
      <div
        v-for="item in visibleItems"
        :key="item.key"
        class="vue-viewer-thumbnail"
        :class="{ active: item.index === currentIndex }"
        :style="getItemStyle(item)"
        @click="handleClick(item.index)"
        @touchstart="handleThumbnailTouchStart(item.index, $event)"
        @touchmove="handleThumbnailTouchMove(item.index, $event)"
        @touchend="handleThumbnailTouchEnd(item.index, $event)"
      >
        <img
          :src="getThumbnailSrc(item.image)"
          :alt="item.image.alt || item.image.title || ''"
          class="vue-viewer-thumbnail-image loaded"
          loading="lazy"
          @load="handleImageLoad(item.index)"
          @error="handleImageError(item.index)"
        />
        <div v-if="item.index === currentIndex" class="vue-viewer-thumbnail-active-indicator"></div>
      </div>
    </div>

    <div v-if="showScrollbar" class="vue-viewer-thumbnail-scrollbar">
      <div
        class="vue-viewer-thumbnail-scrollbar-thumb"
        :style="scrollbarThumbStyle"
      ></div>
    </div>
  </div>
</template>

<script>
import { ImageLoader } from '../utils/image-loader';

export default {
  name: 'ThumbnailVirtualList',

  props: {
    images: {
      type: Array,
      default: () => []
    },
    currentIndex: {
      type: Number,
      default: 0
    },
    options: {
      type: Object,
      default: () => ({})
    },
    containerWidth: {
      type: Number,
      default: 0
    },
    /** 方向：horizontal | vertical */
    direction: {
      type: String,
      default: 'horizontal'
    }
  },

  data() {
    return {
      itemWidth: 60,
      itemHeight: 60,
      gap: 8,
      scrollLeft: 0,
      localContainerWidth: 0,
      visibleItems: [],
      loadedThumbnails: new Set(),
      loadingThumbnails: new Set(),
      errorThumbnails: new Set(),
      showScrollbar: false,
      scrollbarThumbWidth: 0,
      touchStartX: 0,
      touchStartIndex: -1,
      thumbnailRefs: {}
    };
  },

  computed: {
    isVertical() {
      return this.direction === 'vertical';
    },

    effectiveWidth() {
      if (this.isVertical) {
        return this.localContainerWidth || 600;
      }
      return this.localContainerWidth || this.containerWidth || 600;
    },

    totalWidth() {
      return this.images.length * (this.itemWidth + this.gap) - this.gap;
    },

    spacerStyle() {
      if (this.isVertical) {
        return {
          width: `${this.itemWidth}px`,
          height: `${this.totalWidth}px`
        };
      }
      return {
        width: `${this.totalWidth}px`,
        height: `${this.itemHeight}px`
      };
    },

    scrollbarThumbStyle() {
      const ratio = this.scrollLeft / (this.totalWidth || 1);
      const visibleRatio = this.effectiveWidth / (this.totalWidth || 1);
      const thumbWidth = Math.max(30, visibleRatio * 100);

      return {
        width: `${thumbWidth}%`,
        left: `${ratio * (100 - thumbWidth)}%`
      };
    },

    bufferSize() {
      return this.options.bufferSize || 2;
    },

    thumbnailLimit() {
      return this.options.thumbnailLimit || 10;
    },

    visibleCount() {
      return Math.ceil(this.effectiveWidth / (this.itemWidth + this.gap)) + this.bufferSize * 2;
    }
  },

  watch: {
    currentIndex: {
      immediate: true,
      handler(val) {
        this.$nextTick(() => {
          this.scrollToIndex(val);
          this.preloadThumbnails(val);
        });
      }
    },
    scrollLeft() {
      this.updateVisibleItems();
    },
    images() {
      this.$nextTick(() => {
        this.updateContainerWidth();
        this.updateVisibleItems();
      });
    }
  },

  created() {
    this.imageLoader = new ImageLoader();
  },

  mounted() {
    this.updateContainerWidth();
    this.updateVisibleItems();
    this.preloadThumbnails(this.currentIndex);

    window.addEventListener('resize', this.handleWindowResize);
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.handleWindowResize);
    this.clearCache();
  },

  methods: {
    updateContainerWidth() {
      if (this.$refs.container) {
        this.localContainerWidth = this.isVertical
          ? this.$refs.container.clientHeight
          : this.$refs.container.clientWidth;
      }
    },

    handleWindowResize() {
      this.updateContainerWidth();
      this.updateVisibleItems();
    },

    handleScroll(e) {
      const target = e.target || e.currentTarget;
      this.scrollLeft = this.isVertical ? (target.scrollTop || 0) : (target.scrollLeft || 0);
      this.showScrollbar = true;

      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.showScrollbar = false;
      }, 1000);
    },

    handleWheel(e) {
      // 滚轮控制缩略图滚动：横向布局时把纵向滚动映射成横向；纵向布局时保持纵向滚动
      if (!this.$refs.container) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const step = delta * 1.2; // 微调灵敏度
      if (this.isVertical) {
        this.$refs.container.scrollTop += step;
      } else {
        this.$refs.container.scrollLeft += step;
      }
    },

    handleTouchStart(e) {
      this.touchStartX = e.touches[0].clientX;
    },

    handleTouchMove(e) {
    },

    handleTouchEnd(e) {
    },

    handleThumbnailTouchStart(index, e) {
      this.touchStartIndex = index;
      this.touchStartX = e.touches[0].clientX;
    },

    handleThumbnailTouchMove(index, e) {
    },

    handleThumbnailTouchEnd(index, e) {
      if (this.touchStartIndex === index) {
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = Math.abs(touchEndX - this.touchStartX);

        if (deltaX < 10) {
          this.handleClick(index);
        }
      }
      this.touchStartIndex = -1;
    },

    handleClick(index) {
      this.$emit('select', index);
    },

    handleImageLoad(index) {
      this.loadedThumbnails.add(index);
      this.loadingThumbnails.delete(index);
    },

    handleImageError(index) {
      this.errorThumbnails.add(index);
      this.loadingThumbnails.delete(index);
    },

    updateVisibleItems() {
      const startIndex = Math.max(0, Math.floor(this.scrollLeft / (this.itemWidth + this.gap)) - this.bufferSize);
      const endIndex = Math.min(
        this.images.length - 1,
        startIndex + this.visibleCount + this.bufferSize
      );

      const items = [];
      for (let i = startIndex; i <= endIndex; i++) {
        const image = this.images[i];
        if (image) {
          items.push({
            index: i,
            key: this.getImageKey(image, i),
            image,
            loaded: this.loadedThumbnails.has(i),
            loading: this.loadingThumbnails.has(i),
            error: this.errorThumbnails.has(i)
          });
        }
      }

      this.visibleItems = items;
    },

    scrollToIndex(index) {
      if (!this.$refs.container) return;

      const targetScroll = index * (this.itemWidth + this.gap) - this.effectiveWidth / 2 + this.itemWidth / 2;
      const clampedScroll = Math.max(0, Math.min(targetScroll, Math.max(0, this.totalWidth - this.effectiveWidth)));

      if (this.isVertical) {
        this.$refs.container.scrollTo({
          top: clampedScroll,
          behavior: 'smooth'
        });
      } else {
        this.$refs.container.scrollTo({
          left: clampedScroll,
          behavior: 'smooth'
        });
      }

      this.scrollLeft = clampedScroll;
    },

    getItemStyle(item) {
      if (this.isVertical) {
        return {
          position: 'absolute',
          left: '0',
          top: `${item.index * (this.itemWidth + this.gap)}px`,
          width: `${this.itemWidth}px`,
          height: `${this.itemHeight}px`
        };
      }
      return {
        position: 'absolute',
        top: '0',
        left: `${item.index * (this.itemWidth + this.gap)}px`,
        width: `${this.itemWidth}px`,
        height: `${this.itemHeight}px`
      };
    },

    getImageKey(image, index) {
      return image.src || image.url || image.thumbnail || image || index;
    },

    getThumbnailSrc(image) {
      return image.thumbnail || image.src || image.url || image;
    },

    isInBufferRange(index) {
      const bufferSize = this.options.bufferSize || 2;
      const start = Math.max(0, this.currentIndex - bufferSize);
      const end = Math.min(this.images.length - 1, this.currentIndex + bufferSize);
      return index >= start && index <= end;
    },

    preloadThumbnails(centerIndex) {
      const bufferSize = this.options.bufferSize || 2;
      const startIndex = Math.max(0, centerIndex - bufferSize * 2);
      const endIndex = Math.min(this.images.length - 1, centerIndex + bufferSize * 2);

      for (let i = startIndex; i <= endIndex; i++) {
        if (!this.loadedThumbnails.has(i) && !this.loadingThumbnails.has(i)) {
          this.loadThumbnail(i);
        }
      }
    },

    loadThumbnail(index) {
      const image = this.images[index];
      if (!image) return;

      this.loadingThumbnails.add(index);

      const src = this.getThumbnailSrc(image);
      if (!src) {
        this.errorThumbnails.add(index);
        this.loadingThumbnails.delete(index);
        return;
      }

      this.imageLoader.load(src).then(() => {
        this.loadedThumbnails.add(index);
        this.loadingThumbnails.delete(index);
      }).catch(() => {
        this.errorThumbnails.add(index);
        this.loadingThumbnails.delete(index);
      });
    },

    clearCache() {
      this.loadedThumbnails.clear();
      this.loadingThumbnails.clear();
      this.errorThumbnails.clear();
      this.imageLoader?.clearCache();
    }
  }
};
</script>

<style>
.vue-viewer-thumbnail-virtual-list {
  position: relative;
  width: 100%;
  height: 80px;
  padding: 8px 0;
  overflow-x: auto;
  overflow-y: hidden;
  background: rgba(0, 0, 0, 0.5);
  -webkit-overflow-scrolling: touch;
  border-radius: 6px;
}

.vue-viewer-thumbnail-virtual-list.is-vertical {
  width: 80px;
  height: 100%;
  padding: 0 8px;
  overflow-x: hidden;
  overflow-y: auto;
}

.vue-viewer-thumbnail-virtual-list.is-vertical::-webkit-scrollbar {
  width: 4px;
  height: auto;
}

.vue-viewer-thumbnail-virtual-list::-webkit-scrollbar {
  height: 4px;
}

.vue-viewer-thumbnail-virtual-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.vue-viewer-thumbnail-virtual-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.vue-viewer-thumbnail-virtual-spacer {
  position: relative;
  height: 100%;
}

.vue-viewer-thumbnail {
  position: relative;
  flex-shrink: 0;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, border-color 0.2s;
}

.vue-viewer-thumbnail:hover {
  opacity: 1;
}

.vue-viewer-thumbnail.active {
  opacity: 1;
  border-color: #fff;
}

.vue-viewer-thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s;
}

.vue-viewer-thumbnail-image.loaded {
  opacity: 1;
}

.vue-viewer-thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
}

.vue-viewer-thumbnail-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.vue-viewer-thumbnail-active-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #fff;
}

.vue-viewer-thumbnail-scrollbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  pointer-events: none;
}

.vue-viewer-thumbnail-scrollbar-thumb {
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 2px;
  transition: width 0.1s;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
