/**
 * 图片加载器
 * 支持懒加载、预加载、重试机制
 */
export class ImageLoader {
  constructor() {
    this.cache = new Map();
    this.loadingTasks = new Map();
    this.maxCacheSize = 50;
    this.defaultRetry = 3;
    this.defaultRetryInterval = 1000;
  }

  /**
   * 加载图片
   * @param {string} src - 图片地址
   * @param {Object} options - 加载选项
   * @returns {Promise<HTMLImageElement>}
   */
  load(src, options = {}) {
    const {
      retry = this.defaultRetry,
      retryInterval = this.defaultRetryInterval,
      crossOrigin = 'anonymous'
    } = options;

    if (!src) {
      return Promise.reject(new Error('Invalid image source'));
    }

    // 检查缓存
    if (this.cache.has(src)) {
      const cached = this.cache.get(src);
      if (cached.complete && cached.naturalHeight !== 0) {
        return Promise.resolve(cached);
      }
    }

    // 检查是否正在加载
    if (this.loadingTasks.has(src)) {
      return this.loadingTasks.get(src);
    }

    // 创建加载任务
    const loadTask = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = crossOrigin;

      let retryCount = 0;

      const tryLoad = () => {
        img.src = src;
      };

      img.onload = () => {
        this.cache.set(src, img);
        this.loadingTasks.delete(src);
        this.cleanupCache();
        resolve(img);
      };

      img.onerror = () => {
        if (retryCount < retry) {
          retryCount++;
          setTimeout(tryLoad, retryInterval);
        } else {
          this.loadingTasks.delete(src);
          reject(new Error(`Failed to load image: ${src}`));
        }
      };

      tryLoad();
    });

    this.loadingTasks.set(src, loadTask);
    return loadTask;
  }

  /**
   * 预加载图片
   * @param {string|string[]} src - 图片地址
   * @param {Object} options - 加载选项
   */
  preload(src, options = {}) {
    const sources = Array.isArray(src) ? src : [src];
    return Promise.all(
      sources.map(s => this.load(s, options).catch(() => null))
    );
  }

  /**
   * 批量加载图片
   * @param {Array} images - 图片列表
   * @param {Object} options - 加载选项
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<HTMLImageElement[]>}
   */
  loadBatch(images, options = {}, onProgress = null) {
    const promises = images.map((img, index) => {
      const src = img.src || img.url || img;
      return this.load(src, options).then(result => {
        if (onProgress) {
          onProgress({
            index,
            total: images.length,
            loaded: result,
            image: img
          });
        }
        return result;
      }).catch(err => {
        if (onProgress) {
          onProgress({
            index,
            total: images.length,
            error: err,
            image: img
          });
        }
        return null;
      });
    });

    return Promise.all(promises);
  }

  /**
   * 获取缓存的图片
   * @param {string} src - 图片地址
   * @returns {HTMLImageElement|null}
   */
  getCached(src) {
    return this.cache.get(src) || null;
  }

  /**
   * 检查图片是否已缓存
   * @param {string} src - 图片地址
   * @returns {boolean}
   */
  isCached(src) {
    const cached = this.cache.get(src);
    return cached && cached.complete && cached.naturalHeight !== 0;
  }

  /**
   * 清理缓存
   */
  cleanupCache() {
    if (this.cache.size > this.maxCacheSize) {
      const keys = Array.from(this.cache.keys());
      const removeCount = this.cache.size - this.maxCacheSize;
      for (let i = 0; i < removeCount; i++) {
        const key = keys[i];
        this.revokeObjectURL(key);
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清除指定图片的缓存
   * @param {string} src - 图片地址
   */
  removeFromCache(src) {
    this.revokeObjectURL(src);
    this.cache.delete(src);
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.cache.forEach((img, src) => {
      this.revokeObjectURL(src);
    });
    this.cache.clear();
    this.loadingTasks.forEach((task, src) => {
      this.revokeObjectURL(src);
    });
    this.loadingTasks.clear();
  }

  /**
   * 释放 ObjectURL
   * @param {string} src - 图片地址
   */
  revokeObjectURL(src) {
    if (src && src.startsWith('blob:')) {
      URL.revokeObjectURL(src);
    }
  }

  /**
   * 获取缓存大小
   * @returns {number}
   */
  getCacheSize() {
    return this.cache.size;
  }

  /**
   * 设置最大缓存大小
   * @param {number} size - 缓存大小
   */
  setMaxCacheSize(size) {
    this.maxCacheSize = size;
    this.cleanupCache();
  }

  /**
   * 取消加载
   * @param {string} src - 图片地址
   */
  cancelLoad(src) {
    if (this.loadingTasks.has(src)) {
      this.loadingTasks.delete(src);
    }
  }

  /**
   * 取消所有加载
   */
  cancelAllLoads() {
    this.loadingTasks.forEach((task, src) => {
      this.cancelLoad(src);
    });
  }
}

// 创建一个默认实例
ImageLoader.defaultInstance = new ImageLoader();

export default ImageLoader;
