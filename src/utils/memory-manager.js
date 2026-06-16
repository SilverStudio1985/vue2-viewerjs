/**
 * 内存管理器
 * 自动回收闲置图片资源，防止内存溢出
 */
export class MemoryManager {
  constructor() {
    this.imageInstances = new Map();
    this.blobURLs = new Map();
    this.lastAccessTime = new Map();
    this.maxMemoryMB = 200;
    this.autoGCInterval = 5000;
    this.gcTimer = null;
    this.enabled = true;
    this.threshold = 0.8;
  }

  /**
   * 注册图片实例
   * @param {string} key - 图片标识
   * @param {HTMLImageElement|HTMLCanvasElement} instance - 图片实例
   */
  register(key, instance) {
    this.imageInstances.set(key, instance);
    this.lastAccessTime.set(key, Date.now());
  }

  /**
   * 获取图片实例
   * @param {string} key - 图片标识
   * @returns {HTMLImageElement|HTMLCanvasElement|null}
   */
  get(key) {
    if (this.imageInstances.has(key)) {
      this.lastAccessTime.set(key, Date.now());
      return this.imageInstances.get(key);
    }
    return null;
  }

  /**
   * 更新访问时间
   * @param {string} key - 图片标识
   */
  touch(key) {
    if (this.lastAccessTime.has(key)) {
      this.lastAccessTime.set(key, Date.now());
    }
  }

  /**
   * 释放单个图片资源
   * @param {string|Object} imageOrKey - 图片实例或标识
   */
  release(imageOrKey) {
    const key = typeof imageOrKey === 'string' ? imageOrKey : this.findKeyByValue(imageOrKey);

    if (!key) return;

    const instance = this.imageInstances.get(key);
    if (instance) {
      if (instance.src && instance.src.startsWith('blob:')) {
        URL.revokeObjectURL(instance.src);
      }
      if (instance instanceof HTMLImageElement) {
        instance.src = '';
        instance.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
      this.imageInstances.delete(key);
    }

    const blobURL = this.blobURLs.get(key);
    if (blobURL) {
      URL.revokeObjectURL(blobURL);
      this.blobURLs.delete(key);
    }

    this.lastAccessTime.delete(key);
  }

  /**
   * 释放图片实例
   * @param {HTMLImageElement|HTMLCanvasElement} instance - 图片实例
   */
  releaseImage(instance) {
    const key = this.findKeyByValue(instance);
    if (key) {
      this.release(key);
    }
  }

  /**
   * 根据值查找键
   * @param {*} value - 值
   * @returns {string|null}
   */
  findKeyByValue(value) {
    for (const [key, val] of this.imageInstances.entries()) {
      if (val === value) {
        return key;
      }
    }
    return null;
  }

  /**
   * 注册 Blob URL
   * @param {string} key - 图片标识
   * @param {string} blobURL - Blob URL
   */
  registerBlobURL(key, blobURL) {
    this.blobURLs.set(key, blobURL);
  }

  /**
   * 清除所有资源
   */
  clearAll() {
    this.imageInstances.forEach((instance, key) => {
      if (instance instanceof HTMLImageElement) {
        instance.src = '';
      }
      if (instance instanceof HTMLCanvasElement) {
        const ctx = instance.getContext('2d');
        ctx?.clearRect(0, 0, instance.width, instance.height);
      }
    });

    this.blobURLs.forEach(blobURL => {
      URL.revokeObjectURL(blobURL);
    });

    this.imageInstances.clear();
    this.blobURLs.clear();
    this.lastAccessTime.clear();

    this.stopAutoGC();
  }

  /**
   * 清理非活跃区域的图片
   * @param {number} activeIndex - 当前活跃索引
   * @param {Array} images - 图片列表
   * @param {number} bufferSize - 缓冲大小
   */
  cleanupInactive(activeIndex, images, bufferSize = 2) {
    const start = Math.max(0, activeIndex - bufferSize);
    const end = Math.min(images.length - 1, activeIndex + bufferSize);

    for (let i = 0; i < images.length; i++) {
      if (i < start || i > end) {
        const key = this.getImageKey(images[i], i);
        if (this.imageInstances.has(key)) {
          this.release(key);
        }
      }
    }
  }

  /**
   * 获取图片键名
   * @param {Object} image - 图片对象
   * @param {number} index - 索引
   * @returns {string}
   */
  getImageKey(image, index) {
    return image.src || image.url || image || String(index);
  }

  /**
   * 检查内存使用
   * @returns {Object}
   */
  checkMemory() {
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1048576;
      const totalMB = performance.memory.totalJSHeapSize / 1048576;
      const limitMB = performance.memory.jsHeapSizeLimit / 1048576;

      return {
        used: usedMB,
        total: totalMB,
        limit: limitMB,
        usage: usedMB / limitMB,
        isHigh: usedMB / limitMB > this.threshold
      };
    }

    return {
      used: 0,
      total: 0,
      limit: this.maxMemoryMB,
      usage: 0,
      isHigh: false
    };
  }

  /**
   * 执行垃圾回收
   */
  garbageCollect() {
    const memoryInfo = this.checkMemory();

    if (!memoryInfo.isHigh) {
      return {
        executed: false,
        reason: 'memory_normal',
        memory: memoryInfo
      };
    }

    const now = Date.now();
    const inactiveThreshold = 30000;
    const keysToRelease = [];

    this.lastAccessTime.forEach((time, key) => {
      if (now - time > inactiveThreshold) {
        keysToRelease.push(key);
      }
    });

    keysToRelease.forEach(key => this.release(key));

    if (this.blobURLs.size > 10) {
      const blobKeys = Array.from(this.blobURLs.keys());
      const toRemove = blobKeys.slice(0, Math.floor(blobKeys.length / 2));
      toRemove.forEach(key => {
        URL.revokeObjectURL(this.blobURLs.get(key));
        this.blobURLs.delete(key);
      });
    }

    return {
      executed: true,
      reason: 'memory_high',
      releasedCount: keysToRelease.length,
      memory: memoryInfo
    };
  }

  /**
   * 启动自动垃圾回收
   * @param {number} interval - 间隔时间(ms)
   */
  startAutoGC(interval = this.autoGCInterval) {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }

    this.gcTimer = setInterval(() => {
      if (this.enabled) {
        this.garbageCollect();
      }
    }, interval);
  }

  /**
   * 停止自动垃圾回收
   */
  stopAutoGC() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
  }

  /**
   * 设置是否启用
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * 设置内存阈值
   * @param {number} threshold - 阈值 (0-1)
   */
  setThreshold(threshold) {
    this.threshold = Math.max(0.1, Math.min(1, threshold));
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  getStats() {
    return {
      imageCount: this.imageInstances.size,
      blobURLCount: this.blobURLs.size,
      lastAccessCount: this.lastAccessTime.size,
      memory: this.checkMemory(),
      autoGCEnabled: !!this.gcTimer,
      autoGCInterval: this.autoGCInterval,
      threshold: this.threshold
    };
  }
}

// 创建默认实例
MemoryManager.defaultInstance = new MemoryManager();

export default MemoryManager;
