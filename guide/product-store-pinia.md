# Pinia Store Guide for Vue Dashboard

## Product Store for Pinia

### Key Data Model from CreateProductView.vue
```typescript
interface Product {
  id?: string | number
  name: string          // "Test Name"
  price: number         // decimal, "0.00" format
  code?: string         // Product CODE/SKU
  category: string      // Category name
  stock: number         // integer, defaults to 0
}
```

### Recommended Product Store Structure
```typescript
// src/stores/products.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProductStore = defineStore('products', () => {
  // State
  const products = ref([])
  const loading = ref(false)
  const error = ref(null)
  const searchQuery = ref('')
  const selectedCategory = ref('')
  
  // Getters
  const filteredProducts = computed(() => {
    return products.value.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          product.code?.toLowerCase().includes(searchQuery.value.toLowerCase())
      const matchesCategory = !selectedCategory.value || product.category === selectedCategory.value
      return matchesSearch && matchesCategory
    })
  })
  
  const totalProducts = computed(() => products.value.length)
  const lowStockProducts = computed(() => products.value.filter(p => p.stock < 10))
  
  // Actions
  const fetchProducts = async () => {
    loading.value = true
    error.value = null
    try {
      // API call to fetch products
      // const response = await api.get('/products')
      // products.value = response.data
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  const createProduct = async (productData) => {
    loading.value = true
    error.value = null
    try {
      // API call to create product
      // const response = await api.post('/products', productData)
      // products.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const createBulkProducts = async (productsArray) => {
    loading.value = true
    error.value = null
    try {
      // API call for bulk creation
      // const response = await api.post('/products/bulk', { products: productsArray })
      // products.value.push(...response.data)
      return response.data
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
      // API call to update product
      // const response = await api.put(`/products/${id}`, updates)
      // const index = products.value.findIndex(p => p.id === id)
      // if (index !== -1) products.value[index] = response.data
      return response.data
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
      // API call to delete product
      // await api.delete(`/products/${id}`)
      // products.value = products.value.filter(p => p.id !== id)
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  return {
    // State
    products,
    loading,
    error,
    searchQuery,
    selectedCategory,
    // Getters
    filteredProducts,
    totalProducts,
    lowStockProducts,
    // Actions
    fetchProducts,
    createProduct,
    createBulkProducts,
    updateProduct,
    deleteProduct
  }
})
```

## Additional Stores You Need

### Category Store
```typescript
// src/stores/categories.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Category {
  id?: string | number
  name: string
  description?: string
}

export const useCategoryStore = defineStore('categories', () => {
  const categories = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  const categoryOptions = computed(() => 
    categories.value.map(cat => ({ value: cat.name, label: cat.name }))
  )
  
  const fetchCategories = async () => { /* API call */ }
  const createCategory = async (categoryData) => { /* API call */ }
  const updateCategory = async (id, updates) => { /* API call */ }
  const deleteCategory = async (id) => { /* API call */ }
  
  return {
    categories,
    loading,
    error,
    categoryOptions,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  }
})
```

### Orders Store
```typescript
// src/stores/orders.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface OrderItem {
  productId: string | number
  quantity: number
  price: number
}

interface Order {
  id?: string | number
  items: OrderItem[]
  total: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  customerInfo: CustomerData
  createdAt: Date
  updatedAt: Date
}

export const useOrderStore = defineStore('orders', () => {
  const orders = ref([])
  const loading = ref(false)
  const error = ref(null)
  const currentOrder = ref(null)
  
  const pendingOrders = computed(() => 
    orders.value.filter(order => order.status === 'pending')
  )
  
  const completedOrders = computed(() => 
    orders.value.filter(order => order.status === 'completed')
  )
  
  const totalRevenue = computed(() => 
    completedOrders.value.reduce((sum, order) => sum + order.total, 0)
  )
  
  const fetchOrders = async () => { /* API call */ }
  const createOrder = async (orderData) => { /* API call */ }
  const updateOrderStatus = async (id, status) => { /* API call */ }
  const deleteOrder = async (id) => { /* API call */ }
  
  return {
    orders,
    loading,
    error,
    currentOrder,
    pendingOrders,
    completedOrders,
    totalRevenue,
    fetchOrders,
    createOrder,
    updateOrderStatus,
    deleteOrder
  }
})
```

### UI Store (for global UI state)
```typescript
// src/stores/ui.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const theme = ref('light') // 'light' | 'dark'
  const sidebarCollapsed = ref(false)
  const notifications = ref([])
  const globalLoading = ref(false)
  
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }
  
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
  
  const addNotification = (notification) => {
    notifications.value.push({
      id: Date.now(),
      ...notification
    })
  }
  
  const removeNotification = (id) => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }
  
  const setGlobalLoading = (loading) => {
    globalLoading.value = loading
  }
  
  return {
    theme,
    sidebarCollapsed,
    notifications,
    globalLoading,
    toggleTheme,
    toggleSidebar,
    addNotification,
    removeNotification,
    setGlobalLoading
  }
})
```

### Auth Store (if needed)
```typescript
// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role)
  
  const login = async (credentials) => { /* API call */ }
  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }
  const refreshToken = async () => { /* API call */ }
  
  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    userRole,
    login,
    logout,
    refreshToken
  }
})
```

## Recommended Composables

### useApi.js
```typescript
// src/composables/useApi.js
import { ref } from 'vue'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const useApi = () => {
  const loading = ref(false)
  const error = ref(null)
  
  const request = async (apiCall) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiCall()
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  return {
    api,
    loading,
    error,
    request
  }
}
```

### useNotifications.js
```typescript
// src/composables/useNotifications.js
import { useUIStore } from '@/stores/ui'

export const useNotifications = () => {
  const uiStore = useUIStore()
  
  const success = (message, options = {}) => {
    uiStore.addNotification({
      type: 'success',
      message,
      duration: options.duration || 3000,
      ...options
    })
  }
  
  const error = (message, options = {}) => {
    uiStore.addNotification({
      type: 'error',
      message,
      duration: options.duration || 5000,
      ...options
    })
  }
  
  const warning = (message, options = {}) => {
    uiStore.addNotification({
      type: 'warning',
      message,
      duration: options.duration || 4000,
      ...options
    })
  }
  
  const info = (message, options = {}) => {
    uiStore.addNotification({
      type: 'info',
      message,
      duration: options.duration || 3000,
      ...options
    })
  }
  
  return { success, error, warning, info }
}
```

### useValidation.js
```typescript
// src/composables/useValidation.js
import { ref } from 'vue'

export const useValidation = () => {
  const errors = ref({})
  
  const validateProduct = (product) => {
    const newErrors = {}
    
    if (!product.name?.trim()) {
      newErrors.name = 'Product name is required'
    }
    
    if (!product.price || product.price <= 0) {
      newErrors.price = 'Price must be greater than 0'
    }
    
    if (!product.category?.trim()) {
      newErrors.category = 'Category is required'
    }
    
    if (product.stock !== undefined && product.stock < 0) {
      newErrors.stock = 'Stock cannot be negative'
    }
    
    errors.value = newErrors
    return Object.keys(newErrors).length === 0
  }
  
  const validateBulkProducts = (products) => {
    const results = []
    
    products.forEach((product, index) => {
      const productErrors = {}
      
      if (!product.name?.trim()) {
        productErrors.name = 'Product name is required'
      }
      
      if (!product.price || product.price <= 0) {
        productErrors.price = 'Price must be greater than 0'
      }
      
      if (!product.category?.trim()) {
        productErrors.category = 'Category is required'
      }
      
      if (product.stock < 0) {
        productErrors.stock = 'Stock cannot be negative'
      }
      
      results.push({
        index,
        isValid: Object.keys(productErrors).length === 0,
        errors: productErrors
      })
    })
    
    return results
  }
  
  const clearErrors = () => {
    errors.value = {}
  }
  
  return {
    errors,
    validateProduct,
    validateBulkProducts,
    clearErrors
  }
}
```

### usePagination.js
```typescript
// src/composables/usePagination.js
import { ref, computed } from 'vue'

export const usePagination = (items, itemsPerPage = 10) => {
  const currentPage = ref(1)
  const pageSize = ref(itemsPerPage)
  
  const totalPages = computed(() => 
    Math.ceil(items.value.length / pageSize.value)
  )
  
  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return items.value.slice(start, end)
  })
  
  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }
  
  const previousPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }
  
  const goToPage = (page) => {
    currentPage.value = Math.max(1, Math.min(page, totalPages.value))
  }
  
  const setPageSize = (size) => {
    pageSize.value = size
    currentPage.value = 1
  }
  
  return {
    currentPage,
    pageSize,
    totalPages,
    paginatedItems,
    nextPage,
    previousPage,
    goToPage,
    setPageSize
  }
}
```

## Recommended Utils

### api.js
```typescript
// src/utils/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default api
```

### formatters.js
```typescript
// src/utils/formatters.js
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

export const formatDate = (date, options = {}) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }).format(new Date(date))
}

export const formatNumber = (number, decimals = 0) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number)
}

export const formatPercentage = (value, decimals = 1) => {
  return `${(value * 100).toFixed(decimals)}%`
}
```

### constants.js
```typescript
// src/utils/constants.js
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft'
}

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
}

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please correct the errors and try again.',
  SERVER_ERROR: 'Something went wrong. Please try again later.'
}

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

export const PAGINATION_OPTIONS = {
  PAGE_SIZES: [10, 25, 50, 100],
  DEFAULT_PAGE_SIZE: 10
}

export const VALIDATION_RULES = {
  MIN_PRODUCT_NAME_LENGTH: 3,
  MAX_PRODUCT_NAME_LENGTH: 100,
  MIN_STOCK: 0,
  MAX_STOCK: 999999,
  MIN_PRICE: 0.01,
  MAX_PRICE: 999999.99
}
```

### validators.js
```typescript
// src/utils/validators.js
import { VALIDATION_RULES } from './constants.js'

export const isRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== ''
}

export const isNumeric = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value)
}

export const isPositive = (value) => {
  return isNumeric(value) && parseFloat(value) > 0
}

export const isNonNegative = (value) => {
  return isNumeric(value) && parseFloat(value) >= 0
}

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

export const validateProductName = (name) => {
  if (!isRequired(name)) return 'Product name is required'
  if (name.length < VALIDATION_RULES.MIN_PRODUCT_NAME_LENGTH) {
    return `Product name must be at least ${VALIDATION_RULES.MIN_PRODUCT_NAME_LENGTH} characters`
  }
  if (name.length > VALIDATION_RULES.MAX_PRODUCT_NAME_LENGTH) {
    return `Product name must not exceed ${VALIDATION_RULES.MAX_PRODUCT_NAME_LENGTH} characters`
  }
  return null
}

export const validatePrice = (price) => {
  if (!isRequired(price)) return 'Price is required'
  if (!isNumeric(price)) return 'Price must be a valid number'
  if (!isPositive(price)) return 'Price must be greater than 0'
  if (parseFloat(price) > VALIDATION_RULES.MAX_PRICE) {
    return `Price must not exceed ${VALIDATION_RULES.MAX_PRICE}`
  }
  return null
}

export const validateStock = (stock) => {
  if (stock === '' || stock === null || stock === undefined) return null // Stock is optional
  if (!isNumeric(stock)) return 'Stock must be a valid number'
  if (!isNonNegative(stock)) return 'Stock cannot be negative'
  if (parseInt(stock) > VALIDATION_RULES.MAX_STOCK) {
    return `Stock must not exceed ${VALIDATION_RULES.MAX_STOCK}`
  }
  return null
}
```

## Dependencies to Add

```json
{
  "pinia": "^2.1.7",
  "axios": "^1.6.0"
}
```

## File Structure
```
src/
├── stores/
│   ├── products.js
│   ├── categories.js
│   ├── orders.js
│   ├── ui.js
│   └── auth.js
├── composables/
│   ├── useApi.js
│   ├── useNotifications.js
│   ├── useValidation.js
│   └── usePagination.js
├── utils/
│   ├── api.js
│   ├── formatters.js
│   ├── constants.js
│   └── validators.js
```

## Installation Steps

1. Install dependencies:
```bash
npm install pinia axios
```

2. Set up Pinia in main.js:
```javascript
// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
```

3. Create environment variables:
```bash
# .env
VITE_API_URL=http://localhost:3000/api
```

This comprehensive setup will provide your Vue dashboard with proper state management, reusable composables, and utility functions that will scale with your application.
