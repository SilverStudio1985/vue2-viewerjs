/**
 * 瓦片渲染器
 * 用于分片加载和渲染超大图片
 */
export class TileRenderer {
  constructor() {
    this.tileSize = 256;
    this.maxTileCache = 20;
    this.tileCache = new Map();
    this.loadingTiles = new Map();
    this.canvasPool = [];
    this.maxCanvasPoolSize = 5;
  }

  /**
   * 渲染大图到画布
   * @param {string} src - 图片地址
   * @param {HTMLCanvasElement} canvas - 目标画布
   * @param {Object} options - 渲染选项
   * @returns {Promise<HTMLCanvasElement>}
   */
  async render(src, canvas, options = {}) {
    const {
      width = canvas.width,
      height = canvas.height,
      threshold = 2048,
      tileSize = this.tileSize,
      quality = 0.8,
      onProgress = null
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        canvas.width = width || img.naturalWidth;
        canvas.height = height || img.naturalHeight;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const useTile = img.naturalWidth > threshold || img.naturalHeight > threshold;

        if (useTile) {
          this.renderTiled(img, canvas, {
            tileSize,
            quality,
            onProgress
          }).then(() => {
            resolve(canvas);
          }).catch(reject);
        } else {
          this.renderSimple(img, canvas, {
            quality,
            onProgress
          }).then(() => {
            resolve(canvas);
          }).catch(reject);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    });
  }

  /**
   * 简单渲染（一次性绘制）
   * @param {HTMLImageElement} img - 图片元素
   * @param {HTMLCanvasElement} canvas - 目标画布
   * @param {Object} options - 渲染选项
   * @returns {Promise}
   */
  async renderSimple(img, canvas, options = {}) {
    const { quality = 0.8, onProgress = null } = options;

    return new Promise((resolve) => {
      const ctx = canvas.getContext('2d');

      if (onProgress) {
        onProgress(0.5);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (onProgress) {
        onProgress(1);
      }

      resolve();
    });
  }

  /**
   * 瓦片渲染（分片绘制）
   * @param {HTMLImageElement} img - 图片元素
   * @param {HTMLCanvasElement} canvas - 目标画布
   * @param {Object} options - 渲染选项
   * @returns {Promise}
   */
  async renderTiled(img, canvas, options = {}) {
    const {
      tileSize = 256,
      quality = 0.8,
      onProgress = null
    } = options;

    const ctx = canvas.getContext('2d');
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const cols = Math.ceil(imgWidth / tileSize);
    const rows = Math.ceil(imgHeight / tileSize);
    const totalTiles = cols * rows;

    let loadedTiles = 0;

    const tilePromises = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tileSize;
        const y = row * tileSize;
        const tileWidth = Math.min(tileSize, imgWidth - x);
        const tileHeight = Math.min(tileSize, imgHeight - y);

        const tileKey = `${img.src}_${x}_${y}_${tileWidth}_${tileHeight}`;

        let tilePromise;

        if (this.tileCache.has(tileKey)) {
          tilePromise = Promise.resolve(this.tileCache.get(tileKey));
        } else if (this.loadingTiles.has(tileKey)) {
          tilePromise = this.loadingTiles.get(tileKey);
        } else {
          tilePromise = this.loadTile(img, x, y, tileWidth, tileHeight, tileKey);
        }

        tilePromises.push(tilePromise.then(tileCanvas => {
          const dx = x * (canvas.width / imgWidth);
          const dy = y * (canvas.height / imgHeight);
          const dw = tileWidth * (canvas.width / imgWidth);
          const dh = tileHeight * (canvas.height / imgHeight);

          ctx.drawImage(tileCanvas, dx, dy, dw, dh);

          loadedTiles++;
          if (onProgress) {
            onProgress(loadedTiles / totalTiles);
          }
        }));
      }
    }

    await Promise.all(tilePromises);

    this.cleanupTileCache();
  }

  /**
   * 加载单个瓦片
   * @param {HTMLImageElement} img - 图片元素
   * @param {number} x - 起始X坐标
   * @param {number} y - 起始Y坐标
   * @param {number} width - 瓦片宽度
   * @param {number} height - 瓦片高度
   * @param {string} key - 瓦片键名
   * @returns {Promise<HTMLCanvasElement>}
   */
  async loadTile(img, x, y, width, height, key) {
    const tilePromise = new Promise((resolve, reject) => {
      const tileCanvas = this.acquireCanvas(width, height);
      const ctx = tileCanvas.getContext('2d');

      try {
        ctx.drawImage(
          img,
          x, y, width, height,
          0, 0, width, height
        );

        this.tileCache.set(key, tileCanvas);
        resolve(tileCanvas);
      } catch (err) {
        this.releaseCanvas(tileCanvas);
        reject(err);
      }
    });

    this.loadingTiles.set(key, tilePromise);

    try {
      const result = await tilePromise;
      this.loadingTiles.delete(key);
      return result;
    } catch (err) {
      this.loadingTiles.delete(key);
      throw err;
    }
  }

  /**
   * 获取画布池中的画布
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @returns {HTMLCanvasElement}
   */
  acquireCanvas(width, height) {
    const poolKey = `${width}x${height}`;

    if (this.canvasPool.length > 0) {
      const canvas = this.canvasPool.pop();
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }

    return document.createElement('canvas');
  }

  /**
   * 释放画布到池中
   * @param {HTMLCanvasElement} canvas - 画布
   */
  releaseCanvas(canvas) {
    if (this.canvasPool.length < this.maxCanvasPoolSize) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.canvasPool.push(canvas);
    }
  }

  /**
   * 清理瓦片缓存
   */
  cleanupTileCache() {
    if (this.tileCache.size > this.maxTileCache) {
      const keys = Array.from(this.tileCache.keys());
      const removeCount = this.tileCache.size - this.maxTileCache;

      for (let i = 0; i < removeCount; i++) {
        const key = keys[i];
        const canvas = this.tileCache.get(key);
        this.releaseCanvas(canvas);
        this.tileCache.delete(key);
      }
    }
  }

  /**
   * 清除所有瓦片缓存
   */
  clearCache() {
    this.tileCache.forEach(canvas => {
      this.releaseCanvas(canvas);
    });
    this.tileCache.clear();
    this.loadingTiles.clear();

    this.canvasPool.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    this.canvasPool = [];
  }

  /**
   * 设置瓦片大小
   * @param {number} size - 瓦片大小
   */
  setTileSize(size) {
    this.tileSize = size;
  }

  /**
   * 设置最大缓存瓦片数
   * @param {number} max - 最大数量
   */
  setMaxTileCache(max) {
    this.maxTileCache = max;
    this.cleanupTileCache();
  }

  /**
   * 获取缓存统计
   * @returns {Object}
   */
  getStats() {
    return {
      tileCacheSize: this.tileCache.size,
      loadingTiles: this.loadingTiles.size,
      canvasPoolSize: this.canvasPool.length,
      tileSize: this.tileSize,
      maxTileCache: this.maxTileCache
    };
  }
}

// 创建默认实例
TileRenderer.defaultInstance = new TileRenderer();

export default TileRenderer;
