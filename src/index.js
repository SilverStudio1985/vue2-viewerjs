import Viewer from './components/viewer.vue';
import ThumbnailVirtualList from './components/thumbnail-virtual-list.vue';
import Toolbar from './components/toolbar.vue';
import { ImageLoader } from './utils/image-loader';
import { MemoryManager } from './utils/memory-manager';
import { TileRenderer } from './utils/tile-renderer';

const VueViewerjs = {
  install(Vue, options = {}) {
    VueViewerjs.defaultOptions = {
      ...VueViewerjs.defaultOptions,
      ...options
    };

    Vue.component('VueViewerjs', Viewer);
    Vue.component('ThumbnailVirtualList', ThumbnailVirtualList);
    Vue.component('ViewerToolbar', Toolbar);
  }
};

VueViewerjs.defaultOptions = {
  initialViewIndex: 0,
  inline: false,
  button: true,
  navbar: true,
  title: true,
  toolbar: true,
  tooltip: true,
  movable: true,
  zoomable: true,
  rotatable: true,
  scalable: true,
  transition: true,
  fullscreen: true,
  keyboard: true,
  arrowOnEnd: true,
  interval: 5000,
  minWidth: 200,
  minHeight: 200,
  maxWidth: 10000,
  maxHeight: 10000,
  zIndex: 2015,
  zIndexInline: 0,
  container: 'body',
  filter: null,
  shown: null,
  hidden: null,
  view: null,
  viewed: null,
  open: null,
  close: null,
  destroy: null,
  modal: true,
  backdrop: true,
  backdropBackground: 'rgba(0, 0, 0, 0.8)',
  loading: true,
  loadingBackground: 'rgba(0, 0, 0, 0.8)',
  loadingFontSize: 16,
  placeholder: null,
  errorSrc: null,
  errorIcon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNlMGUwZTAiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTEyIDIyLjM1bC0xLjQxLTEuNDFMNS42MSA5LjM4IDExLjQgMy42bDUuMzggNS4zOC0zLjU1IDMuNTVMMTIgMTEuNjFsNS40MSA1LjQxeiIvPjxwYXRoIGQ9Ik0xNyA4LjY3bC0xLjQxLTEuNDFMMTAuMSA2LjM4IDguNyA1bC0zLjU1IDMuNTVMMTIgMTEuNjFsMy4zOC0zLjM4em0wLjkNCAyLjY2bC0xLjQxLTEuNDFMMTIuMSA5LjM4IDguNyA1bC0zLjU1IDMuNTVMMTIgMTEuNjFsNy4zOC03LjM4em0wLjk0IDIuNjZMMCAyMi4zNWwxLjQxLTEuNDEgNS40MS01LjQxIDMuNTUtMy41NUE5LjA4IDkLjA4IDAgMCAxIDExIDQuNWwzLjU1IDMuNTUgNS40MSA1LjQxeiIvPjwvc3ZnPg==',
  retry: 3,
  retryInterval: 1000,
  bufferSize: 2,
  thumbnailLimit: 10,
  largeImageThreshold: 2048,
  autoGC: true,
  lazyLoad: true,
  zoomRatio: 0.1,
  minZoomRatio: 0.1,
  maxZoomRatio: 400,
  stretchWidth: 0,
  stretchHeight: 0
};

VueViewerjs.install.defaultOptions = VueViewerjs.defaultOptions;

VueViewerjs.create = (images, options) => {
  if (!Array.isArray(images) && typeof images === 'object') {
    options = images;
    images = [];
  }
  images = images || [];

  const defaultOptions = { ...VueViewerjs.defaultOptions, ...options };
  const container = typeof defaultOptions.container === 'string'
    ? document.querySelector(defaultOptions.container)
    : defaultOptions.container || document.body;

  const instance = new Vue({
    render: h => h(Viewer, {
      props: {
        images,
        options: defaultOptions
      }
    })
  });

  instance.$mount();
  container.appendChild(instance.$el);

  return instance;
};

VueViewerjs.show = (images, options) => {
  return VueViewerjs.create(images, options);
};

VueViewerjs.setDefaultOptions = (options) => {
  VueViewerjs.defaultOptions = { ...VueViewerjs.defaultOptions, ...options };
};

VueViewerjs.getDefaultOptions = () => {
  return { ...VueViewerjs.defaultOptions };
};

VueViewerjs.Viewer = Viewer;
VueViewerjs.ThumbnailVirtualList = ThumbnailVirtualList;
VueViewerjs.Toolbar = Toolbar;
VueViewerjs.ImageLoader = ImageLoader;
VueViewerjs.MemoryManager = MemoryManager;
VueViewerjs.TileRenderer = TileRenderer;

export default VueViewerjs;

export {
  Viewer,
  ThumbnailVirtualList,
  Toolbar,
  ImageLoader,
  MemoryManager,
  TileRenderer
};
