<template>
  <div class="vue-viewer-toolbar" role="toolbar" aria-label="Image viewer toolbar">
    <div class="vue-viewer-toolbar-list">
      <button
        v-if="options.zoomable"
        type="button"
        class="vue-viewer-toolbar-btn"
        :title="'放大 (↑)'"
        @click="$emit('zoom-in')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>

      <button
        v-if="options.zoomable"
        type="button"
        class="vue-viewer-toolbar-btn"
        :title="'缩小 (↓)'"
        @click="$emit('zoom-out')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
      </button>

      <button
        v-if="options.rotatable"
        type="button"
        class="vue-viewer-toolbar-btn"
        :title="'向左旋转 (R)'"
        @click="$emit('rotate-left')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
      </button>

      <button
        v-if="options.rotatable"
        type="button"
        class="vue-viewer-toolbar-btn"
        :title="'向右旋转 (E)'"
        @click="$emit('rotate-right')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
      </button>

      <button
        v-if="options.scalable"
        type="button"
        class="vue-viewer-toolbar-btn"
        :title="'水平镜像 (F)'"
        @click="$emit('flip-horizontal')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v18"></path>
          <path d="M3 12h18"></path>
          <path d="M3 12a9 9 0 0 1 9-9"></path>
          <path d="M21 12a9 9 0 0 1-9 9"></path>
        </svg>
      </button>

      <button
        v-if="options.scalable"
        type="button"
        class="vue-viewer-toolbar-btn"
        :title="'垂直镜像'"
        @click="$emit('flip-vertical')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v18"></path>
          <path d="M3 12h18"></path>
          <path d="M12 3a9 9 0 0 0-9 9"></path>
          <path d="M12 21a9 9 0 0 0 9-9"></path>
        </svg>
      </button>

      <button
        v-if="options.movable"
        type="button"
        class="vue-viewer-toolbar-btn"
        :title="'重置 (Ctrl+0)'"
        @click="$emit('reset')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
        </svg>
      </button>

      <div v-if="options.navbar && total > 1" class="vue-viewer-toolbar-separator"></div>

      <button
        v-if="options.navbar && total > 1"
        type="button"
        class="vue-viewer-toolbar-btn vue-viewer-nav-btn"
        :disabled="currentIndex === 0"
        :title="'上一张 (←)'"
        @click="$emit('prev')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <span v-if="options.navbar && total > 1" class="vue-viewer-toolbar-indicator">
        <span class="vv-cur">{{ currentIndex + 1 }}</span>
        <span class="vv-sep">/</span>
        <span class="vv-tot">{{ total }}</span>
      </span>

      <button
        v-if="options.navbar && total > 1"
        type="button"
        class="vue-viewer-toolbar-btn vue-viewer-nav-btn"
        :disabled="currentIndex === total - 1"
        :title="'下一张 (→)'"
        @click="$emit('next')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <div v-if="options.fullscreen" class="vue-viewer-toolbar-separator"></div>

      <button
        v-if="options.fullscreen"
        type="button"
        class="vue-viewer-toolbar-btn"
        :title="isFullscreen ? '退出全屏 (L)' : '全屏 (L)'"
        @click="$emit('fullscreen')"
      >
        <svg v-if="!isFullscreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
          <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
          <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
          <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
          <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
          <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
          <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
        </svg>
      </button>

      <div v-if="options.playable" class="vue-viewer-toolbar-separator"></div>

      <button
        v-if="options.playable && total > 1"
        type="button"
        class="vue-viewer-toolbar-btn"
        :title="isPlaying ? '暂停 (Space)' : '播放 (Space)'"
        @click="$emit('play')"
      >
        <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ViewerToolbar',

  props: {
    options: {
      type: Object,
      default: () => ({})
    },
    currentIndex: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    },
    zoomRatio: {
      type: Number,
      default: 1
    },
    isFullscreen: {
      type: Boolean,
      default: false
    },
    isPlaying: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style>
.vue-viewer-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
}

/* 当外层 wrapper 在 left/right 时，toolbar 内部按钮纵向排列 */
.vue-viewer-toolbar-wrapper.pos-left .vue-viewer-toolbar,
.vue-viewer-toolbar-wrapper.pos-right .vue-viewer-toolbar {
  flex-direction: column;
}
.vue-viewer-toolbar-wrapper.pos-left .vue-viewer-toolbar-list,
.vue-viewer-toolbar-wrapper.pos-right .vue-viewer-toolbar-list {
  flex-direction: column;
}

/* 左/右侧工具栏：上一张/下一张图标旋转 90 度（变成 ↑/↓） */
.vue-viewer-toolbar-wrapper.pos-left .vue-viewer-nav-btn svg,
.vue-viewer-toolbar-wrapper.pos-right .vue-viewer-nav-btn svg {
  transform: rotate(90deg);
}

/* 左/右侧工具栏：序号/总数 垂直排列 */
.vue-viewer-toolbar-wrapper.pos-left .vue-viewer-toolbar-indicator,
.vue-viewer-toolbar-wrapper.pos-right .vue-viewer-toolbar-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
  padding: 4px 0;
}
.vue-viewer-toolbar-wrapper.pos-left .vue-viewer-toolbar-indicator .vv-sep,
.vue-viewer-toolbar-wrapper.pos-right .vue-viewer-toolbar-indicator .vv-sep {
  /* 横线分隔，更直观表示"上 / 下" */
  width: 14px;
  height: 1px;
  background: currentColor;
  opacity: 0.6;
  font-size: 0;
  margin: 2px 0;
}

/* 左/右侧工具栏：分隔线由竖线变横线 */
.vue-viewer-toolbar-wrapper.pos-left .vue-viewer-toolbar-separator,
.vue-viewer-toolbar-wrapper.pos-right .vue-viewer-toolbar-separator {
  width: 70%;
  height: 1px;
  margin: 4px 0;
}

.vue-viewer-toolbar-list {
  display: flex;
  align-items: center;
  gap: 4px;
}

.vue-viewer-toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.vue-viewer-toolbar-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.vue-viewer-toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.vue-viewer-toolbar-btn svg {
  width: 20px;
  height: 20px;
}

.vue-viewer-toolbar-separator {
  width: 1px;
  height: 24px;
  margin: 0 8px;
  background: rgba(255, 255, 255, 0.3);
}

.vue-viewer-toolbar-indicator {
  padding: 0 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}
</style>
