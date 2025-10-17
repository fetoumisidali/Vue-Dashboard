# Authentication System Guide

## Overview
This guide covers implementing a comprehensive authentication system for your Vue dashboard application, including login, registration, token management, role-based access control, and security best practices.

## Authentication Architecture

### 1. JWT Token Strategy
```javascript
// src/utils/auth.js
import jwtDecode from 'jwt-decode'

export class AuthManager {
  constructor() {
    this.tokenKey = 'auth_token'
    this.refreshTokenKey = 'refresh_token'
    this.userKey = 'user_data'
  }

  // Token management
  setToken(token) {
    localStorage.setItem(this.tokenKey, token)
    this.scheduleTokenRefresh()
  }

  getToken() {
    return localStorage.getItem(this.tokenKey)
  }

  removeToken() {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.refreshTokenKey)
    localStorage.removeItem(this.userKey)
    this.clearTokenRefresh()
  }

  // Refresh token management
  setRefreshToken(token) {
    localStorage.setItem(this.refreshTokenKey, token)
  }

  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey)
  }

  // User data management
  setUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user))
  }

  getUser() {
    const userData = localStorage.getItem(this.userKey)
    return userData ? JSON.parse(userData) : null
  }

  // JWT utilities
  isTokenValid() {
    const token = this.getToken()
    if (!token) return false

    try {
      const decoded = jwtDecode(token)
      return decoded.exp * 1000 > Date.now()
    } catch (err) {
      return false
    }
  }

  getTokenPayload() {
    const token = this.getToken()
    if (!token) return null

    try {
      return jwtDecode(token)
    } catch (err) {
      return null
    }
  }

  // Role-based access
  hasRole(role) {
    const user = this.getUser()
    return user?.roles?.includes(role) || user?.role === role
  }

  hasPermission(permission) {
    const user = this.getUser()
    return user?.permissions?.includes(permission) || this.hasRole('admin')
  }

  // Token refresh scheduling
  scheduleTokenRefresh() {
    this.clearTokenRefresh()
    
    const payload = this.getTokenPayload()
    if (!payload) return

    const expiresAt = payload.exp * 1000
    const refreshAt = expiresAt - (5 * 60 * 1000) // 5 minutes before expiry
    const timeUntilRefresh = refreshAt - Date.now()

    if (timeUntilRefresh > 0) {
      this.refreshTimeout = setTimeout(() => {
        this.refreshToken()
      }, timeUntilRefresh)
    }
  }

  clearTokenRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout)
      this.refreshTimeout = null
    }
  }

  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      this.setToken(data.token)
      
      if (data.refreshToken) {
        this.setRefreshToken(data.refreshToken)
      }

      return data.token
    } catch (err) {
      console.error('Token refresh failed:', err)
      this.removeToken()
      window.location.href = '/login'
      throw err
    }
  }
}

export const authManager = new AuthManager()
```

### 2. Authentication Store
```javascript
// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authManager } from '@/utils/auth.js'
import authService from '@/services/auth.js'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const isAuthenticated = computed(() => {
    return !!token.value && authManager.isTokenValid()
  })

  const userPermissions = computed(() => {
    return user.value?.permissions || []
  })

  const userRoles = computed(() => {
    return user.value?.roles || []
  })

  const isAdmin = computed(() => {
    return userRoles.value.includes('admin')
  })

  const canAccessProducts = computed(() => {
    return hasPermission('products:read') || isAdmin.value
  })

  const canCreateProducts = computed(() => {
    return hasPermission('products:create') || isAdmin.value
  })

  const canAccessOrders = computed(() => {
    return hasPermission('orders:read') || isAdmin.value
  })

  const canAccessUsers = computed(() => {
    return hasPermission('users:read') || isAdmin.value
  })

  // Actions
  const initializeAuth = () => {
    const token = authManager.getToken()
    const userData = authManager.getUser()

    if (token && authManager.isTokenValid()) {
      token.value = token
      user.value = userData
      return true
    } else {
      logout()
      return false
    }
  }

  const login = async (credentials) => {
    loading.value = true
    error.value = null

    try {
      const response = await authService.login(credentials)
      const { token: accessToken, refreshToken, user: userData } = response.data

      // Store in auth manager
      authManager.setToken(accessToken)
      if (refreshToken) {
        authManager.setRefreshToken(refreshToken)
      }
      authManager.setUser(userData)

      // Update store state
      token.value = accessToken
      user.value = userData

      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const register = async (userData) => {
    loading.value = true
    error.value = null

    try {
      const response = await authService.register(userData)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      // Call logout endpoint to invalidate refresh token
      if (token.value) {
        await authService.logout()
      }
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      // Clear local storage regardless of API call success
      authManager.removeToken()
      
      // Reset store state
      token.value = null
      user.value = null
      loading.value = false
      error.value = null
    }
  }

  const refreshToken = async () => {
    try {
      const newToken = await authManager.refreshToken()
      token.value = newToken
      return newToken
    } catch (err) {
      await logout()
      throw err
    }
  }

  const updateProfile = async (profileData) => {
    loading.value = true
    error.value = null

    try {
      const response = await authService.updateProfile(profileData)
      user.value = { ...user.value, ...response.data }
      authManager.setUser(user.value)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const changePassword = async (passwordData) => {
    loading.value = true
    error.value = null

    try {
      const response = await authService.changePassword(passwordData)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const hasPermission = (permission) => {
    return userPermissions.value.includes(permission) || isAdmin.value
  }

  const hasRole = (role) => {
    return userRoles.value.includes(role)
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    // Getters
    isAuthenticated,
    userPermissions,
    userRoles,
    isAdmin,
    canAccessProducts,
    canCreateProducts,
    canAccessOrders,
    canAccessUsers,
    // Actions
    initializeAuth,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    hasPermission,
    hasRole
  }
})
```

### 3. Authentication Service
```javascript
// src/services/auth.js
import api from '@/utils/api.js'

class AuthService {
  async login(credentials) {
    const response = await api.post('/auth/login', credentials)
    return response.data
  }

  async register(userData) {
    const response = await api.post('/auth/register', userData)
    return response.data
  }

  async logout() {
    await api.post('/auth/logout')
  }

  async refreshToken(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  }

  async verifyEmail(token) {
    const response = await api.post('/auth/verify-email', { token })
    return response.data
  }

  async resendVerificationEmail(email) {
    const response = await api.post('/auth/resend-verification', { email })
    return response.data
  }

  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  }

  async resetPassword(token, password) {
    const response = await api.post('/auth/reset-password', { token, password })
    return response.data
  }

  async changePassword(passwordData) {
    const response = await api.post('/auth/change-password', passwordData)
    return response.data
  }

  async updateProfile(profileData) {
    const response = await api.put('/auth/profile', profileData)
    return response.data
  }

  async getProfile() {
    const response = await api.get('/auth/profile')
    return response.data
  }

  async deleteAccount(password) {
    const response = await api.delete('/auth/account', { data: { password } })
    return response.data
  }

  async getTwoFactorSecret() {
    const response = await api.get('/auth/2fa/secret')
    return response.data
  }

  async enableTwoFactor(token) {
    const response = await api.post('/auth/2fa/enable', { token })
    return response.data
  }

  async disableTwoFactor(password) {
    const response = await api.post('/auth/2fa/disable', { password })
    return response.data
  }

  async verifyTwoFactor(token) {
    const response = await api.post('/auth/2fa/verify', { token })
    return response.data
  }
}

export default new AuthService()
```

## Authentication Components

### 1. Login Component
```vue
<!-- src/components/Auth/LoginForm.vue -->
<template>
  <form @submit.prevent="handleSubmit" novalidate>
    <div class="space-y-6">
      <!-- Email Field -->
      <FormInput
        v-model="form.email"
        name="email"
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        required
        :error="validationErrors.email"
        autocomplete="email"
      >
        <template #prefix>
          <Mail class="w-4 h-4" />
        </template>
      </FormInput>

      <!-- Password Field -->
      <FormInput
        v-model="form.password"
        name="password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        placeholder="Enter your password"
        required
        :error="validationErrors.password"
        autocomplete="current-password"
      >
        <template #prefix>
          <Lock class="w-4 h-4" />
        </template>
        <template #suffix>
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="text-gray-400 hover:text-gray-600"
          >
            <Eye v-if="!showPassword" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </template>
      </FormInput>

      <!-- Remember Me & Forgot Password -->
      <div class="flex items-center justify-between">
        <label class="flex items-center">
          <input
            v-model="form.remember"
            type="checkbox"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span class="ml-2 text-sm text-gray-600">Remember me</span>
        </label>

        <router-link
          to="/forgot-password"
          class="text-sm text-blue-600 hover:text-blue-500"
        >
          Forgot password?
        </router-link>
      </div>

      <!-- Two-Factor Authentication -->
      <div v-if="requireTwoFactor" class="space-y-4 border-t pt-6">
        <FormInput
          v-model="form.twoFactorCode"
          name="twoFactorCode"
          label="Two-Factor Authentication Code"
          placeholder="Enter 6-digit code"
          maxlength="6"
          required
          :error="validationErrors.twoFactorCode"
          autocomplete="one-time-code"
        >
          <template #prefix>
            <Key class="w-4 h-4" />
          </template>
        </FormInput>
      </div>

      <!-- Submit Button -->
      <Button
        type="submit"
        :loading="loading"
        :disabled="!isFormValid"
        class="w-full"
      >
        {{ requireTwoFactor ? 'Verify' : 'Sign In' }}
      </Button>

      <!-- Register Link -->
      <p class="text-center text-sm text-gray-600">
        Don't have an account?
        <router-link
          to="/register"
          class="text-blue-600 hover:text-blue-500 font-medium"
        >
          Sign up
        </router-link>
      </p>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock, Eye, EyeOff, Key } from 'lucide-vue-next'
import FormInput from '../Form/FormInput.vue'
import Button from '../UI/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotifications } from '@/composables/useNotifications'
import { validateForm } from '@/composables/useValidation'
import { loginValidationSchema } from '@/validation/schemas'

const router = useRouter()
const authStore = useAuthStore()
const { success, error } = useNotifications()

const form = reactive({
  email: '',
  password: '',
  remember: false,
  twoFactorCode: ''
})

const validationErrors = ref({})
const showPassword = ref(false)
const requireTwoFactor = ref(false)

const loading = computed(() => authStore.loading)

const isFormValid = computed(() => {
  const schema = requireTwoFactor.value 
    ? { ...loginValidationSchema, twoFactorCode: [{ type: 'required' }] }
    : loginValidationSchema
  
  return validateForm(form, schema)
})

const handleSubmit = async () => {
  const schema = requireTwoFactor.value 
    ? { ...loginValidationSchema, twoFactorCode: [{ type: 'required' }] }
    : loginValidationSchema

  const isValid = validateForm(form, schema)
  if (!isValid) return

  try {
    await authStore.login({
      email: form.email,
      password: form.password,
      remember: form.remember,
      twoFactorCode: form.twoFactorCode
    })

    success('Welcome back!')
    router.push('/')
  } catch (err) {
    if (err.response?.status === 401 && err.response?.data?.requireTwoFactor) {
      requireTwoFactor.value = true
    } else {
      error(err.message || 'Login failed')
    }
  }
}
</script>
```

### 2. Registration Component
```vue
<!-- src/components/Auth/RegisterForm.vue -->
<template>
  <form @submit.prevent="handleSubmit" novalidate>
    <div class="space-y-6">
      <!-- Name Field -->
      <FormInput
        v-model="form.name"
        name="name"
        label="Full Name"
        placeholder="Enter your full name"
        required
        :error="validationErrors.name"
        autocomplete="name"
      />

      <!-- Email Field -->
      <FormInput
        v-model="form.email"
        name="email"
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        required
        :error="validationErrors.email"
        autocomplete="email"
      />

      <!-- Password Field -->
      <FormInput
        v-model="form.password"
        name="password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        placeholder="Create a password"
        required
        :error="validationErrors.password"
        autocomplete="new-password"
      >
        <template #suffix>
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="text-gray-400 hover:text-gray-600"
          >
            <Eye v-if="!showPassword" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </template>
      </FormInput>

      <!-- Confirm Password Field -->
      <FormInput
        v-model="form.confirmPassword"
        name="confirmPassword"
        label="Confirm Password"
        :type="showConfirmPassword ? 'text' : 'password'"
        placeholder="Confirm your password"
        required
        :error="validationErrors.confirmPassword"
        autocomplete="new-password"
      >
        <template #suffix>
          <button
            type="button"
            @click="showConfirmPassword = !showConfirmPassword"
            class="text-gray-400 hover:text-gray-600"
          >
            <Eye v-if="!showConfirmPassword" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </template>
      </FormInput>

      <!-- Terms and Conditions -->
      <div>
        <label class="flex items-start">
          <input
            v-model="form.acceptTerms"
            type="checkbox"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
          />
          <span class="ml-2 text-sm text-gray-600">
            I agree to the
            <router-link to="/terms" class="text-blue-600 hover:text-blue-500">
              Terms of Service
            </router-link>
            and
            <router-link to="/privacy" class="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </router-link>
          </span>
        </label>
        <p v-if="validationErrors.acceptTerms" class="mt-1 text-sm text-red-600">
          {{ validationErrors.acceptTerms }}
        </p>
      </div>

      <!-- Submit Button -->
      <Button
        type="submit"
        :loading="loading"
        :disabled="!isFormValid"
        class="w-full"
      >
        Create Account
      </Button>

      <!-- Login Link -->
      <p class="text-center text-sm text-gray-600">
        Already have an account?
        <router-link
          to="/login"
          class="text-blue-600 hover:text-blue-500 font-medium"
        >
          Sign in
        </router-link>
      </p>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff } from 'lucide-vue-next'
import FormInput from '../Form/FormInput.vue'
import Button from '../UI/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotifications } from '@/composables/useNotifications'

const router = useRouter()
const authStore = useAuthStore()
const { success, error } = useNotifications()

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

const validationErrors = ref({})
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const loading = computed(() => authStore.loading)

const isFormValid = computed(() => {
  const errors = {}

  if (!form.name.trim()) {
    errors.name = 'Name is required'
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Invalid email format'
  }

  if (!form.password) {
    errors.password = 'Password is required'
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  if (!form.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms and conditions'
  }

  validationErrors.value = errors
  return Object.keys(errors).length === 0
})

const handleSubmit = async () => {
  if (!isFormValid.value) return

  try {
    await authStore.register({
      name: form.name,
      email: form.email,
      password: form.password
    })

    success('Account created successfully! Please check your email to verify your account.')
    router.push('/login')
  } catch (err) {
    error(err.message || 'Registration failed')
  }
}
</script>
```

### 3. Protected Route Component
```vue
<!-- src/components/Auth/ProtectedRoute.vue -->
<template>
  <slot v-if="isAuthorized" />
  <div v-else-if="loading" class="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
  <div v-else class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <Lock class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p class="text-gray-600 mb-4">
        You don't have permission to access this page.
      </p>
      <Button @click="goBack">Go Back</Button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '../UI/LoadingSpinner.vue'
import Button from '../UI/Button.vue'
import { Lock } from 'lucide-vue-next'

const props = defineProps({
  requiredRole: {
    type: String,
    default: null
  },
  requiredPermission: {
    type: String,
    default: null
  },
  requireAuth: {
    type: Boolean,
    default: true
  }
})

const router = useRouter()
const authStore = useAuthStore()

const loading = computed(() => authStore.loading)
const isAuthenticated = computed(() => authStore.isAuthenticated)

const isAuthorized = computed(() => {
  if (!props.requireAuth) return true

  if (!isAuthenticated.value) return false

  if (props.requiredRole && !authStore.hasRole(props.requiredRole)) {
    return false
  }

  if (props.requiredPermission && !authStore.hasPermission(props.requiredPermission)) {
    return false
  }

  return true
})

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}

onMounted(() => {
  if (!authStore.initializeAuth()) {
    router.push('/login')
  }
})
</script>
```

## Route Guards and Navigation

### 1. Authentication Guards
```javascript
// src/router/guards.js
import { useAuthStore } from '@/stores/auth'

export const authGuard = (to, from, next) => {
  const authStore = useAuthStore()
  
  if (!authStore.isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  next()
}

export const guestGuard = (to, from, next) => {
  const authStore = useAuthStore()
  
  if (authStore.isAuthenticated) {
    next('/')
    return
  }
  
  next()
}

export const roleGuard = (requiredRole) => {
  return (to, from, next) => {
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }
    
    if (!authStore.hasRole(requiredRole)) {
      next('/403')
      return
    }
    
    next()
  }
}

export const permissionGuard = (requiredPermission) => {
  return (to, from, next) => {
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }
    
    if (!authStore.hasPermission(requiredPermission)) {
      next('/403')
      return
    }
    
    next()
  }
}
```

### 2. Updated Router Configuration
```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { authGuard, guestGuard, roleGuard, permissionGuard } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Auth/LoginView.vue'),
      meta: { title: 'Login' },
      beforeEnter: guestGuard
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/Auth/RegisterView.vue'),
      meta: { title: 'Register' },
      beforeEnter: guestGuard
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/Auth/ForgotPasswordView.vue'),
      meta: { title: 'Forgot Password' },
      beforeEnter: guestGuard
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/Auth/ResetPasswordView.vue'),
      meta: { title: 'Reset Password' },
      beforeEnter: guestGuard
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
          meta: { title: 'Dashboard' },
          beforeEnter: authGuard
        },
        {
          path: 'products',
          name: 'products',
          component: () => import('@/views/Product/ProductsView.vue'),
          meta: { title: 'Products' },
          beforeEnter: permissionGuard('products:read')
        },
        {
          path: 'products/create',
          name: 'create-product',
          component: () => import('@/views/Product/CreateProductView.vue'),
          meta: { title: 'Create Product' },
          beforeEnter: permissionGuard('products:create')
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/OrdersView.vue'),
          meta: { title: 'Orders' },
          beforeEnter: permissionGuard('orders:read')
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/User/UsersView.vue'),
          meta: { title: 'Users' },
          beforeEnter: roleGuard('admin')
        }
      ]
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/views/Error/ForbiddenView.vue'),
      meta: { title: 'Access Denied' }
    },
    {
      path: '/404',
      name: 'not-found',
      component: () => import('@/views/Error/NotFoundView.vue'),
      meta: { title: 'Page Not Found' }
    },
    {
      path: '/:catchAll(.*)',
      redirect: '/404'
    }
  ]
})

// Global route guard
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Dashboard'
  
  // Check if route requires authentication
  if (to.meta.requiresAuth || to.matched.some(record => record.meta.requiresAuth)) {
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated && !authStore.initializeAuth()) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }
  }
  
  next()
})

export default router
```

## Security Best Practices

### 1. Security Headers
```javascript
// src/utils/security.js
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

export const applySecurityHeaders = () => {
  if (typeof window !== 'undefined') {
    Object.entries(securityHeaders).forEach(([header, value]) => {
      document.querySelector('meta[http-equiv="' + header + '"]') || 
        document.head.insertAdjacentHTML('beforeend', 
          `<meta http-equiv="${header}" content="${value}">`
        )
    })
  }
}
```

### 2. Rate Limiting
```javascript
// src/utils/rateLimiter.js
class RateLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.requests = new Map()
  }

  isAllowed(key) {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    if (!this.requests.has(key)) {
      this.requests.set(key, [])
    }
    
    const userRequests = this.requests.get(key)
    
    // Remove old requests
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart)
    this.requests.set(key, validRequests)
    
    // Check if limit exceeded
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    // Add current request
    validRequests.push(now)
    return true
  }

  getRemainingRequests(key) {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    if (!this.requests.has(key)) {
      return this.maxRequests
    }
    
    const userRequests = this.requests.get(key)
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart)
    
    return Math.max(0, this.maxRequests - validRequests.length)
  }

  getResetTime(key) {
    if (!this.requests.has(key)) {
      return 0
    }
    
    const userRequests = this.requests.get(key)
    const oldestRequest = Math.min(...userRequests)
    return oldestRequest + this.windowMs
  }
}

export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000) // 5 attempts per 15 minutes
export const passwordResetRateLimiter = new RateLimiter(3, 60 * 60 * 1000) // 3 attempts per hour
```

### 3. Session Management
```javascript
// src/utils/session.js
import { ref } from 'vue'
import { authManager } from './auth.js'

class SessionManager {
  constructor() {
    this.activityTimer = null
    this.warningTimer = null
    this.sessionTimeout = 30 * 60 * 1000 // 30 minutes
    this.warningTimeout = 5 * 60 * 1000 // 5 minutes before expiry
    this.isSessionActive = ref(true)
  }

  startSession() {
    this.resetTimer()
    this.setupActivityListeners()
  }

  resetTimer() {
    this.clearTimers()
    
    // Show warning before session expires
    this.warningTimer = setTimeout(() => {
      this.showSessionWarning()
    }, this.sessionTimeout - this.warningTimeout)
    
    // End session
    this.activityTimer = setTimeout(() => {
      this.endSession()
    }, this.sessionTimeout)
  }

  clearTimers() {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer)
      this.activityTimer = null
    }
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer)
      this.warningTimer = null
    }
  }

  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    const resetSession = () => {
      if (this.isSessionActive.value) {
        this.resetTimer()
      }
    }
    
    events.forEach(event => {
      document.addEventListener(event, resetSession, true)
    })
  }

  showSessionWarning() {
    // Show modal warning user about session expiry
    this.isSessionActive.value = false
    
    if (confirm('Your session will expire in 5 minutes. Would you like to extend it?')) {
      this.extendSession()
    }
  }

  extendSession() {
    this.isSessionActive.value = true
    this.resetTimer()
    
    // Optionally refresh token
    authManager.refreshToken().catch(err => {
      console.error('Failed to refresh token:', err)
      this.endSession()
    })
  }

  endSession() {
    this.clearTimers()
    authManager.removeToken()
    window.location.href = '/login?reason=timeout'
  }

  end() {
    this.clearTimers()
    this.isSessionActive.value = true
  }
}

export const sessionManager = new SessionManager()
```

This comprehensive authentication system provides secure user management, role-based access control, and session security for your Vue dashboard application.
