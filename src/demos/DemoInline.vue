<template>
  <div class="demo-inline">
    <h2 class="demo-title">页面内联嵌入预览</h2>
    <p class="demo-desc">将预览组件直接嵌入页面，适用于商品详情页、文章图片展示等场景。</p>

    <div class="demo-layout">
      <div class="product-card">
        <div class="product-image-container">
          <img
            :src="productImages[productActiveIndex].src"
            :alt="productImages[productActiveIndex].alt"
            class="product-image"
            @click="openProductViewer(productActiveIndex)"
          />
        </div>
        <div class="product-info">
          <h3 class="product-title">示例商品</h3>
          <p class="product-desc">商品描述内容，点击主图或下方缩略图可打开预览</p>
          <div class="product-images-grid">
            <img
              v-for="(img, index) in productImages"
              :key="index"
              :src="img.thumbnail"
              :alt="img.alt"
              class="product-thumbnail"
              :class="{ active: index === productActiveIndex }"
              @click="productActiveIndex = index"
              @dblclick="openProductViewer(index)"
            />
          </div>
        </div>
      </div>

      <div class="article-section">
        <h3 class="section-title">文章内嵌图片</h3>
        <p class="section-text">
          这是一段示例文本，用于展示如何在文章内容中嵌入可预览的图片。
          下面的图片点击后可在当前页面位置打开预览。
        </p>
        <div class="article-image-wrapper">
          <img
            v-for="(img, index) in articleImages"
            :key="index"
            :src="img.thumbnail"
            :alt="img.alt"
            class="article-image"
            @click="openArticleViewer(index)"
          />
        </div>
      </div>
    </div>

    <div class="demo-code">
      <h3 class="code-title">使用示例</h3>
      <pre class="code-block"><code>// 方式1: 组件方式（弹出模态框）
&lt;viewer
  v-if="showViewer"
  :images="images"
  :options="options"
  @close="showViewer = false"
/&gt;

// 方式2: API 调用
import VueViewerjs from 'vue2-viewerjs';
VueViewerjs.show(images, options);

// 方式3: 内联模式（嵌入页面位置）
&lt;viewer :images="images" :options="{ inline: true }" /&gt;</code></pre>
    </div>

    <viewer
      v-if="showProductViewer"
      :images="productImages"
      :options="{ ...inlineOptions, initialViewIndex: productActiveIndex }"
      @close="showProductViewer = false"
    />

    <viewer
      v-if="showArticleViewer"
      :images="articleImages"
      :options="{ ...inlineOptions, initialViewIndex: articleActiveIndex }"
      @close="showArticleViewer = false"
    />
  </div>
</template>

<script>
import Viewer from '../components/viewer.vue';

export default {
  name: 'DemoInline',

  components: {
    Viewer
  },

  data() {
    return {
      showProductViewer: false,
      showArticleViewer: false,
      productActiveIndex: 0,
      articleActiveIndex: 0,
      productImages: [
        {
          src: 'https://picsum.photos/id/1001/800/600',
          thumbnail: 'https://picsum.photos/id/1001/200/150',
          alt: '商品图片1'
        },
        {
          src: 'https://picsum.photos/id/1002/800/600',
          thumbnail: 'https://picsum.photos/id/1002/200/150',
          alt: '商品图片2'
        },
        {
          src: 'https://picsum.photos/id/1003/800/600',
          thumbnail: 'https://picsum.photos/id/1003/200/150',
          alt: '商品图片3'
        }
      ],
      articleImages: [
        {
          src: 'https://picsum.photos/id/1011/600/800',
          thumbnail: 'https://picsum.photos/id/1011/300/200',
          alt: '文章配图1'
        },
        {
          src: 'https://picsum.photos/id/1012/600/800',
          thumbnail: 'https://picsum.photos/id/1012/300/200',
          alt: '文章配图2'
        }
      ],
      inlineOptions: {
        inline: false,
        navbar: true,
        toolbar: true,
        title: true,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
        keyboard: true,
        fullscreen: false,
        zoomRatio: 0.2,
        bufferSize: 1,
        thumbnailLimit: 5,
        autoGC: true,
        lazyLoad: true,
        modal: true,
        backdrop: true
      }
    };
  },

  methods: {
    openProductViewer(index) {
      this.productActiveIndex = index;
      this.showProductViewer = true;
    },
    openArticleViewer(index) {
      this.articleActiveIndex = index;
      this.showArticleViewer = true;
    }
  }
};
</script>

<style scoped>
.demo-inline {
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
  margin-bottom: 32px;
}

.demo-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 32px;
}

@media (max-width: 900px) {
  .demo-layout {
    grid-template-columns: 1fr;
  }
}

.product-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
}

.product-image-container {
  width: 100%;
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
}

.inline-viewer {
  max-width: 100%;
  max-height: 100%;
}

.product-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  cursor: pointer;
  transition: opacity 0.3s;
}

.product-image:hover {
  opacity: 0.8;
}

.product-info {
  padding: 20px;
}

.product-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.product-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
}

.product-images-grid {
  display: flex;
  gap: 8px;
}

.product-thumbnail {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.product-thumbnail:hover {
  opacity: 1;
}

.product-thumbnail.active {
  opacity: 1;
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.article-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

.section-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 16px;
}

.article-image-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.article-image {
  max-width: 200px;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.article-image:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.demo-code {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
}

.code-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.code-block {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
}

.code-block code {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  color: #e6db74;
  line-height: 1.6;
}
</style>
