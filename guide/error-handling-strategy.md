# Error Handling Strategy Guide

## Overview
This guide covers implementing a comprehensive error handling strategy for your Vue dashboard application, including global error handling, error boundaries, user feedback, logging, and recovery mechanisms.

## Error Handling Architecture

### 1. Error Types Classification
```javascript
// src/utils/errors.js
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN', statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
    this.userMessage = this.generateUserMessage()
  }

  generateUserMessage() {
    const messages = {
      NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
      VALIDATION_ERROR: 'Please check your input and try again.',
      AUTH_ERROR: 'Authentication failed. Please log in again.',
      PERMISSION_ERROR: 'You don\'t have permission to perform this action.',
      NOT_FOUND: 'The requested resource was not found.',
      SERVER_ERROR: 'Server error occurred. Please try again later.',
      TIMEOUT_ERROR: 'Request timed out. Please try again.',
      UNKNOWN: 'An unexpected error occurred.'
    }
    return messages[this.code] || messages.UNKNOWN
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      userMessage: this.userMessage,
      stack: this.stack
    }
  }
}

export class ValidationError extends AppError {
  constructor(fieldErrors = {}) {
    const message = Object.values(fieldErrors).flat().join(', ')
    super(message, 'VALIDATION_ERROR', 422, fieldErrors)
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthError'
  }
}

export class PermissionError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 'PERMISSION_ERROR', 403)
    this.name = 'PermissionError'
  }
}

export class NetworkError extends AppError {
  constructor(originalError) {
    const message = originalError.message || 'Network error occurred'
    super(message, 'NETWORK_ERROR', 0, {
      originalError: originalError.message,
      isNetworkError: true
    })
    this.name = 'NetworkError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export const createError = (message, code, statusCode, details) => {
  return new AppError(message, code, statusCode, details)
}

export const handleError = (error) => {
  if (error instanceof AppError) {
    return error
  }

  // API response error
  if (error.response) {
    const { status, data } = error.response
    const code = getErrorCodeFromStatus(status)
    return new AppError(
      data.message || error.message,
      code,
      status,
      data.errors || null
    )
  }

  // Network error
  if (error.request && !error.response) {
    return new NetworkError(error)
  }

  // Timeout error
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return new AppError('Request timeout', 'TIMEOUT_ERROR', 408)
  }

  // Generic error
  return new AppError(
    error.message || 'Unknown error occurred',
    'UNKNOWN',
    500,
    { originalError: error.message }
  )
}

const getErrorCodeFromStatus = (status) => {
  const codes = {
    400: 'VALIDATION_ERROR',
    401: 'AUTH_ERROR',
    403: 'PERMISSION_ERROR',
    404: 'NOT_FOUND',
    408: 'TIMEOUT_ERROR',
    429: 'RATE_LIMIT_ERROR',
    500: 'SERVER_ERROR',
    502: 'SERVER_ERROR',
    503: 'SERVER_ERROR',
    504: 'SERVER_ERROR'
  }
  return codes[status] || 'UNKNOWN'
}
```

### 2. Global Error Handler
```javascript
// src/utils/globalErrorHandler.js
import { useNotificationStore } from '@/stores/notifications.js'
import { handleError } from './errors.js'

class GlobalErrorHandler {
  constructor() {
    this.notificationStore = null
    this.errorLog = []
    this.maxLogSize = 100
    this.reportingEndpoint = import.meta.env.VITE_ERROR_REPORTING_ENDPOINT
  }

  initialize(app) {
    // Set up Vue error handler
    app.config.errorHandler = (error, instance, info) => {
      this.handleVueError(error, instance, info)
    }

    // Set up warning handler
    app.config.warnHandler = (msg, instance, trace) => {
      this.handleVueWarning(msg, instance, trace)
    }

    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event)
    })

    // Set up global error listener
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event)
    })

    // Initialize notification store
    this.notificationStore = useNotificationStore()
  }

  handleVueError(error, instance, info) {
    const appError = handleError(error)
    
    console.error('Vue Error:', {
      error: appError,
      instance,
      info
    })

    this.logError(appError, {
      type: 'vue',
      componentName: instance?.$options?.name,
      info
    })

    this.notifyUser(appError)
    this.reportError(appError, { info })
  }

  handleVueWarning(msg, instance, trace) {
    console.warn('Vue Warning:', { msg, instance, trace })
    
    // Log warnings but don't notify user
    this.logError(new Error(msg), {
      type: 'vue-warning',
      componentName: instance?.$options?.name,
      trace
    })
  }

  handleUnhandledRejection(event) {
    const appError = handleError(event.reason)
    
    console.error('Unhandled Promise Rejection:', appError)
    
    this.logError(appError, {
      type: 'unhandled-rejection'
    })

    this.notifyUser(appError)
    this.reportError(appError, { type: 'unhandled-rejection' })

    event.preventDefault()
  }

  handleGlobalError(event) {
    const appError = handleError(event.error || new Error(event.message))
    
    console.error('Global Error:', appError)
    
    this.logError(appError, {
      type: 'global',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })

    this.notifyUser(appError)
    this.reportError(appError, {
      type: 'global',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  }

  logError(error, context = {}) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      error: error.toJSON ? error.toJSON() : error,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // Add to local log
    this.errorLog.unshift(logEntry)
    
    // Trim log if necessary
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize)
    }

    // Store in localStorage for persistence
    this.storeErrorLog()
  }

  notifyUser(error) {
    if (!this.notificationStore) {
      console.warn('Notification store not initialized')
      return
    }

    const notification = {
      title: 'Error',
      message: error.userMessage,
      type: error.statusCode >= 500 ? 'error' : 'warning',
      duration: error.statusCode >= 500 ? 0 : 5000,
      actions: this.getErrorActions(error)
    }

    this.notificationStore.addNotification(notification)
  }

  getErrorActions(error) {
    const actions = []
    
    if (error.code === 'NETWORK_ERROR') {
      actions.push({
        label: 'Retry',
        handler: () => {
          window.location.reload()
        }
      })
    }

    if (error.statusCode >= 500) {
      actions.push({
        label: 'Report Issue',
        handler: () => {
          this.reportToSupport(error)
        }
      })
    }

    actions.push({
      label: 'Details',
      handler: () => {
        this.showErrorDetails(error)
      }
    })

    return actions
  }

  async reportError(error, additionalContext = {}) {
    if (!this.reportingEndpoint) return

    try {
      const report = {
        error: error.toJSON(),
        context: {
          ...error.details,
          ...additionalContext,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        environment: import.meta.env.MODE
      }

      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      })
    } catch (err) {
      console.error('Failed to report error:', err)
    }
  }

  reportToSupport(error) {
    const subject = encodeURIComponent('Application Error Report')
    const body = encodeURIComponent(`
Error Details:
- Type: ${error.name}
- Code: ${error.code}
- Message: ${error.message}
- Timestamp: ${error.timestamp}
- URL: ${window.location.href}

User Agent: ${navigator.userAgent}

Please provide additional details about what you were doing when this error occurred.
    `)

    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`
  }

  showErrorDetails(error) {
    // You could implement a modal or route to error details page
    console.log('Error Details:', error.toJSON())
  }

  storeErrorLog() {
    try {
      localStorage.setItem('app_error_log', JSON.stringify(this.errorLog.slice(0, 50)))
    } catch (err) {
      console.warn('Failed to store error log:', err)
    }
  }

  loadErrorLog() {
    try {
      const stored = localStorage.getItem('app_error_log')
      return stored ? JSON.parse(stored) : []
    } catch (err) {
      console.warn('Failed to load error log:', err)
      return []
    }
  }

  clearErrorLog() {
    this.errorLog = []
    localStorage.removeItem('app_error_log')
  }

  getErrorLog() {
    return this.errorLog
  }

  generateLogId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Recovery strategies
  async attemptRecovery(error) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return this.recoverFromNetworkError()
      case 'AUTH_ERROR':
        return this.recoverFromAuthError()
      case 'SERVER_ERROR':
        return this.recoverFromServerError()
      default:
        return false
    }
  }

  recoverFromNetworkError() {
    // Retry the failed operation after a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 2000)
    })
  }

  recoverFromAuthError() {
    // Redirect to login page
    window.location.href = '/login'
    return Promise.resolve(false)
  }

  recoverFromServerError() {
    // Could implement exponential backoff retry
    return Promise.resolve(false)
  }
}

export const globalErrorHandler = new GlobalErrorHandler()

// Utility function for manual error handling
export const handleAsyncError = async (asyncFn, options = {}) => {
  const { 
    showNotification = true,
    rethrow = false,
    context = {} 
  } = options

  try {
    return await asyncFn()
  } catch (error) {
    const appError = handleError(error)
    globalErrorHandler.logError(appError, context)
    
    if (showNotification) {
      globalErrorHandler.notifyUser(appError)
    }

    if (rethrow) {
      throw appError
    }

    return null
  }
}
```

### 3. Error Boundary Component
```vue
<!-- src/components/Error/ErrorBoundary.vue -->
<template>
  <div v-if="hasError" class="error-boundary">
    <div class="max-w-md mx-auto">
      <!-- Error Icon -->
      <div class="flex justify-center mb-6">
        <div class="bg-red-100 rounded-full p-4">
          <AlertCircle class="w-8 h-8 text-red-600" />
        </div>
      </div>

      <!-- Error Title -->
      <h2 class="text-2xl font-bold text-center text-gray-900 mb-2">
        {{ errorTitle }}
      </h2>

      <!-- Error Message -->
      <p class="text-center text-gray-600 mb-6">
        {{ errorMessage }}
      </p>

      <!-- Error Details (Dev Mode) -->
      <div v-if="showDetails && isDevelopment" class="mb-6">
        <CollapsibleButton
          v-model="showErrorDetails"
          class="mb-4"
        >
          Technical Details
        </CollapsibleButton>
        
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 transform -translate-y-2"
          enter-to-class="opacity-100 transform translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 transform translate-y-0"
          leave-to-class="opacity-0 transform -translate-y-2"
        >
          <div v-if="showErrorDetails" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre class="text-xs text-gray-700 whitespace-pre-wrap">{{ errorDetails }}</pre>
          </div>
        </Transition>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3">
        <Button
          @click="retry"
          variant="primary"
          class="flex-1"
        >
          <RefreshCw class="w-4 h-4 mr-2" />
          Retry
        </Button>
        
        <Button
          v-if="canGoBack"
          @click="goBack"
          variant="secondary"
          class="flex-1"
        >
          <ArrowLeft class="w-4 h-4 mr-2" />
          Go Back
        </Button>
        
        <Button
          @click="reportIssue"
          variant="ghost"
          class="flex-1"
        >
          <Bug class="w-4 h-4 mr-2" />
          Report Issue
        </Button>
      </div>

      <!-- Auto Retry Timer -->
      <div v-if="autoRetryCountdown > 0" class="mt-6">
        <div class="text-center text-sm text-gray-600">
          <p>Retrying automatically in {{ autoRetryCountdown }} seconds...</p>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-1000"
              :style="{ width: `${retryProgress}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <slot v-else />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft, 
  Bug 
} from 'lucide-vue-next'
import Button from '../UI/Button.vue'
import CollapsibleButton from '../UI/CollapsibleButton.vue'
import { globalErrorHandler } from '@/utils/globalErrorHandler.js'

const props = defineProps({
  fallbackTitle: {
    type: String,
    default: 'Something went wrong'
  },
  fallbackMessage: {
    type: String,
    default: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
  },
  showDetails: {
    type: Boolean,
    default: true
  },
  enableAutoRetry: {
    type: Boolean,
    default: false
  },
  autoRetryDelay: {
    type: Number,
    default: 10 // seconds
  },
  maxRetries: {
    type: Number,
    default: 3
  }
})

const emit = defineEmits(['error', 'retry', 'recover'])

// State
const hasError = ref(false)
const error = ref(null)
const errorInfo = ref(null)
const showErrorDetails = ref(false)
const retryCount = ref(0)
const autoRetryCountdown = ref(0)
let autoRetryTimer = null

// Computed
const isDevelopment = computed(() => import.meta.env.DEV)

const errorTitle = computed(() => {
  if (error.value?.title) return error.value.title
  if (error.value?.code) return getErrorTitle(error.value.code)
  return props.fallbackTitle
})

const errorMessage = computed(() => {
  if (error.value?.userMessage) return error.value.userMessage
  return props.fallbackMessage
})

const errorDetails = computed(() => {
  if (!error.value) return ''
  
  const details = {
    name: error.value.name,
    message: error.value.message,
    code: error.value.code,
    statusCode: error.value.statusCode,
    stack: error.value.stack
  }
  
  return JSON.stringify(details, null, 2)
})

const canGoBack = computed(() => window.history.length > 1)

const retryProgress = computed(() => {
  return ((props.autoRetryDelay - autoRetryCountdown.value) / props.autoRetryDelay) * 100
})

// Methods
const handleError = (err, info = null) => {
  console.error('ErrorBoundary caught error:', err, info)
  
  hasError.value = true
  error.value = err
  errorInfo.value = info
  
  emit('error', err, info)
  
  // Log to global error handler
  globalErrorHandler.logError(err, { component: 'ErrorBoundary', info })
  
  // Start auto retry if enabled
  if (props.enableAutoRetry && retryCount.value < props.maxRetries) {
    startAutoRetry()
  }
}

const retry = () => {
  clearAutoRetry()
  retryCount.value++
  hasError.value = false
  error.value = null
  errorInfo.value = null
  
  emit('retry', retryCount.value)
}

const goBack = () => {
  if (window.history.length > 1) {
    window.history.go(-1)
  } else {
    window.location.href = '/'
  }
}

const reportIssue = () => {
  if (error.value) {
    globalErrorHandler.reportToSupport(error.value)
  }
}

const startAutoRetry = () => {
  clearAutoRetry()
  autoRetryCountdown.value = props.autoRetryDelay
  
  autoRetryTimer = setInterval(() => {
    autoRetryCountdown.value--
    
    if (autoRetryCountdown.value <= 0) {
      clearAutoRetry()
      retry()
    }
  }, 1000)
}

const clearAutoRetry = () => {
  if (autoRetryTimer) {
    clearInterval(autoRetryTimer)
    autoRetryTimer = null
  }
  autoRetryCountdown.value = 0
}

const getErrorTitle = (code) => {
  const titles = {
    NETWORK_ERROR: 'Network Error',
    AUTH_ERROR: 'Authentication Error',
    PERMISSION_ERROR: 'Permission Denied',
    NOT_FOUND: 'Page Not Found',
    VALIDATION_ERROR: 'Validation Error',
    SERVER_ERROR: 'Server Error',
    TIMEOUT_ERROR: 'Request Timeout'
  }
  return titles[code] || 'Error'
}

// Error Boundary implementation
let errorBoundaryInstance = null

onMounted(() => {
  errorBoundaryInstance = {
    handleError
  }
})

onUnmounted(() => {
  clearAutoRetry()
  errorBoundaryInstance = null
})

// Expose errorBoundaryInstance globally for external error handling
defineExpose({
  handleError
})

// Global error boundary function
window.triggerErrorBoundary = (error, info) => {
  if (errorBoundaryInstance) {
    errorBoundaryInstance.handleError(error, info)
  }
}
</script>

<style scoped>
.error-boundary {
  @apply flex items-center justify-center min-h-screen bg-gray-50 p-4;
}
</style>
```

### 4. Async Error Handling Hook
```typescript
// src/composables/useErrorHandler.js
import { ref } from 'vue'
import { globalErrorHandler, handleAsyncError } from '@/utils/globalErrorHandler.js'

export const useErrorHandler = () => {
  const error = ref(null)
  const loading = ref(false)

  const handleError = (err, context = {}) => {
    error.value = globalErrorHandler.handleError(err)
    globalErrorHandler.logError(error.value, context)
    globalErrorHandler.notifyUser(error.value)
    
    return error.value
  }

  const clearError = () => {
    error.value = null
  }

  const executeWithErrorHandling = async (asyncFn, options = {}) => {
    const {
      showNotification = true,
      setLoading = true,
      context = {}
    } = options

    clearError()
    
    if (setLoading) {
      loading.value = true
    }

    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      handleError(err, context)
      throw err
    } finally {
      if (setLoading) {
        loading.value = false
      }
    }
  }

  const safeExecute = async (asyncFn, options = {}) => {
    try {
      return await executeWithErrorHandling(asyncFn, options)
    } catch (err) {
      // Error already handled, return null or fallback value
      return options.fallback || null
    }
  }

  // Retry mechanism
  const retryWithBackoff = async (asyncFn, maxRetries = 3, delay = 1000) => {
    let lastError = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn()
      } catch (err) {
        lastError = err
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    throw lastError
  }

  return {
    error,
    loading,
    handleError,
    clearError,
    executeWithErrorHandling,
    safeExecute,
    retryWithBackoff
  }
}

// Higher-order component for async operations
export const withErrorHandling = (asyncFn, options = {}) => {
  return async (...args) => {
    return await handleAsyncError(() => asyncFn(...args), options)
  }
}
```

## API Error Integration

### 1. Enhanced API Service with Error Handling
```javascript
// src/services/baseService.js
import api from '@/utils/api.js'
import { handleError } from '@/utils/errors.js'
import { globalErrorHandler } from '@/utils/globalErrorHandler.js'

export class BaseService {
  constructor(endpoint) {
    this.endpoint = endpoint
  }

  async request(config, options = {}) {
    const { 
      skipGlobalHandling = false,
      customErrorHandler = null,
      context = {} 
    } = options

    try {
      const response = await api({
        ...config,
        url: this.buildUrl(config.url)
      })
      
      return response
    } catch (error) {
      const appError = handleError(error)
      
      if (customErrorHandler) {
        customErrorHandler(appError, config)
      } else if (!skipGlobalHandling) {
        globalErrorHandler.logError(appError, {
          ...context,
          requestConfig: config,
          service: this.constructor.name
        })
        
        globalErrorHandler.notifyUser(appError)
      }
      
      throw appError
    }
  }

  buildUrl(path = '') {
    return path.startsWith('/') ? path : `${this.endpoint}${path ? '/' : ''}${path}`
  }

  // CRUD operations with error handling
  async getAll(params = {}, options = {}) {
    return this.request({
      method: 'GET',
      params
    }, options)
  }

  async getById(id, options = {}) {
    return this.request({
      method: 'GET',
      url: `/${id}`
    }, options)
  }

  async create(data, options = {}) {
    return this.request({
      method: 'POST',
      data
    }, options)
  }

  async update(id, data, options = {}) {
    return this.request({
      method: 'PUT',
      url: `/${id}`,
      data
    }, options)
  }

  async patch(id, data, options = {}) {
    return this.request({
      method: 'PATCH',
      url: `/${id}`,
      data
    }, options)
  }

  async delete(id, options = {}) {
    return this.request({
      method: 'DELETE',
      url: `/${id}`
    }, options)
  }
}
```

### 2. Service-Specific Error Handling
```javascript
// src/services/products.js
import { BaseService } from './baseService.js'
import { ValidationError, NotFoundError } from '@/utils/errors.js'

class ProductService extends BaseService {
  constructor() {
    super('/products')
  }

  async create(productData, options = {}) {
    try {
      return await super.create(productData, options)
    } catch (error) {
      // Handle specific product creation errors
      if (error.statusCode === 409) {
        throw new ValidationError({
          code: error.code || 'DUPLICATE_CODE',
          message: 'Product code already exists'
        })
      }
      throw error
    }
  }

  async updateStock(id, stockData, options = {}) {
    try {
      return await this.request({
        method: 'PATCH',
        url: `/${id}/stock`,
        data: stockData
      }, options)
    } catch (error) {
      // Handle stock-specific errors
      if (error.statusCode === 400) {
        throw new ValidationError({
          stock: 'Invalid stock quantity'
        })
      }
      throw error
    }
  }

  async getLowStock(threshold = 10, options = {}) {
    try {
      return await this.request({
        method: 'GET',
        url: '/low-stock',
        params: { threshold }
      }, options)
    } catch (error) {
      // Provide fallback for non-critical features
      if (error.statusCode >= 500) {
        console.warn('Failed to fetch low stock products:', error.message)
        return { data: [], total: 0 }
      }
      throw error
    }
  }

  // Custom error handler for this service
  handleProductError = (error, config) => {
    // Log additional context for product errors
    globalErrorHandler.logError(error, {
      service: 'ProductService',
      operation: config.method,
      url: config.url
    })

    // Custom user messages for specific product errors
    if (error.code === 'VALIDATION_ERROR') {
      globalErrorHandler.notificationStore.addNotification({
        title: 'Product Error',
        message: 'Please check all product fields and try again.',
        type: 'warning',
        duration: 5000
      })
      return
    }

    globalErrorHandler.notifyUser(error)
  }

  // Methods using custom error handling
  async createWithCustomHandling(productData) {
    return this.create(productData, {
      customErrorHandler: this.handleProductError,
      context: { operation: 'create-product' }
    })
  }
}

export default new ProductService()
```

## Error Recovery Mechanisms

### 1. Circuit Breaker Pattern
```javascript
// src/utils/circuitBreaker.js
export class CircuitBreaker {
  constructor(
    fn,
    options = {}
  ) {
    this.fn = fn
    this.options = {
      failureThreshold: 5,
      timeout: 60000, // 1 minute
      monitorWindow: 10000, // 10 seconds
      ...options
    }

    this.state = 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    this.failures = 0
    this.lastFailureTime = null
    this.successes = []
  }

  async execute(...args) {
    // Check circuit state
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await this.fn(...args)
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  onSuccess() {
    this.failures = 0
    this.successes.push(Date.now())
    
    // Keep only recent successes
    const cutoff = Date.now() - this.options.monitorWindow
    this.successes = this.successes.filter(time => time > cutoff)

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED'
    }
  }

  onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  shouldAttemptReset() {
    return this.lastFailureTime && 
           (Date.now() - this.lastFailureTime) > this.options.timeout
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes.length,
      lastFailureTime: this.lastFailureTime
    }
  }

  reset() {
    this.state = 'CLOSED'
    this.failures = 0
    this.lastFailureTime = null
    this.successes = []
  }
}

// Create circuit breakers for critical services
export const createCircuitBreaker = (fn, options) => {
  return new CircuitBreaker(fn, options)
}
```

### 2. Retry Mechanism
```javascript
// src/utils/retry.js
export class RetryManager {
  constructor(options = {}) {
    this.options = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true,
      retryCondition: (error) => this.defaultRetryCondition(error),
      ...options
    }
  }

  async execute(fn, ...args) {
    let lastError = null

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        const result = await fn(...args)
        return result
      } catch (error) {
        lastError = error

        if (attempt === this.options.maxAttempts || !this.options.retryCondition(error)) {
          throw error
        }

        const delay = this.calculateDelay(attempt)
        await this.sleep(delay)
      }
    }

    throw lastError
  }

  calculateDelay(attempt) {
    let delay = this.options.baseDelay * Math.pow(this.options.backoffFactor, attempt - 1)
    delay = Math.min(delay, this.options.maxDelay)

    if (this.options.jitter) {
      delay *= (0.5 + Math.random() * 0.5)
    }

    return delay
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  defaultRetryCondition(error) {
    // Retry on network errors and 5xx server errors
    return (
      error.code === 'NETWORK_ERROR' ||
      error.statusCode === 408 || // Timeout
      error.statusCode === 429 || // Rate limited
      (error.statusCode >= 500 && error.statusCode < 600)
    )
  }
}

export const retry = (fn, options) => {
  const retryManager = new RetryManager(options)
  return retryManager.execute.bind(retryManager)
}
```

## Usage Examples

### 1. Using Error Boundaries
```vue
<!-- src/views/Product/CreateProductView.vue -->
<template>
  <ErrorBoundary @error="handleProductError">
    <div class="space-y-6">
      <ProductForm
        @submit="createProduct"
        :loading="productStore.loading"
      />
    </div>
  </ErrorBoundary>
</template>

<script setup>
import { useProductStore } from '@/stores/products'
import ErrorBoundary from '@/components/Error/ErrorBoundary.vue'
import ProductForm from '@/components/Product/ProductForm.vue'

const productStore = useProductStore()

const createProduct = async (productData) => {
  await productStore.createProduct(productData)
  // Handle success
}

const handleProductError = (error) => {
  console.error('Product creation failed:', error)
  // Additional error-specific handling
}
</script>
```

### 2. Using Error Handling Composable
```vue
<!-- src/components/DataFetcher.vue -->
<template>
  <div>
    <div v-if="loading" class="loading-spinner">
      <LoadingSpinner />
    </div>
    
    <div v-else-if="error" class="error-message">
      <Alert type="error" :message="error.userMessage" />
      <Button @click="retry">Retry</Button>
    </div>
    
    <div v-else>
      <slot :data="data" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useErrorHandler } from '@/composables/useErrorHandler.js'
import Alert from '../Notification/Alert.vue'
import Button from '../UI/Button.vue'
import LoadingSpinner from '../UI/LoadingSpinner.vue'

const props = defineProps({
  fetchData: {
    type: Function,
    required: true
  },
  autoFetch: {
    type: Boolean,
    default: true
  }
})

const { error, loading, executeWithErrorHandling, safeExecute } = useErrorHandler()
const data = ref(null)

const fetch = async () => {
  data.value = await executeWithErrorHandling(
    () => props.fetchData(),
    { context: { component: 'DataFetcher' } }
  )
}

const retry = () => {
  fetch()
}

if (props.autoFetch) {
  onMounted(fetch)
}
</script>
```

This comprehensive error handling strategy provides robust error management, user feedback, and recovery mechanisms for your Vue dashboard application.
