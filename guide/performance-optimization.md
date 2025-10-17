# Performance Optimization Guide

## Overview
This guide covers comprehensive performance optimization strategies for your Vue dashboard application, including code splitting, lazy loading, caching strategies, bundle optimization, and runtime performance improvements.

## Bundle Optimization

### 1. Vite Configuration for Performance
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  build: {
    // Build optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    
    // Generate source maps for production debugging
    sourcemap: import.meta.env.PROD && process.env.VITE_ENABLE_SOURCEMAPS === 'true',
    
    // Optimize chunks
    rollupOptions: {
      output: {
        // Manual chunk splitting
        manualChunks: {
          // Vendor libraries
          vendor: ['vue', 'vue-router', 'pinia'],
          
          // UI libraries
          ui: ['lucide-vue-next'],
          
          // Utility libraries
          utils: ['axios', 'lodash-es', 'date-fns'],
          
          // Chart libraries
          charts: ['chart.js', 'vue-chartjs'],
          
          // External services
          services: []
        },
        
        // Asset naming
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
            return 'media/[name]-[hash].[ext]'
          }
          
          if (/\.(png|jpe?g|gif|svg|webp)(\?.*)?$/i.test(assetInfo.name)) {
            return 'images/[name]-[hash].[ext]'
          }
          
          if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
            return 'fonts/[name]-[hash].[ext]'
          }
          
          return `${ext}/[name]-[hash].[ext]`
        }
      }
    },
    
    // Report compressed size
    reportCompressedSize: true,
    
    // Target modern browsers
    target: 'es2020',
    
    // CSS code splitting
    cssCodeSplit: true
  },
  
  // Server configuration
  server: {
    // Enable HMR
    hmr: {
      overlay: true
    }
  },
  
  // Dependencies optimization
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios',
      'lucide-vue-next'
    ],
    exclude: [
      // Exclude large libraries from pre-bundling
      'chart.js'
    ]
  },
  
  // Path aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  }
})
```

### 2. Bundle Analysis Tools
```javascript
// vite.analyze.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    // Bundle analyzer
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
})
```

## Code Splitting and Lazy Loading

### 1. Route-based Code Splitting
```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: { 
            title: 'Dashboard',
            preload: true // Preload important routes
          }
        },
        
        // Lazy load product routes
        {
          path: 'products',
          name: 'products',
          component: () => import('@/views/Product/ProductsView.vue'),
          meta: { title: 'Products' }
        },
        
        {
          path: 'products/create',
          name: 'create-product',
          component: () => import('@/views/Product/CreateProductView.vue'),
          meta: { title: 'Create Product' }
        },
        
        // Group related routes in chunks
        {
          path: 'orders',
          name: 'orders',
          component: () => import(/* webpackChunkName: "orders" */ '@/views/OrdersView.vue'),
          meta: { title: 'Orders' }
        },
        
        // Admin routes (separate chunk)
        {
          path: 'admin',
          component: () => import(/* webpackChunkName: "admin" */ '@/layouts/AdminLayout.vue'),
          children: [
            {
              path: 'users',
              name: 'admin-users',
              component: () => import('@/views/Admin/UsersView.vue'),
              meta: { title: 'Users' }
            }
          ]
        }
      ]
    }
  ]
})

export default router
```

### 2. Component-based Code Splitting
```vue
<!-- src/components/HeavyComponent.vue -->
<template>
  <div class="heavy-component">
    <AsyncChart />
    <AsyncDataTable />
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

// Lazy load heavy components
const AsyncChart = defineAsyncComponent({
  loader: () => import('./Chart.vue'),
  loadingComponent: () => import('./loading/ChartLoading.vue'),
  errorComponent: () => import('./error/ChartError.vue'),
  delay: 200,
  timeout: 3000
})

const AsyncDataTable = defineAsyncComponent({
  loader: () => import('./DataTable.vue'),
  loadingComponent:LoadingSpinner,
  errorComponent: ErrorMessage,
  delay: 200,
  timeout: 3000
})
</script>
```

### 3. Dynamic Import Hook
```typescript
// src/composables/useDynamicImport.js
import { ref, onErrorCaptured } from 'vue'

export const useDynamicImport = () => {
  const loading = ref(false)
  const error = ref(null)
  const component = ref(null)

  const loadComponent = async (loader) => {
    loading.value = true
    error.value = null
    
    try {
      component.value = await loader()
    } catch (err) {
      error.value = err
      console.error('Failed to load component:', err)
    } finally {
      loading.value = false
    }
  }

  // Capture component errors
  onErrorCaptured((err) => {
    error.value = err
    console.error('Component error:', err)
    return false
  })

  return {
    loading,
    error,
    component,
    loadComponent
  }
}
```

## Runtime Performance

### 1. Virtual Scrolling
```vue
<!-- src/components/VirtualScroller.vue -->
<template>
  <div
    class="virtual-scroller"
    @scroll="handleScroll"
    ref="containerRef"
  >
    <!-- Total height for scrollbar -->
    <div class="virtual-scroller__spacer" :style="{ height: totalHeight + 'px' }">
      <!-- Visible items -->
      <div
        class="virtual-scroller__items"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div
          v-for="item in visibleItems"
          :key="item.key"
          class="virtual-scroller__item"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot :item="item.data" :index="item.index" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  itemHeight: {
    type: Number,
    default: 50
  },
  buffer: {
    type: Number,
    default: 5
  },
  keyField: {
    type: String,
    default: 'id'
  }
})

const emit = defineEmits(['scroll'])

const containerRef = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

// Computed properties
const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() => {
  return Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer)
})

const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight)
  return Math.min(
    props.items.length - 1,
    startIndex.value + visibleCount + props.buffer * 2
  )
})

const offsetY = computed(() => startIndex.value * props.itemHeight)

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value + 1).map((item, index) => ({
    data: item,
    index: startIndex.value + index,
    key: item[props.keyField] || index
  }))
})

// Methods
const handleScroll = () => {
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
    emit('scroll', {
      scrollTop: scrollTop.value,
      startIndex: startIndex.value,
      endIndex: endIndex.value
    })
  }
}

const updateContainerHeight = () => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

const scrollToIndex = (index) => {
  if (containerRef.value) {
    const scrollTop = index * props.itemHeight
    containerRef.value.scrollTop = scrollTop
  }
}

// Lifecycle
onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
  
  // Initialize scroll position
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

defineExpose({
  scrollToIndex
})
</script>

<style scoped>
.virtual-scroller {
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.virtual-scroller__items {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-scroller__item {
  box-sizing: border-box;
}
</style>
```

### 2. Image Optimization
```vue
<!-- src/components/OptimizedImage.vue -->
<template>
  <div class="optimized-image" :class="{ loading, error }">
    <!-- Loading skeleton -->
    <div v-if="loading && skeleton" class="skeleton"></div>
    
    <!-- Image -->
    <img
      ref="imgRef"
      :src="currentSrc"
      :alt="alt"
      :loading="loadingStrategy"
      :sizes="sizes"
      :srcset="srcset"
      @load="handleLoad"
      @error="handleError"
      @loadstart="handleLoadStart"
    />
    
    <!-- Fallback -->
    <div v-if="error && fallback" class="fallback">
      <slot name="fallback">
        <ImageOff class="w-8 h-8 text-gray-400" />
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ImageOff } from 'lucide-vue-next'

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  width: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: null
  },
  loading: {
    type: String,
    default: 'lazy',
    validator: (value) => ['lazy', 'eager'].includes(value)
  },
  skeleton: {
    type: Boolean,
    default: true
  },
  fallback: {
    type: Boolean,
    default: true
  },
  sizes: {
    type: String,
    default: null
  },
  breakpoints: {
    type: Array,
    default: () => [320, 640, 960, 1280, 1920]
  }
})

const emit = defineEmits(['load', 'error', 'loadstart'])

const imgRef = ref(null)
const loading = ref(false)
const error = ref(false)
const loaded = ref(false)

// Generate srcset for responsive images
const srcset = computed(() => {
  if (!props.src.includes('upload')) return null
  
  return props.breakpoints
    .map(width => `${generateSrc(props.src, { w: width })} ${width}w`)
    .join(', ')
})

const currentSrc = computed(() => {
  if (!loaded.value && !loading.value) {
    return props.skeleton ? '' : props.src
  }
  return props.src
})

const loadingStrategy = computed(() => {
  return loaded.value ? 'eager' : props.loading
})

// Methods
const generateSrc = (url, params) => {
  const urlObj = new URL(url, import.meta.env.VITE_CDN_URL)
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })
  return urlObj.toString()
}

const handleLoadStart = () => {
  loading.value = true
  error.value = false
  emit('loadstart')
}

const handleLoad = () => {
  loading.value = false
  loaded.value = true
  error.value = false
  emit('load')
}

const handleError = () => {
  loading.value = false
  error.value = true
  emit('error')
}

const loadImmediately = () => {
  if (imgRef.value &&props.loading === 'lazy') {
    imgRef.value.loading = 'eager'
  }
}

// Intersection Observer for lazy loading
let observer = null

const setupIntersectionObserver = () => {
  if (!imgRef.value || !props.src || props.loading !== 'lazy') return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadImmediately()
          observer?.unobserve(entry.target)
        }
      })
    },
    {
      rootMargin: '50px'
    }
  )

  observer.observe(imgRef.value)
}

const cleanup = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

onMounted(() => {
  setupIntersectionObserver()
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.optimized-image {
  position: relative;
  overflow: hidden;
}

.optimized-image img {
  display: block;
  width: 100%;
  height: auto;
  transition: opacity 0.3s ease;
}

.skeleton {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.fallback {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.optimized-image.loading img {
  opacity: 0;
}

.optimized-image.loaded img {
  opacity: 1;
}
</style>
```

## Caching Strategies

### 1. HTTP Caching
```javascript
// src/utils/cache.js
class CacheManager {
  constructor() {
    this.cache = new Map()
    this.memoryCache = new Map()
    this.defaultTTL = 5 * 60 * 1000 // 5 minutes
    this.maxMemoryCacheSize = 50 // items
  }

  // Memory cache
  setMemoryCache(key, value, ttl = this.defaultTTL) {
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      // Remove oldest item
      const firstKey = this.memoryCache.keys().next().value
      this.memoryCache.delete(firstKey)
    }

    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    })
  }

  getMemoryCache(key) {
    const item = this.memoryCache.get(key)
    if (!item) return null

    const isExpired = Date.now() - item.timestamp > item.ttl
    if (isExpired) {
      this.memoryCache.delete(key)
      return null
    }

    return item.value
  }

  clearMemoryCache() {
    this.memoryCache.clear()
  }

  // Session storage cache (persists for session)
  setSessionCache(key, value, ttl = this.defaultTTL) {
    const item = {
      value,
      timestamp: Date.now(),
      ttl
    }
    sessionStorage.setItem(`cache_${key}`, JSON.stringify(item))
  }

  getSessionCache(key) {
    try {
      const item = JSON.parse(sessionStorage.getItem(`cache_${key}`))
      if (!item) return null

      const isExpired = Date.now() - item.timestamp > item.ttl
      if (isExpired) {
        sessionStorage.removeItem(`cache_${key}`)
        return null
      }

      return item.value
    } catch (err) {
      console.warn('Failed to parse session cache:', err)
      return null
    }
  }

  clearSessionCache() {
    Object.keys(sessionStorage)
      .filter(key => key.startsWith('cache_'))
      .forEach(key => sessionStorage.removeItem(key))
  }

  // Persistent cache (localStorage with expiration)
  setPersistentCache(key, value, ttl = this.defaultTTL) {
    const item = {
      value,
      timestamp: Date.now(),
      ttl
    }
    localStorage.setItem(`cache_${key}`, JSON.stringify(item))
  }

  getPersistentCache(key) {
    try {
      const item = JSON.parse(localStorage.getItem(`cache_${key}`))
      if (!item) return null

      const isExpired = Date.now() - item.timestamp > item.ttl
      if (isExpired) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }

      return item.value
    } catch (err) {
      console.warn('Failed to parse persistent cache:', err)
      return null
    }
  }

  clearPersistentCache() {
    Object.keys(localStorage)
      .filter(key => key.startsWith('cache_'))
      .forEach(key => localStorage.removeItem(key))
  }

  // Smart cache (tries memory, then session, then persistent)
  getSmartCache(key) {
    return this.getMemoryCache(key) || 
           this.getSessionCache(key) || 
           this.getPersistentCache(key)
  }

  setSmartCache(key, value, options = {}) {
    const {
      memory = true,
      session = false,
      persistent = false,
      ttl = this.defaultTTL
    } = options

    if (memory) this.setMemoryCache(key, value, ttl)
    if (session) this.setSessionCache(key, value, ttl)
    if (persistent) this.setPersistentCache(key, value, ttl)
  }

  // Cache invalidation
  invalidate(pattern) {
    const regex = new RegExp(pattern)
    
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key)
      }
    }

    // Clear session cache
    Object.keys(sessionStorage)
      .filter(key => key.startsWith('cache_') && regex.test(key.slice(6)))
      .forEach(key => sessionStorage.removeItem(key))

    // Clear persistent cache
    Object.keys(localStorage)
      .filter(key => key.startsWith('cache_') && regex.test(key.slice(6)))
      .forEach(key => localStorage.removeItem(key))
  }

  // Cache statistics
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      sessionCacheSize: Object.keys(sessionStorage).filter(k => k.startsWith('cache_')).length,
      persistentCacheSize: Object.keys(localStorage).filter(k => k.startsWith('cache_')).length
    }
  }
}

export const cacheManager = new CacheManager()
```

### 2. Service Worker Caching
```javascript
// public/sw.js
const CACHE_NAME = 'dashboard-v1'
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'
const API_CACHE = 'api-v1'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/js/app.js',
  '/css/app.css',
  '/favicon.ico'
]

const API_PATTERNS = /^\/api\//

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
  )
})

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API requests - network first with cache fallback
  if (API_PATTERNS.test(url.pathname)) {
    event.respondWith(networkFirstWithCache(event.request))
    return
  }

  // Static assets - cache first
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(event.request))
    return
  }

  // Other requests - network first with cache fallback
  event.respondWith(networkFirstWithCache(event.request))
})

// Network first with cache fallback
async function networkFirstWithCache(request) {
  const cache = await caches.open(DYNAMIC_CACHE)
  
  try {
    const response = await fetch(request)
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    // Try cache if network fails
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html')
    }
    
    throw error
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    
    if (response.ok) {
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    throw error
  }
}
```

## Memory Management

### 1. Memory Leak Prevention
```javascript
// src/utils/memory.js
export class MemoryManager {
  constructor() {
    this.trackers = new Set()
    this.observers = new Set()
    this.timers = new Set()
  }

  // Track component lifecycle for cleanup
  trackComponent(component) {
    const cleanup = () => {
      // Auto-cleanup when component is unmounted
      this.cleanupForComponent(component)
    }

    // Store cleanup function
    this.trackers.add({ component, cleanup })
    
    return cleanup
  }

  cleanupForComponent(component) {
    // Remove from trackers
    this.trackers.forEach(tracker => {
      if (tracker.component === component) {
        tracker.cleanup()
        this.trackers.delete(tracker)
      }
    })
  }

  // Track observers for cleanup
  trackObserver(observer) {
    this.observers.add(observer)
  }

  cleanupObserver(observer) {
    observer?.disconnect?.()
    this.observers.delete(observer)
  }

  // Track timers for cleanup
  trackTimer(timerId) {
    this.timers.add(timerId)
    return timerId
  }

  cleanupTimer(timerId) {
    clearTimeout(timerId)
    clearInterval(timerId)
    this.timers.delete(timerId)
  }

  // Cleanup all resources
  cleanup() {
    // Cleanup all observers
    this.observers.forEach(observer => this.cleanupObserver(observer))
    
    // Cleanup all timers
    this.timers.forEach(timerId => this.cleanupTimer(timerId))
    
    // Cleanup all component trackers
    this.trackers.forEach(tracker => tracker.cleanup())
    
    // Clear all tracking sets
    this.trackers.clear()
    this.observers.clear()
    this.timers.clear()
  }
}

export const memoryManager = new MemoryManager()

// Composable for automatic cleanup
export const useMemoryCleanup = () => {
  const trackedResources = new Set()

  const track = (resource, cleanup) => {
    trackedResources.add({ resource, cleanup })
  }

  const cleanup = () => {
    trackedResources.forEach(({ cleanup }) => {
      try {
        cleanup()
      } catch (err) {
        console.warn('Cleanup failed:', err)
      }
    })
    trackedResources.clear()
  }

  // Auto-cleanup on unmount
  onUnmounted(cleanup)

  return { track, cleanup }
}
```

### 2. WeakMap for Memory-Efficient Caching
```javascript
// src/utils/weakCache.js
export class WeakCache {
  constructor() {
    this.cache = new WeakMap()
    this.keys = new WeakMap()
  }

  set(obj, value) {
    if (typeof obj !== 'object' && typeof obj !== 'function') {
      throw new Error('WeakCache can only store object keys')
    }
    this.cache.set(obj, value)
    
    // Store a reference for cleanup
    if (!this.keys.has(value)) {
      this.keys.set(value, new Set())
    }
    this.keys.get(value).add(obj)
  }

  get(obj) {
    return this.cache.get(obj)
  }

  has(obj) {
    return this.cache.has(obj)
  }

  delete(obj) {
    const value = this.cache.get(obj)
    if (value && this.keys.has(value)) {
      this.keys.get(value).delete(obj)
      if (this.keys.get(value).size === 0) {
        this.keys.delete(value)
      }
    }
    return this.cache.delete(obj)
  }

  // Cleanup
  cleanup() {
    // WeakMap automatically cleans up when keys are garbage collected
  }
}
```

## Performance Monitoring

### 1. Performance Metrics
```javascript
// src/utils/performance.js
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observers = new Set()
    this.thresholds = {
      FCP: 2000, // First Contentful Paint
      LCP: 2500, // Largest Contentful Paint
      FID: 100,  // First Input Delay
      CLS: 0.1   // Cumulative Layout Shift
    }
  }

  // Monitor Core Web Vitals
  startMonitoring() {
    this.measureFCP()
    this.measureLCP()
    this.measureFID()
    this.measureCLS()
  }

  measureFCP() {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.recordMetric('FCP', lastEntry.startTime)
    }).observe({ entryTypes: ['paint'] })
  }

  measureLCP() {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.recordMetric('LCP', lastEntry.startTime)
    }).observe({ entryTypes: ['largest-contentful-paint'] })
  }

  measureFID() {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach(entry => {
        this.recordMetric('FID', entry.processingStart - entry.startTime)
      })
    }).observe({ entryTypes: ['first-input'] })
  }

  measureCLS() {
    let clsValue = 0
    
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      
      this.recordMetric('CLS', clsValue)
    }).observe({ entryTypes: ['layout-shift'] })
  }

  // Custom metrics
  startTimer(name) {
    this.metrics.set(name, { startTime: performance.now() })
  }

  endTimer(name) {
    const metric = this.metrics.get(name)
    if (metric?.startTime) {
      const duration = performance.now() - metric.startTime
      this.recordMetric(name, duration)
      return duration
    }
  }

  recordMetric(name, value) {
    this.metrics.set(name, {
      value,
      timestamp: Date.now()
    })

    // Check thresholds
    if (this.thresholds[name] && value > this.thresholds[name]) {
      this.notifyThresholdExceeded(name, value)
    }
  }

  getMetric(name) {
    return this.metrics.get(name)?.value
  }

  getAllMetrics() {
    const result = {}
    this.metrics.forEach((metric, name) => {
      result[name] = metric.value
    })
    return result
  }

  notifyThresholdExceeded(metric, value) {
    console.warn(`Performance threshold exceeded for ${metric}: ${value}ms`)
    
    // Send to monitoring service
    this.reportMetric(metric, value)
  }

  async reportMetric(metric, value) {
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          value,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      })
    } catch (err) {
      console.warn('Failed to report metric:', err)
    }
  }
}

export const performanceMonitor = new PerformanceMonitor()

// Performance hook
export const usePerformance = () => {
  const startMeasure = (name) => {
    performanceMonitor.startTimer(name)
  }

  const endMeasure = (name) => {
    return performanceMonitor.endTimer(name)
  }

  const measureAsync = async (name, asyncFn) => {
    startMeasure(name)
    try {
      const result = await asyncFn()
      return result
    } finally {
      endMeasure(name)
    }
  }

  return {
    startMeasure,
    endMeasure,
    measureAsync,
    getMetrics: performanceMonitor.getAllMetrics.bind(performanceMonitor)
  }
}
```

## Usage Examples

### 1. Optimized Product List
```vue
<!-- src/views/Product/ProductListView.vue -->
<template>
  <div class="product-list">
    <!-- Virtual scroller for large lists -->
    <VirtualScroller
      :items="products"
      :item-height="80"
      :buffer="10"
      key-field="id"
    >
      <template #default="{ item, index }">
        <ProductListItem
          :product="item"
          :index="index"
          @click="selectProduct"
        />
      </template>
    </VirtualScroller>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useProductStore } from '@/stores/products'
import { usePerformance } from '@/utils/performance.js'
import VirtualScroller from '@/components/VirtualScroller.vue'
import ProductListItem from '@/components/Product/ProductListItem.vue'

const { measureAsync } = usePerformance()
const productStore = useProductStore()
const products = ref([])

onMounted(async () => {
  await measureAsync('loadProducts', async () => {
    products.value = await productStore.fetchProducts()
  })
})

const selectProduct = (product) => {
  // Handle product selection
}
</script>
```

This comprehensive performance optimization guide provides strategies for building a fast, efficient Vue dashboard application with excellent user experience across different devices and network conditions.
