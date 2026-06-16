# Vue2-ViewerJS

> 高性能 Vue2 图片预览组件，在 ViewerJS 基础上做了大量功能增强与性能优化。

## 目录

- [组件说明](#组件说明)
- [特性一览](#特性一览)
- [安装](#安装)
- [快速开始](#快速开始)
- [使用说明](#使用说明)
  - [基础用法](#基础用法)
  - [API 调用](#api-调用)
  - [内联模式](#内联模式)
  - [画廊全屏播放](#画廊全屏播放)
  - [插槽](#插槽)
  - [自定义切换动画](#自定义切换动画)
  - [性能调优](#性能调优)
- [Props](#props)
- [配置选项（options）](#配置选项options)
- [事件](#事件)
- [方法](#方法)
- [键盘快捷键](#键盘快捷键)
- [代码示例](#代码示例)
  - [基础单图预览](#基础单图预览)
  - [200 张大图画廊](#200-张大图画廊)
  - [页面内联嵌入](#页面内联嵌入)
  - [自定义工具栏](#自定义工具栏)
  - [自定义切换动画合集](#自定义切换动画合集)
  - [Electron 本地大图适配建议](#electron-本地大图适配建议)
- [常见问题](#常见问题)
- [License](#license)

---

## 组件说明

`vue2-viewerjs` 是基于 ViewerJS 思想、为 Vue 2.x 重新设计实现的图片预览组件，专注于：

1. **海量图片流畅浏览** — 200+ 张大图无压力，支持 10MB 甚至更大的图。
2. **完整体验对齐** — 缩放、拖拽、旋转、镜像、全屏、播放、键盘、触摸等全部支持。
3. **高度可定制** — 4 个插槽（toolbar/navbar/title/canvas-overlay）支持完全替换内置 UI；15 种切换动画 + 随机/合集策略。
4. **位置自由布局** — 工具栏和缩略图栏可分别放置在 `top/bottom/left/right`。
5. **轻量** — 零外部依赖，gzip 后约 18KB。

**适用场景**：商品画廊、相册浏览、Electron 本地照片查看、设计稿审阅、远程图片预览等。

## 特性一览

| 类别 | 能力 |
|---|---|
| **性能** | 懒加载 / 预缓冲 / 虚拟列表 / 大图瓦片 / 自动内存回收 / 三级加载 |
| **基础交互** | 拖拽 / 滚轮缩放 / 双击切换 / 旋转 / 水平垂直镜像 / 重置 |
| **导航** | 上一张下一张 / 跳转 / 键盘 ←→↑↓ / 触摸滑动 |
| **播放** | 自动轮播 / 播放间隔可配 / 进度条 + 暂停按钮 / ESC 退出播放 |
| **UI** | 工具栏 / 缩略图栏 / 标题栏 / 缩放比例 toast / 4 插槽 |
| **布局** | 工具栏和缩略图栏分别可配 `top/bottom/left/right` |
| **动画** | 15 种切换效果（淡入/横滑/缩放/翻转/旋转/模糊/推入/百叶横纵）+ 关闭 + 随机 + 合集 |
| **可访问性** | 完整键盘快捷键、ESC 关闭、Space 播放/暂停 |
| **集成** | Vue 组件 / 全局 API / 命令式调用 / 事件钩子 |

## 安装

```bash
npm install @iislove/vue2-viewerjs
```

或直接引用构建产物：

```html
<link rel="stylesheet" href="vue2-viewerjs.css" />
<script src="vue2-viewerjs.umd.js"></script>
```

## 快速开始

### 方式一：全局注册

```javascript
import Vue from 'vue';
import VueViewerjs from '@iislove/vue2-viewerjs';
import '@iislove/vue2-viewerjs/dist/vue2-viewerjs.css';

Vue.use(VueViewerjs);
```

### 方式二：按需引入

```javascript
import Vue from 'vue';
import { Viewer, show } from '@iislove/vue2-viewerjs';

Vue.component('Viewer', Viewer);
```

## 使用说明

### 基础用法

```vue
<template>
  <viewer :images="images" :visible.sync="show">
    <img
      v-for="(img, i) in images"
      :key="i"
      :src="img.src"
      @click="show = true; $refs.viewer.goTo(i)"
    />
  </viewer>
</template>
```

`images` 支持字符串数组或对象数组：

```javascript
images: [
  'https://example.com/1.jpg',
  { src: 'https://example.com/2.jpg', title: '标题', alt: '描述' }
]
```

### API 调用

```javascript
import VueViewerjs from 'vue2-viewerjs';

VueViewerjs.show(images, { initialViewIndex: 0 });
```

### 内联模式

```vue
<viewer :images="images" :options="{ inline: true }">
  <div class="custom">
    <img v-for="(src, i) in images" :key="i" :src="src" />
  </div>
</viewer>
```

### 画廊全屏播放

工具栏点击 ▶ 即可进入全屏播放模式（隐藏工具栏和缩略图栏，底部显示进度条 + 暂停按钮），ESC 退出播放。

### 插槽

| 插槽名 | 暴露变量 | 用途 |
|---|---|---|
| `toolbar` | `currentImage, currentIndex, total, zoomRatio, isZoomed, actions` | 自定义工具栏 |
| `navbar` | `images, currentIndex, goTo` | 自定义缩略图栏 |
| `title` | `currentImage, currentIndex, total` | 自定义标题 |
| `canvas-overlay` | `currentImage, currentIndex` | canvas 内浮层（水印、标记） |

### 自定义切换动画

```javascript
options: {
  // 关闭
  transition: false,        // 或 'none'
  // 单效果
  transition: 'fade',       // fade | slide | slide-reverse | slide-vertical | slide-vertical-reverse
                            // | zoom | zoom-out | flip | flip-vertical | rotate | rotate-reverse
                            // | blur | push | blinds | blinds-vertical
  // 随机
  transition: 'random',
  // 自定义合集（按顺序循环）
  transition: ['fade', 'zoom', 'blinds'],
  transitionRandom: true,    // 从合集随机抽取
  transitionDuration: 400    // 毫秒
}
```

### 性能调优

| 场景 | 推荐配置 |
|---|---|
| 100 张以下 1-3MB 图 | 默认即可 |
| 200+ 张 5-10MB 图 | `bufferSize: 1`, `largeImageThreshold: 4096` |
| 1000+ 张超多图 | `thumbnailLimit: 20`, `bufferSize: 1` |
| Electron 本地大图 | 关闭 `autoGC=false` 由主进程管理 + 自定义 file 协议 |

## Props

| Prop | 类型 | 默认 | 说明 |
|---|---|---|---|
| `images` | Array | `[]` | 图片列表 |
| `options` | Object | `{}` | 详细配置（见下表） |
| `visible` | Boolean | `false` | 受控显示状态 |
| `toolbarPosition` | String | `'bottom'` | `top` / `bottom` / `left` / `right` |
| `navbarPosition` | String | `'bottom'` | `top` / `bottom` / `left` / `right` |
| `navbarHover` | Boolean | `false` | 缩略图栏是否悬停才显示 |

## 配置选项（options）

| Key | 类型 | 默认 | 说明 |
|---|---|---|---|
| `initialViewIndex` | Number | `0` | 初始显示索引 |
| `inline` | Boolean | `false` | 内联模式 |
| `button` | Boolean | `true` | 显示右上角关闭按钮 |
| `navbar` | Boolean | `true` | 显示缩略图栏 |
| `toolbar` | Boolean | `true` | 显示工具栏 |
| `title` | Boolean/Function | `true` | 是否显示标题 |
| `movable` | Boolean | `true` | 可拖拽 |
| `zoomable` | Boolean | `true` | 可缩放 |
| `rotatable` | Boolean | `true` | 可旋转 |
| `scalable` | Boolean | `true` | 可镜像翻转 |
| `transition` | Boolean/String/Array | `true` | 切换动画（见上） |
| `transitionDuration` | Number | `350` | 切换动画时长(ms) |
| `transitionRandom` | Boolean | `false` | 数组合集时是否随机 |
| `fullscreen` | Boolean | `true` | 启用全屏按钮 |
| `keyboard` | Boolean | `true` | 启用键盘快捷键 |
| `playable` | Boolean | `true` | 启用播放按钮 |
| `tooltip` | Boolean | `true` | 缩放时显示居中百分比 toast（按 `tooltipEnabled` 兜底，关闭需传 `false`） |
| `interval` | Number | `5000` | 播放间隔(ms) |
| `zIndex` | Number | `2015` | 模态框 z-index |
| `bufferSize` | Number | `2` | 预缓冲前后图片数 |
| `thumbnailLimit` | Number | `10` | 缩略图虚拟列表单次渲染上限 |
| `largeImageThreshold` | Number | `2048` | 大图判定阈值(像素宽度) |
| `autoGC` | Boolean | `true` | 自动内存回收 |
| `lazyLoad` | Boolean | `true` | 懒加载总开关 |
| `retry` | Number | `3` | 加载失败重试次数 |
| `retryInterval` | Number | `1000` | 重试间隔(ms) |
| `zoomRatio` | Number | `0.1` | 缩放步长 |
| `minZoomRatio` | Number | `0.1` | 最小缩放 |
| `maxZoomRatio` | Number | `400` | 最大缩放 |

## 事件

| 事件 | 参数 | 说明 |
|---|---|---|
| `open` | - | 预览打开 |
| `close` | - | 预览关闭 |
| `shown` | - | 显示动画完成 |
| `hidden` | - | 隐藏动画完成 |
| `view` | `{ index, image }` | 切换到某张 |
| `viewed` | `{ index, image }` | 图片加载完成 |
| `error` | `{ index, image }` | 加载失败 |
| `destroy` | - | 组件销毁 |
| `progress` | `{ index, progress }` | 大图加载进度 |

## 方法

通过组件 ref 调用：

```javascript
this.$refs.viewer.next();        // 下一张
this.$refs.viewer.prev();        // 上一张
this.$refs.viewer.goTo(5);       // 跳转到索引5
this.$refs.viewer.zoomIn(0.1);   // 放大
this.$refs.viewer.zoomOut(0.1);  // 缩小
this.$refs.viewer.zoomTo(2);     // 缩放到 2 倍
this.$refs.viewer.resetZoom();   // 重置缩放
this.$refs.viewer.rotateLeft();  // 左旋
this.$refs.viewer.rotateRight(); // 右旋
this.$refs.viewer.flipHorizontal(); // 水平镜像
this.$refs.viewer.flipVertical();   // 垂直镜像
this.$refs.viewer.toggleFullscreen(); // 全屏切换
this.$refs.viewer.play();        // 开始播放
this.$refs.viewer.stopPlay();    // 停止播放
this.$refs.viewer.togglePlay();  // 切换播放/暂停
this.$refs.viewer.close();       // 关闭预览
```

`actions` 插槽变量同样暴露以上方法。

## 键盘快捷键

| 按键 | 功能 |
|---|---|
| `←` / `→` | 上一张 / 下一张 |
| `↑` / `↓` | 放大 / 缩小 |
| `+` / `-` | 放大 / 缩小 |
| `Space` | 播放 / 暂停 |
| `R` / `E` | 左旋 / 右旋 90° |
| `F` | 水平镜像 |
| `L` | 全屏切换 |
| `Q` / `ESC` | 播放中仅停止播放；非播放关闭预览 |
| `Ctrl + 0` | 重置 |
| `Ctrl + 1` | 实际大小 |

## 代码示例

### 基础单图预览

```vue
<template>
  <div>
    <button @click="open">查看大图</button>
    <viewer ref="v" :images="images" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      images: [
        { src: '/imgs/1.jpg', title: '图1' },
        { src: '/imgs/2.jpg', title: '图2' }
      ]
    };
  },
  methods: {
    open() {
      this.$refs.v.goTo(0);
      this.$refs.v.togglePlay?.();
    }
  }
};
</script>
```

### 200 张大图画廊

```vue
<template>
  <viewer
    v-if="show"
    ref="viewer"
    :images="images"
    :options="{
      toolbar: true,
      navbar: true,
      bufferSize: 1,
      largeImageThreshold: 4096,
      transition: 'random',
      interval: 3000
    }"
    toolbar-position="bottom"
    navbar-position="bottom"
  />
</template>
```

### 页面内联嵌入

```vue
<template>
  <viewer :options="{ inline: true }">
    <div class="product">
      <img :src="main" @click="onClick" />
      <div class="thumbs">
        <img
          v-for="(img, i) in thumbs"
          :key="i"
          :src="img"
          @click="$refs.viewer.goTo(i)"
        />
      </div>
    </div>
  </viewer>
</template>
```

### 自定义工具栏

```vue
<template>
  <viewer :images="images">
    <template #toolbar="{ currentIndex, total, actions, isZoomed }">
      <div class="my-toolbar">
        <button @click="actions.prev">‹</button>
        <span>{{ currentIndex + 1 }} / {{ total }}</span>
        <button @click="actions.next">›</button>
        <button @click="actions.zoomOut">−</button>
        <button @click="actions.reset">⟳</button>
        <button @click="actions.zoomIn">＋</button>
      </div>
    </template>
  </viewer>
</template>
```

### 自定义切换动画合集

```javascript
options: {
  transition: ['fade', 'slide', 'zoom', 'blinds'],
  transitionRandom: true,        // 合集内随机
  transitionDuration: 500
}
```

### Electron 本地大图适配建议

```javascript
// 主进程注册 file 协议（让 webPreferences.webSecurity 可控）
// 渲染进程
options: {
  largeImageThreshold: 4096,
  bufferSize: 1,
  autoGC: true,
  // 关闭懒加载使用 file:// 由主进程管理
  lazyLoad: false
}
```

## 常见问题

**Q: 200 张大图加载卡顿？**
A: 设置 `bufferSize: 1`、`largeImageThreshold: 4096`，并尽量避免在大列表外层用 `picsum` 等限流严重的源。

**Q: 切换动画卡顿？**
A: 设置 `transition: false` 或 `transition: 'fade'` 减少 GPU 压力。

**Q: 缩略图栏无法点击？**
A: 工具栏和缩略图栏同侧时会自动错开显示（边距 + 56px），仍被遮挡请检查 z-index 冲突。

**Q: 工具栏同侧时如何布局？**
A: 默认会自动错开，工具栏在边角、缩略图栏在内侧，互不遮挡。

## License

MIT
