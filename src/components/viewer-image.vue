<template>
  <div
    class="vue-viewer-image-container"
    :style="containerStyle"
  >
    <img
      v-if="!useTileRender"
      ref="img"
      class="vue-viewer-image"
      :src="currentSrc"
      :style="imageStyle"
      :alt="image.alt || image.title || ''"
      :crossorigin="image.crossOrigin || 'anonymous'"
      draggable="false"
      @load="handleLoad"
      @error="handleError"
      @mousedown.prevent="handleMouseDown"
      @wheel.prevent="handleWheel"
      @dblclick.stop="handleDblClick"
    />

    <canvas
      v-if="useTileRender"
      ref="tileCanvas"
      class="vue-viewer-image vue-viewer-image-tile"
      :style="imageStyle"
    />

    <div v-if="localLoading && options.loading !== false" class="vue-viewer-image-loading">
      <div class="vue-viewer-spinner"></div>
    </div>

    <div v-if="localError && options.errorIcon" class="vue-viewer-image-error" @click="handleRetry">
      <img :src="options.errorIcon" alt="Error" class="vue-viewer-error-icon" />
      <span v-if="retryCount < maxRetry" class="vue-viewer-retry-hint">
        点击重试 ({{ maxRetry - retryCount }})
      </span>
    </div>
  </div>
</template>

<script>
import { TileRenderer } from '../utils/tile-renderer';

export default {
  name: 'ViewerImage',

  props: {
    image: {
      type: Object,
      required: true
    },
    options: {
      type: Object,
      default: () => ({})
    },
    index: {
      type: Number,
      default: 0
    },
    active: {
      type: Boolean,
      default: false
    },
    transform: {
      type: Object,
      default: null
    },
    loaded: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: Boolean,
      default: false
    },
    retryCount: {
      type: Number,
      default: 0
    }
  },

  data() {
    const initSrc = this.image
      ? (this.image.src || this.image.url || this.image)
      : '';
    return {
      currentSrc: initSrc || '',
      imgWidth: 0,
      imgHeight: 0,
      naturalWidth: 0,
      naturalHeight: 0,
      isDragging: false,
      hasMoved: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      useTileRender: false,
      tileRenderer: null,
      maxRetry: 3,
      localLoading: !!initSrc,
      localError: false
    };
  },

  computed: {
    containerStyle() {
      return {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      };
    },

    imageStyle() {
      const baseStyle = {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        cursor: 'zoom-in'
      };

      if (!this.transform) {
        return baseStyle;
      }

      const { scaleX = 1, scaleY = 1, rotate = 0, translateX = 0, translateY = 0, zoom = 1 } = this.transform;

      const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX * zoom}, ${scaleY * zoom}) rotate(${rotate}deg)`;

      return {
        ...baseStyle,
        transformOrigin: 'center center',
        transform,
        transition: this.isDragging ? 'none' : (this.options.imageTransition !== false ? 'transform 0.3s ease' : 'none'),
        cursor: this.isDragging ? 'grabbing' : 'grab'
      };
    },

    hasError() {
      return this.error;
    },

    isLoading() {
      return this.loading;
    }
  },

  watch: {
    image: {
      handler(newImage) {
        const src = newImage ? (newImage.src || newImage.url || newImage) : '';
        if (src) {
          this.currentSrc = src;
          this.localLoading = true;
          this.localError = false;
        }
        if (this.active) {
          this.loadImage(newImage);
        }
      }
    },
    active(val) {
      if (val) {
        this.loadImage(this.image);
      }
    }
  },

  created() {
    this.tileRenderer = new TileRenderer();
  },

  mounted() {
    // 组件挂载时若为 active 则确保触发加载逻辑（更新尺寸/瓦片渲染）
    if (this.active) {
      this.loadImage(this.image);
    }
  },

  methods: {
    loadImage(imageData) {
      if (!imageData) return;
      const src = imageData.src || imageData.url || imageData;
      if (!src) return;

      this.currentSrc = src;
      // 主显示由模板里的 <img> 直接加载（@load/@error 触发 handleLoad/handleError）
      // 此处仅在需要瓦片渲染时主动加载用于尺寸计算
      const threshold = this.options.largeImageThreshold || 2048;

      const probe = new Image();
      probe.crossOrigin = imageData.crossOrigin || 'anonymous';
      probe.onload = () => {
        this.naturalWidth = probe.naturalWidth;
        this.naturalHeight = probe.naturalHeight;
        this.imgWidth = probe.naturalWidth;
        this.imgHeight = probe.naturalHeight;
        if (probe.naturalWidth > threshold || probe.naturalHeight > threshold) {
          this.useTileRender = true;
          this.localLoading = false;
          this.localError = false;
          this.$nextTick(() => this.initTileRender(src, probe));
          this.$emit('load', {
            index: this.index,
            image: imageData,
            width: probe.naturalWidth,
            height: probe.naturalHeight
          });
        } else {
          this.useTileRender = false;
        }
      };
      probe.onerror = () => {
        // 主 <img> 也会触发 error，这里不重复发事件
      };
      probe.src = src;
    },

    initTileRender(src, img) {
      if (!this.$refs.tileCanvas) return;

      const canvas = this.$refs.tileCanvas;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      this.tileRenderer.render(src, canvas, {
        width: img.naturalWidth,
        height: img.naturalHeight,
        threshold: this.options.largeImageThreshold || 2048,
        onProgress: (progress) => {
          this.$emit('progress', { index: this.index, progress });
        }
      }).catch(() => {
        // 瓦片渲染失败，回退到普通 img 显示
        this.useTileRender = false;
        this.localLoading = false;
      });
    },

    handleLoad(e) {
      this.localLoading = false;
      this.localError = false;
      this.naturalWidth = e.target.naturalWidth;
      this.naturalHeight = e.target.naturalHeight;
      this.imgWidth = e.target.naturalWidth;
      this.imgHeight = e.target.naturalHeight;
      this.$emit('load', {
        index: this.index,
        image: this.image,
        width: e.target.naturalWidth,
        height: e.target.naturalHeight
      });
    },

    handleError(e) {
      this.localLoading = false;
      this.localError = true;
      this.$emit('error', {
        index: this.index,
        image: this.image
      });
    },

    handleMouseDown(e) {
      if (e.button !== 0) return;
      // 对齐原版 ViewerJS：任何缩放级别下都允许拖拽平移图片
      e.preventDefault();
      this.isDragging = true;
      this.hasMoved = false;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.currentX = this.transform?.translateX || 0;
      this.currentY = this.transform?.translateY || 0;

      document.addEventListener('mousemove', this.handleGlobalMouseMove);
      document.addEventListener('mouseup', this.handleGlobalMouseUp);
    },

    handleClick() {
      // 单击不切换缩放（原版 ViewerJS 行为：单击仅触发 click 事件）
      this.$emit('click', this.index);
    },

    handleGlobalMouseMove(e) {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.startX;
      const deltaY = e.clientY - this.startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        this.hasMoved = true;
      }

      this.$emit('drag', {
        index: this.index,
        deltaX,
        deltaY,
        translateX: this.currentX + deltaX,
        translateY: this.currentY + deltaY
      });
    },

    handleGlobalMouseUp() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.handleGlobalMouseMove);
      document.removeEventListener('mouseup', this.handleGlobalMouseUp);
    },

    handleWheel(e) {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY || e.wheelDelta;
      const zoomFactor = this.options.zoomRatio || 0.1;

      if (delta < 0) {
        this.$emit('zoom-in', zoomFactor);
      } else {
        this.$emit('zoom-out', zoomFactor);
      }
    },

    handleDblClick(e) {
      this.$emit('toggle-zoom');
    },

    handleRetry() {
      this.$emit('retry', this.index);
    }
  },

  beforeDestroy() {
    document.removeEventListener('mousemove', this.handleGlobalMouseMove);
    document.removeEventListener('mouseup', this.handleGlobalMouseUp);

    if (this.$refs.img) {
      this.$refs.img.onload = null;
      this.$refs.img.onerror = null;
    }
  }
};
</script>

<style>
.vue-viewer-image-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vue-viewer-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  -webkit-user-drag: none;
  -moz-user-drag: none;
  user-select: none;
}

.vue-viewer-image-tile {
  cursor: move;
}

.vue-viewer-image-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #fff;
}

.vue-viewer-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.vue-viewer-image-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
}

.vue-viewer-error-icon {
  width: 64px;
  height: 64px;
  opacity: 0.5;
}

.vue-viewer-retry-hint {
  font-size: 12px;
  cursor: pointer;
  opacity: 0.8;
}

.vue-viewer-retry-hint:hover {
  opacity: 1;
  text-decoration: underline;
}
</style>
