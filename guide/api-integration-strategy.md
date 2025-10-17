# API Integration Strategy Guide

## Overview
This guide covers setting up a comprehensive API integration strategy for your Vue dashboard application, including authentication, error handling, caching, and performance optimization.

## API Configuration

### 1. Base API Setup
```javascript
// src/utils/api.js
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

// Create base API instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId()

    // Add timestamp for debugging
    config.metadata = { startTime: new Date() }

    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data)
    
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Calculate response time
    const responseTime = new Date() - response.config.metadata.startTime
    console.log(`API Response: ${response.status} ${response.config.url} (${responseTime}ms)`)

    // Transform response data if needed
    return transformResponse(response)
  },
  async (error) => {
    const authStore = useAuthStore()
    const uiStore = useUIStore()

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, config, data } = error.response

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          await authStore.logout()
          window.location.href = '/login'
          break
        
        case 403:
          // Forbidden
          uiStore.addNotification({
            type: 'error',
            message: 'You are not authorized to perform this action'
          })
          break
        
        case 404:
          // Not found
          uiStore.addNotification({
            type: 'error',
            message: 'The requested resource was not found'
          })
          break
        
        case 422:
          // Validation error
          // These are handled by forms, no notification needed
          break
        
        case 429:
          // Rate limited
          uiStore.addNotification({
            type: 'warning',
            message: 'Too many requests. Please try again later.'
          })
          break
        
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          uiStore.addNotification({
            type: 'error',
            message: 'Server error. Please try again later.'
          })
          break
        
        default:
          uiStore.addNotification({
            type: 'error',
            message: data?.message || 'An error occurred'
          })
      }

      // Transform error for consistent handling
      return Promise.reject(transformError(error))
    } else if (error.request) {
      // Network error
      uiStore.addNotification({
        type: 'error',
        message: 'Network error. Please check your connection.'
      })
      return Promise.reject(transformError(error))
    } else {
      // Other error
      console.error('API Error:', error)
      return Promise.reject(transformError(error))
    }
  }
)

// Utility functions
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const transformResponse = (response) => {
  // Standardize response format
  return {
    data: response.data,
    status: response.status,
    meta: {
      requestId: response.config.headers['X-Request-ID'],
      responseTime: new Date() - response.config.metadata.startTime
    }
  }
}

const transformError = (error) => {
  return {
    message: error.response?.data?.message || error.message,
    errors: error.response?.data?.errors || null,
    status: error.response?.status || null,
    requestId: error.config?.headers?.X-Request-ID'] || null
  }
}

export default api
```

### 2. Enhanced API Composable
```typescript
// src/composables/useApi.js
import { ref, reactive } from 'vue'
import api from '@/utils/api'

export const useApi = () => {
  const loading = ref(false)
  const error = ref(null)
  const response = ref(null)

  // Request cache for GET requests
  const cache = new Map()

  const request = async (config, options = {}) => {
    const { 
      cache: useCache = false, 
      cacheKey = null, 
      timeout = 10000,
      retries = 0,
      retryDelay = 1000
    } = options

    // Check cache first
    if (useCache && config.method === 'get') {
      const key = cacheKey || JSON.stringify(config)
      if (cache.has(key)) {
        return cache.get(key)
      }
    }

    loading.value = true
    error.value = null

    try {
      const response = await makeRequestWithRetry(api, config, retries, retryDelay)
      
      // Cache GET requests
      if (useCache && config.method === 'get') {
        const key = cacheKey || JSON.stringify(config)
        cache.set(key, response.data)
        
        // Clear cache after 5 minutes
        setTimeout(() => {
          cache.delete(key)
        }, 5 * 60 * 1000)
      }

      response.value = response.data
      return response.data
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const get = (url, params = {}, options = {}) => {
    return request({ method: 'get', url, params }, options)
  }

  const post = (url, data = {}, options = {}) => {
    return request({ method: 'post', url, data }, options)
  }

  const put = (url, data = {}, options = {}) => {
    return request({ method: 'put', url, data }, options)
  }

  const patch = (url, data = {}, options = {}) => {
    return request({ method: 'patch', url, data }, options)
  }

  const del = (url, options = {}) => {
    return request({ method: 'delete', url }, options)
  }

  const clearCache = (pattern = null) => {
    if (pattern) {
      for (const key of cache.keys()) {
        if (key.includes(pattern)) {
          cache.delete(key)
        }
      }
    } else {
      cache.clear()
    }
  }

  const makeRequestWithRetry = async (axiosInstance, config, retries, delay) => {
    try {
      return await axiosInstance(config)
    } catch (err) {
      if (retries > 0 && shouldRetry(err)) {
        await new Promise(resolve => setTimeout(resolve, delay))
        return makeRequestWithRetry(axiosInstance, config, retries - 1, delay * 2)
      }
      throw err
    }
  }

  const shouldRetry = (err) => {
    // Retry on network errors and 5xx server errors
    return !err.response || (err.response.status >= 500 && err.response.status < 600)
  }

  return {
    loading,
    error,
    response,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    clearCache
  }
}
```

## API Service Layer

### 1. Product API Service
```javascript
// src/services/products.js
import { useApi } from '@/composables/useApi.js'

class ProductService {
  constructor() {
    this.api = useApi()
  }

  // Get all products with pagination and filtering
  async getProducts(params = {}) {
    const response = await this.api.get('/products', params, { cache: true, cacheKey: 'products' })
    return response
  }

  // Get single product
  async getProduct(id) {
    const response = await this.api.get(`/products/${id}`, {}, { cache: true })
    return response
  }

  // Create product
  async createProduct(productData) {
    // Clear products cache when creating
    this.api.clearCache('products')
    const response = await this.api.post('/products', productData)
    return response
  }

  // Update product
  async updateProduct(id, updates) {
    // Clear specific product and list cache
    this.api.clearCache(`products`)
    this.api.clearCache(`product.${id}`)
    const response = await this.api.put(`/products/${id}`, updates)
    return response
  }

  // Delete product
  async deleteProduct(id) {
    // Clear caches
    this.api.clearCache('products')
    this.api.clearCache(`product.${id}`)
    await this.api.delete(`/products/${id}`)
  }

  // Bulk create products
  async createBulkProducts(products) {
    this.api.clearCache('products')
    const response = await this.api.post('/products/bulk', { products })
    return response
  }

  // Check if product code is unique
  async checkCodeUnique(code) {
    try {
      await this.api.get(`/products/check-code`, { code })
      return true
    } catch (err) {
      if (err.status === 409) {
        return false
      }
      throw err
    }
  }

  // Search products
  async searchProducts(query, filters = {}) {
    const response = await this.api.get('/products/search', { 
      q: query, 
      ...filters 
    }, { cache: true })
    return response
  }

  // Get product categories
  async getCategories() {
    const response = await this.api.get('/categories', {}, { cache: true, cacheKey: 'categories' })
    return response
  }

  // Get low stock products
  async getLowStockProducts(threshold = 10) {
    const response = await this.api.get('/products/low-stock', { 
      threshold 
    }, { cache: true, cacheKey: 'low-stock-products' })
    return response
  }

  // Bulk update stock
  async updateBulkStock(updates) {
    this.api.clearCache('products')
    this.api.clearCache('low-stock-products')
    const response = await this.api.patch('/products/bulk-stock', { updates })
    return response
  }
}

export default new ProductService()
```

### 2. Orders API Service
```javascript
// src/services/orders.js
import { useApi } from '@/composables/useApi.js'

class OrderService {
  constructor() {
    this.api = useApi()
  }

  // Get orders with filtering
  async getOrders(params = {}) {
    const response = await this.api.get('/orders', params, { cache: true })
    return response
  }

  // Get single order
  async getOrder(id) {
    const response = await this.api.get(`/orders/${id}`, {}, { cache: true })
    return response
  }

  // Create order
  async createOrder(orderData) {
    this.api.clearCache('orders')
    const response = await this.api.post('/orders', orderData)
    return response
  }

  // Update order status
  async updateOrderStatus(id, status) {
    this.api.clearCache('orders')
    this.api.clearCache(`order.${id}`)
    const response = await this.api.patch(`/orders/${id}/status`, { status })
    return response
  }

  // Cancel order
  async cancelOrder(id, reason) {
    this.api.clearCache('orders')
    this.api.clearCache(`order.${id}`)
    const response = await this.api.post(`/orders/${id}/cancel`, { reason })
    return response
  }

  // Get order statistics
  async getOrderStats(params = {}) {
    const response = await this.api.get('/orders/stats', params, { cache: true })
    return response
  }
}

export default new OrderService()
```

### 3. Base Service Class
```javascript
// src/services/BaseService.js
import { useApi } from '@/composables/useApi.js'

export class BaseService {
  constructor(endpoint) {
    this.api = useApi()
    this.endpoint = endpoint
  }

  // Generic CRUD operations
  async getAll(params = {}) {
    return this.api.get(this.endpoint, params, { cache: true })
  }

  async getById(id) {
    return this.api.get(`${this.endpoint}/${id}`, {}, { cache: true })
  }

  async create(data) {
    this.api.clearCache(this.endpoint)
    return this.api.post(this.endpoint, data)
  }

  async update(id, data) {
    this.api.clearCache(this.endpoint)
    this.api.clearCache(`${this.endpoint}.${id}`)
    return this.api.put(`${this.endpoint}/${id}`, data)
  }

  async delete(id) {
    this.api.clearCache(this.endpoint)
    this.api.clearCache(`${this.endpoint}.${id}`)
    return this.api.delete(`${this.endpoint}/${id}`)
  }

  // Pagination helper
  async getAllPaginated(page = 1, limit = 10, filters = {}) {
    return this.getAll({
      page,
      limit,
      ...filters
    })
  }
}
```

## Store Integration

### 1. Enhanced Product Store with API Service
```javascript
// src/stores/products.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import productService from '@/services/products.js'

export const useProductStore = defineStore('products', () => {
  // State
  const products = ref([])
  const categories = ref([])
  const loading = ref(false)
  const error = ref(null)
  const searchQuery = ref('')
  const selectedCategory = ref('')
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Getters
  const filteredProducts = computed(() => {
    let filtered = products.value

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.code?.toLowerCase().includes(query)
      )
    }

    if (selectedCategory.value) {
      filtered = filtered.filter(product => 
        product.category === selectedCategory.value
      )
    }

    return filtered
  })

  const totalProducts = computed(() => products.value.length)
  const lowStockProducts = computed(() => 
    products.value.filter(p => p.stock < 10)
  )

  const totalValue = computed(() => 
    products.value.reduce((sum, product) => 
      sum + (product.price * product.stock), 0
    )
  )

  // Actions
  const fetchProducts = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      const response = await productService.getProducts({
        page: pagination.value.page,
        limit: pagination.value.limit,
        ...params
      })
      
      products.value = response.data
      pagination.value = {
        ...pagination.value,
        ...response.meta.pagination
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createProduct = async (productData) => {
    loading.value = true
    error.value = null

    try {
      const newProduct = await productService.createProduct(productData)
      products.value.push(newProduct)
      return newProduct
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createBulkProducts = async (productsData) => {
    loading.value = true
    error.value = null

    try {
      const newProducts = await productService.createBulkProducts(productsData)
      products.value.push(...newProducts)
      return newProducts
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateProduct = async (id, updates) => {
    loading.value = true
    error.value = null

    try {
      const updatedProduct = await productService.updateProduct(id, updates)
      const index = products.value.findIndex(p => p.id === id)
      if (index !== -1) {
        products.value[index] = updatedProduct
      }
      return updatedProduct
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteProduct = async (id) => {
    loading.value = true
    error.value = null

    try {
      await productService.deleteProduct(id)
      products.value = products.value.filter(p => p.id !== id)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const checkCodeUnique = async (code) => {
    return await productService.checkCodeUnique(code)
  }

  const fetchCategories = async () => {
    try {
      const response = await productService.getCategories()
      categories.value = response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const setSearchQuery = (query) => {
    searchQuery.value = query
  }

  const setSelectedCategory = (category) => {
    selectedCategory.value = category
  }

  const setPage = (page) => {
    pagination.value.page = page
  }

  const setLimit = (limit) => {
    pagination.value.limit = limit
    pagination.value.page = 1 // Reset to first page
  }

  return {
    // State
    products,
    categories,
    loading,
    error,
    searchQuery,
    selectedCategory,
    pagination,
    // Getters
    filteredProducts,
    totalProducts,
    lowStockProducts,
    totalValue,
    // Actions
    fetchProducts,
    createProduct,
    createBulkProducts,
    updateProduct,
    deleteProduct,
    checkCodeUnique,
    fetchCategories,
    setSearchQuery,
    setSelectedCategory,
    setPage,
    setLimit
  }
})
```

## Error Handling Strategy

### 1. Error Boundary Component
```vue
<!-- src/components/ErrorBoundary.vue -->
<template>
  <div v-if="error" class="error-boundary">
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <h3 class="text-lg font-medium text-red-800 mb-2">Something went wrong</h3>
      <p class="text-red-600 mb-4">{{ error.message }}</p>
      
      <div v-if="error.requestId" class="text-sm text-red-500 mb-4">
        Error ID: {{ error.requestId }}
      </div>

      <div class="flex gap-2">
        <button
          @click="retry"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
        <button
          @click="reset"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Reset
        </button>
      </div>

      <details v-if="showDetails" class="mt-4">
        <summary class="cursor-pointer text-sm text-red-600">Technical Details</summary>
        <pre class="mt-2 text-xs text-red-500 bg-red-100 p-2 rounded overflow-auto">{{ JSON.stringify(error, null, 2) }}</pre>
      </details>
    </div>
  </div>
  
  <slot v-else />
</template>

<script setup>
import { ref } from 'vue'

const error = ref(null)
const showDetails = ref(false)

const handleError = (err) => {
  error.value = err
  console.error('ErrorBoundary caught error:', err)
}

const retry = () => {
  error.value = null
}

const reset = () => {
  error.value = null
  // Emit reset event for parent to handle
  emit('reset')
}

defineExpose({ handleError })
defineEmits(['reset'])
</script>
```

### 2. Global Error Handler
```javascript
// src/utils/errorHandler.js
import { useUIStore } from '@/stores/ui'

export const globalErrorHandler = (error, instance, info) => {
  console.error('Global error:', error, info)
  
  const uiStore = useUIStore()
  
  // Show user-friendly error message
  uiStore.addNotification({
    type: 'error',
    message: 'An unexpected error occurred. Please try again.',
    duration: 5000
  })

  // Log to error tracking service (e.g., Sentry)
  if (import.meta.env.PROD) {
    // logErrorToService(error, info)
  }
}

// Install in main.js
export const installErrorHandler = (app) => {
  app.config.errorHandler = globalErrorHandler
  
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('Vue warning:', msg, trace)
  }
}
```

## Performance Optimization

### 1. Request Debouncing
```javascript
// src/composables/useDebouncedApi.js
import { useApi } from '@/composables/useApi.js'
import { ref, watch } from 'vue'
import { debounce } from 'lodash-es'

export const useDebouncedApi = (delay = 300) => {
  const { loading, error, get } = useApi()
  const results = ref(null)

  const debouncedFetch = debounce(async (url, params) => {
    try {
      results.value = await get(url, params)
    } catch (err) {
      // Error handled by useApi
    }
  }, delay)

  const search = (url, params) => {
    debouncedFetch(url, params)
  }

  return {
    loading,
    error,
    results,
    search
  }
}
```

### 2. Smart Caching
```javascript
// src/utils/cache.js
class SmartCache {
  constructor() {
    this.cache = new Map()
    this.ttl = 5 * 60 * 1000 // 5 minutes default
  }

  set(key, value, customTtl = null) {
    const ttl = customTtl || this.ttl
    const expires = Date.now() + ttl
    
    this.cache.set(key, {
      value,
      expires
    })
  }

  get(key) {
    const item = this.cache.get(key)
    
    if (!item) return null
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }

  clear(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  // Cache invalidation based on dependencies
  invalidate(dependency) {
    for (const [key, item] of this.cache) {
      if (item.dependencies?.includes(dependency)) {
        this.cache.delete(key)
      }
    }
  }
}

export const apiCache = new SmartCache()
```

This comprehensive API integration strategy provides robust error handling, caching, performance optimization, and maintainable service architecture for your Vue dashboard application.
