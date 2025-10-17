# Notification System Guide

## Overview
This guide covers implementing a comprehensive notification system for your Vue dashboard application, including toast notifications, inline alerts, confirmation dialogs, and real-time notifications.

## Notification Architecture

### 1. Notification Store
```javascript
// src/stores/notifications.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useNotificationStore = defineStore('notifications', () => {
  // State
  const notifications = ref([])
  const maxNotifications = ref(5)
  const defaultDuration = ref(5000)

  // Getters
  const activeNotifications = computed(() => 
    notifications.value.filter(n => !n.dismissed)
  )

  const hasUnreadNotifications = computed(() => 
    notifications.value.some(n => !n.read)
  )

  const unreadCount = computed(() => 
    notifications.value.filter(n => !n.read).length
  )

  // Actions
  const addNotification = (notification) => {
    const id = Date.now().toString()
    const newNotification = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: defaultDuration.value,
      dismissible: true,
      autoHide: true,
      read: false,
      dismissed: false,
      timestamp: Date.now(),
      ...notification
    }

    // Remove oldest notifications if exceeding max
    if (activeNotifications.value.length >= maxNotifications.value) {
      const oldest = activeNotifications.value[0]
      removeNotification(oldest.id)
    }

    notifications.value.push(newNotification)

    // Auto-hide notification
    if (newNotification.autoHide && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  const dismissNotification = (id) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.dismissed = true
      setTimeout(() => {
        removeNotification(id)
      }, 300) // Allow time for exit animation
    }
  }

  const markAsRead = (id) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  const markAllAsRead = () => {
    notifications.value.forEach(n => n.read = true)
  }

  const clearAllNotifications = () => {
    notifications.value = []
  }

  const updateNotification = (id, updates) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      Object.assign(notification, updates)
    }
  }

  // Convenience methods for common notification types
  const success = (title, message, options = {}) => {
    return addNotification({
      type: 'success',
      title,
      message,
      icon: 'check-circle',
      ...options
    })
  }

  const error = (title, message, options = {}) => {
    return addNotification({
      type: 'error',
      title,
      message,
      icon: 'alert-circle',
      duration: 0, // Don't auto-hide errors
      ...options
    })
  }

  const warning = (title, message, options = {}) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      icon: 'alert-triangle',
      ...options
    })
  }

  const info = (title, message, options = {}) => {
    return addNotification({
      type: 'info',
      title,
      message,
      icon: 'info',
      ...options
    })
  }

  return {
    // State
    notifications,
    maxNotifications,
    defaultDuration,
    // Getters
    activeNotifications,
    hasUnreadNotifications,
    unreadCount,
    // Actions
    addNotification,
    removeNotification,
    dismissNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    updateNotification,
    // Convenience methods
    success,
    error,
    warning,
    info
  }
})
```

### 2. Notification Composable
```typescript
// src/composables/useNotifications.js
import { useNotificationStore } from '@/stores/notifications.js'

export const useNotifications = () => {
  const notificationStore = useNotificationStore()

  const notify = (notification) => {
    return notificationStore.addNotification(notification)
  }

  const success = (title, message, options = {}) => {
    return notificationStore.success(title, message, options)
  }

  const error = (title, message, options = {}) => {
    return notificationStore.error(title, message, options)
  }

  const warning = (title, message, options = {}) => {
    return notificationStore.warning(title, message, options)
  }

  const info = (title, message, options = {}) => {
    return notificationStore.info(title, message, options)
  }

  // Async notification helper
  const asyncNotify = async (promise, options = {}) => {
    const {
      loadingMessage = 'Processing...',
      successMessage = 'Operation completed successfully',
      errorMessage = 'Operation failed'
    } = options

    const loadingId = info('', loadingMessage, { 
      duration: 0,
      dismissible: false 
    })

    try {
      const result = await promise
      removeNotification(loadingId)
      success('', successMessage)
      return result
    } catch (err) {
      removeNotification(loadingId)
      error('', errorMessage)
      throw err
    }
  }

  const removeNotification = (id) => {
    notificationStore.removeNotification(id)
  }

  const dismissNotification = (id) => {
    notificationStore.dismissNotification(id)
  }

  const clearAll = () => {
    notificationStore.clearAllNotifications()
  }

  return {
    // Store reference
    notificationStore,
    // Notification methods
    notify,
    success,
    error,
    warning,
    info,
    asyncNotify,
    // Management methods
    removeNotification,
    dismissNotification,
    clearAll
  }
}
```

## Notification Components

### 1. Toast Container
```vue
<!-- src/components/Notification/ToastContainer.vue -->
<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      <TransitionGroup
        name="toast"
        tag="div"
        class="space-y-2"
      >
        <Toast
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @dismiss="handleDismiss"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useNotificationStore } from '@/stores/notifications.js'
import Toast from './Toast.vue'

const notificationStore = useNotificationStore()

const notifications = computed(() => 
  notificationStore.activeNotifications.slice(-5) // Show max 5 most recent
)

const handleDismiss = (id) => {
  notificationStore.dismissNotification(id)
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
```

### 2. Individual Toast Component
```vue
<!-- src/components/Notification/Toast.vue -->
<template>
  <div
    :class="toastClasses"
    role="alert"
    aria-live="polite"
  >
    <!-- Icon -->
    <div class="flex-shrink-0">
      <component :is="iconComponent" :class="iconClasses" />
    </div>

    <!-- Content -->
    <div class="ml-3 flex-1">
      <h4 v-if="notification.title" class="text-sm font-medium">
        {{ notification.title }}
      </h4>
      <p class="text-sm" :class="notification.title ? 'mt-1' : ''">
        {{ notification.message }}
      </p>
      
      <!-- Actions -->
      <div v-if="notification.actions" class="mt-3 flex gap-2">
        <Button
          v-for="action in notification.actions"
          :key="action.label"
          :variant="action.variant || 'ghost'"
          size="sm"
          @click="handleAction(action)"
        >
          {{ action.label }}
        </Button>
      </div>
    </div>

    <!-- Close button -->
    <button
      v-if="notification.dismissible"
      @click="dismiss"
      class="ml-4 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2"
    >
      <X class="w-4 h-4" />
    </button>

    <!-- Progress bar (for timed notifications) -->
    <div
      v-if="notification.duration > 0 && notification.autoHide"
      class="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all duration-100"
      :style="{ width: `${progressWidth}%` }"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  X 
} from 'lucide-vue-next'
import Button from '../UI/Button.vue'

const props = defineProps({
  notification: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['dismiss'])

const progressWidth = ref(100)
const progressInterval = ref(null)

const typeStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
}

const iconStyles = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400'
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const toastClasses = computed(() => [
  'relative p-4 rounded-lg border shadow-lg max-w-sm',
  typeStyles[props.notification.type] || typeStyles.info,
  props.notification.dismissible ? 'pr-12' : ''
])

const iconClasses = computed(() => [
  'w-5 h-5',
  iconStyles[props.notification.type] || iconStyles.info
])

const iconComponent = computed(() => 
  icons[props.notification.type] || icons.info
)

const dismiss = () => {
  emit('dismiss', props.notification.id)
}

const handleAction = (action) => {
  if (action.handler) {
    action.handler()
  }
  
  if (action.dismissOnClick !== false) {
    dismiss()
  }
}

// Progress bar animation
const startProgress = () => {
  if (props.notification.duration > 0 && props.notification.autoHide) {
    const interval = 50 // Update every 50ms
    const decrement = (interval / props.notification.duration) * 100
    
    progressInterval.value = setInterval(() => {
      progressWidth.value = Math.max(0, progressWidth.value - decrement)
      
      if (progressWidth.value <= 0) {
        dismiss()
      }
    }, interval)
  }
}

const stopProgress = () => {
  if (progressInterval.value) {
    clearInterval(progressInterval.value)
    progressInterval.value = null
  }
}

onMounted(() => {
  startProgress()
})

onUnmounted(() => {
  stopProgress()
})
</script>
```

### 3. Alert Component
```vue
<!-- src/components/Notification/Alert.vue -->
<template>
  <div :class="alertClasses" role="alert">
    <!-- Icon -->
    <div class="flex-shrink-0">
      <component :is="iconComponent" :class="iconClasses" />
    </div>

    <!-- Content -->
    <div class="ml-3 flex-1">
      <h3 v-if="title" class="text-sm font-medium">
        {{ title }}
      </h3>
      <div class="text-sm" :class="{ 'mt-2': title }">
        <slot>
          {{ message }}
        </slot>
      </div>

      <!-- Actions -->
      <div v-if="showActions" class="mt-3">
        <div class="flex">
          <Button
            v-if="dismissible"
            @click="dismiss"
            variant="ghost"
            size="sm"
            class="text-current"
          >
            Dismiss
          </Button>
          <slot name="actions" />
        </div>
      </div>
    </div>

    <!-- Close button -->
    <button
      v-if="dismissible"
      @click="dismiss"
      class="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex hover:bg-gray-100 focus:outline-none"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  X 
} from 'lucide-vue-next'
import Button from '../UI/Button.vue'

const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  dismissible: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['dismiss'])

const typeStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
}

const iconStyles = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400'
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const alertClasses = computed(() => [
  'flex p-4 rounded-lg border',
  typeStyles[props.type]
])

const iconClasses = computed(() => [
  'w-5 h-5',
  iconStyles[props.type]
])

const iconComponent = computed(() => 
  icons[props.type]
)

const showActions = computed(() => 
  props.dismissible || !!slots.actions
)

const dismiss = () => {
  emit('dismiss')
}
</script>
```

### 4. Confirmation Dialog
```vue
<!-- src/components/Notification/ConfirmationDialog.vue -->
<template>
  <Modal
    :open="open"
    :title="title"
    size="sm"
    @close="cancel"
  >
    <div class="space-y-4">
      <!-- Icon -->
      <div class="flex justify-center">
        <div :class="iconContainerClasses">
          <component :is="iconComponent" :class="iconClasses" />
        </div>
      </div>

      <!-- Message -->
      <div class="text-center">
        <h3 class="text-lg font-medium text-gray-900">
          {{ title }}
        </h3>
        <p class="mt-2 text-sm text-gray-500">
          {{ message }}
        </p>
        
        <!-- Additional content -->
        <div v-if="$slots.content" class="mt-4">
          <slot name="content" />
        </div>
      </div>

      <!-- Warning details -->
      <div v-if="showWarning" class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <div class="flex">
          <AlertTriangle class="w-4 h-4 text-yellow-400 mt-0.5" />
          <p class="ml-2 text-sm text-yellow-800">
            {{ warningText }}
          </p>
        </div>
      </div>
      
      <!-- Confirmation input -->
      <div v-if="requireConfirmation" class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Type <span class="font-mono bg-gray-100 px-1 rounded">{{ confirmText }}</span> to confirm:
        </label>
        <FormInput
          v-model="confirmationInput"
          :placeholder="confirmText"
          @keydown.enter="confirm"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3 w-full">
        <Button
          @click="cancel"
          variant="secondary"
          class="flex-1"
        >
          {{ cancelText }}
        </Button>
        <Button
          @click="confirm"
          :variant="confirmVariant"
          :loading="loading"
          :disabled="requireConfirmation && !isConfirmed"
          class="flex-1"
        >
          {{ confirmText }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  AlertTriangle, 
  Trash2, 
  Archive, 
  Power,
  AlertCircle 
} from 'lucide-vue-next'
import Modal from '../UI/Modal.vue'
import Button from '../UI/Button.vue'
import FormInput from '../Form/FormInput.vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'danger',
    validator: (value) => ['danger', 'warning', 'info'].includes(value)
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  },
  confirmVariant: {
    type: String,
    default: 'danger'
  },
  loading: {
    type: Boolean,
    default: false
  },
  showWarning: {
    type: Boolean,
    default: false
  },
  warningText: {
    type: String,
    default: 'This action cannot be undone.'
  },
  requireConfirmation: {
    type: Boolean,
    default: false
  },
  confirmationValue: {
    type: String,
    default: 'DELETE'
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const confirmationInput = ref('')

const icons = {
  danger: Trash2,
  warning: AlertTriangle,
  info: AlertCircle
}

const iconComponent = computed(() => 
  icons[props.type] || icons.info
)

const iconContainerClasses = computed(() => {
  const base = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full'
  const typeClasses = {
    danger: 'bg-red-100',
    warning: 'bg-yellow-100',
    info: 'bg-blue-100'
  }
  return [base, typeClasses[props.type]].join(' ')
})

const iconClasses = computed(() => {
  const typeClasses = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  }
  return ['w-6 h-6', typeClasses[props.type]].join(' ')
})

const isConfirmed = computed(() => 
  confirmationInput.value === props.confirmationValue
)

const confirm = () => {
  if (props.requireConfirmation && !isConfirmed.value) {
    return
  }
  emit('confirm')
}

const cancel = () => {
  emit('cancel')
}

// Reset confirmation input when dialog opens/closes
watch(() => props.open, (newValue) => {
  if (newValue) {
    confirmationInput.value = ''
  }
})
</script>
```

## Real-time Notifications

### 1. WebSocket Integration
```javascript
// src/utils/websocket.js
import { useNotificationStore } from '@/stores/notifications.js'
import { useAuthStore } from '@/stores/auth.js'

class WebSocketManager {
  constructor() {
    this.socket = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.heartbeatInterval = null
    this.notificationStore = useNotificationStore()
    this.authStore = useAuthStore()
  }

  connect() {
    if (!this.authStore.isAuthenticated) {
      return
    }

    const token = this.authStore.token
    const wsUrl = `${import.meta.env.VITE_WS_URL}/notifications?token=${token}`

    try {
      this.socket = new WebSocket(wsUrl)
      this.setupEventListeners()
    } catch (err) {
      console.error('WebSocket connection failed:', err)
      this.scheduleReconnect()
    }
  }

  setupEventListeners() {
    this.socket.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.startHeartbeat()
    }

    this.socket.onmessage = (event) => {
      this.handleMessage(event)
    }

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason)
      this.stopHeartbeat()
      
      if (!event.wasClean && this.authStore.isAuthenticated) {
        this.scheduleReconnect()
      }
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'notification':
          this.handleRealtimeNotification(data.payload)
          break
        case 'system_update':
          this.handleSystemUpdate(data.payload)
          break
        case 'user_status':
          this.handleUserStatus(data.payload)
          break
        default:
          console.log('Unknown message type:', data.type)
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err)
    }
  }

  handleRealtimeNotification(notification) {
    this.notificationStore.addNotification({
      ...notification,
      read: false,
      timestamp: Date.now()
    })

    // Show system notification if permissions granted
    if ('Notification' in window && Notification.permission === 'granted') {
      this.showBrowserNotification(notification)
    }
  }

  handleSystemUpdate(update) {
    // Handle system updates (e.g., new features, maintenance)
    console.log('System update:', update)
  }

  handleUserStatus(status) {
    // Handle user status updates (e.g., online/offline)
    console.log('User status update:', status)
  }

  showBrowserNotification(notification) {
    const browserNotification = new Notification(notification.title || 'Notification', {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: !notification.autoHide
    })

    browserNotification.onclick = () => {
      window.focus()
      browserNotification.close()
    }

    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        browserNotification.close()
      }, notification.duration)
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Send ping every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
      
      setTimeout(() => {
        console.log(`Reconnecting WebSocket (attempt ${this.reconnectAttempts + 1})`)
        this.reconnectAttempts++
        this.connect()
      }, delay)
    } else {
      console.error('Max reconnect attempts reached')
    }
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }
}

export const websocketManager = new WebSocketManager()
```

### 2. Notification Hook Integration
```javascript
// src/hooks/useRealtimeNotifications.js
import { onMounted, onUnmounted } from 'vue'
import { websocketManager } from '@/utils/websocket.js'
import { useAuthStore } from '@/stores/auth.js'

export const useRealtimeNotifications = () => {
  const authStore = useAuthStore()

  onMounted(async () => {
    if (authStore.isAuthenticated) {
      // Request notification permission
      await websocketManager.requestNotificationPermission()
      
      // Connect WebSocket
      websocketManager.connect()
    }
  })

  onUnmounted(() => {
    websocketManager.disconnect()
  })

  return {
    isConnected: websocketManager.socket?.readyState === WebSocket.OPEN
  }
}
```

## Usage Examples

### 1. Basic Usage
```vue
<!-- Example Component -->
<template>
  <div>
    <Button @click="showSuccess">Show Success</Button>
    <Button @click="showError">Show Error</Button>
    <Button @click="showConfirmation">Show Confirmation</Button>
    
    <Alert
      v-if="showAlert"
      type="warning"
      title="Important Notice"
      message="This is a system alert that requires your attention."
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNotifications } from '@/composables/useNotifications.js'
import { useConfirmationDialog } from '@/composables/useConfirmationDialog.js'
import Button from '@/components/UI/Button.vue'
import Alert from '@/components/Notification/Alert.vue'

const { success, error, warning, info } = useNotifications()
const confirm = useConfirmationDialog()

const showAlert = ref(true)

const showSuccess = () => {
  success('Success!', 'Your changes have been saved successfully.')
}

const showError = () => {
  error('Error!', 'Failed to save your changes. Please try again.')
}

const showConfirmation = async () => {
  const result = await confirm({
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item?',
    type: 'danger',
    requireConfirmation: true,
    confirmationValue: 'DELETE'
  })

  if (result) {
    // Proceed with deletion
    success('Deleted', 'Item has been deleted successfully.')
  }
}
</script>
```

### 2. Confirmation Dialog Hook
```javascript
// src/composables/useConfirmationDialog.js
import { ref } from 'vue'
import ConfirmationDialog from '@/components/Notification/ConfirmationDialog.vue'

export const useConfirmationDialog = () => {
  const isOpen = ref(false)
  const options = ref({})
  const promise = ref(null)

  const resolvePromise = (value) => {
    if (promise.value) {
      promise.value.resolve(value)
      promise.value = null
    }
    isOpen.value = false
  }

  const rejectPromise = () => {
    if (promise.value) {
      promise.value.reject()
      promise.value = null
    }
    isOpen.value = false
  }

  const confirm = (customOptions = {}) => {
    return new Promise((resolve, reject) => {
      promise.value = { resolve, reject }
      options.value = {
        title: 'Confirm Action',
        message: 'Are you sure you want to continue?',
        ...customOptions
      }
      isOpen.value = true
    })
  }

  return {
    isOpen,
    options,
    confirm,
    resolve: resolvePromise,
    reject: rejectPromise
  }
}
```

This comprehensive notification system provides multiple notification types, real-time updates, and a user-friendly interface for keeping users informed about important events in your Vue dashboard application.
