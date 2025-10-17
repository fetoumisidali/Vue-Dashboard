# Component Architecture Guide

## Overview
This guide outlines a scalable component architecture for your Vue dashboard application, focusing on reusable components, proper state management, and maintainable code structure.

## Component Hierarchy

### 1. Layout Components
```
src/layouts/
├── MainLayout.vue          # Main dashboard layout
├── AuthLayout.vue          # Authentication pages layout
├── PublicLayout.vue        # Public pages layout
└── components/
    ├── AppHeader.vue       # Top navigation header
    ├── AppSidebar.vue      # Side navigation menu
    ├── AppFooter.vue       # Page footer
    └── MobileMenu.vue      # Mobile navigation menu
```

### 2. View Components
```
src/views/
├── HomeView.vue            # Dashboard home
├── Product/
│   ├── ProductsView.vue    # Product listing
│   ├── CreateProductView.vue # Product creation
│   ├── EditProductView.vue   # Product editing
│   └── ProductDetailView.vue  # Product details
├── Category/
│   ├── CategoriesView.vue  # Category listing
│   └── CreateCategoryView.vue # Category creation
├── Orders/
│   ├── OrdersView.vue      # Orders listing
│   ├── OrderDetailView.vue   # Order details
│   └── CreateOrderView.vue    # Order creation
└── Settings/
    ├── ProfileView.vue     # User profile
    └── PreferencesView.vue  # User preferences
```

### 3. Reusable Components
```
src/components/
├── UI/                     # Basic UI elements
│   ├── Button.vue
│   ├── Input.vue
│   ├── Modal.vue
│   ├── Dropdown.vue
│   ├── Tabs.vue
│   ├── LoadingSpinner.vue
│   └── Badge.vue
├── Form/                   # Form-related components
│   ├── FormInput.vue
│   ├── FormSelect.vue
│   ├── FormTextarea.vue
│   ├── FormCheckbox.vue
│   ├── FormRadio.vue
│   ├── FormDatePicker.vue
│   ├── FormFileUpload.vue
│   └── FormField.vue
├── Table/                  # Table components
│   ├── DataTable.vue
│   ├── TableHeader.vue
│   ├── TableRow.vue
│   ├── TableCell.vue
│   ├── TablePagination.vue
│   └── TableFilters.vue
├── Chart/                  # Chart components
│   ├── LineChart.vue
│   ├── BarChart.vue
│   ├── PieChart.vue
│   └── DoughnutChart.vue
├── Card/                   # Card components
│   ├── StatCard.vue
│   ├── ProductCard.vue
│   ├── OrderCard.vue
│   └── UserCard.vue
├── Navigation/             # Navigation components
│   ├── Breadcrumb.vue
│   ├── Pagination.vue
│   ├── PageHeader.vue
│   └── TabNavigation.vue
├── Upload/                 # File upload components
│   ├── FileUpload.vue
│   ├── ImageUpload.vue
│   └── BulkImport.vue
├── Notification/           # Notification components
│   ├── Toast.vue
│   ├── Alert.vue
│   └── Confirmation.vue
└── Layout/                 # Layout utilities
    ├── Container.vue
    ├── Grid.vue
    ├── Flex.vue
    └── Spacer.vue
```

## Core Component Patterns

### 1. Base Input Component
```vue
<!-- src/components/Form/FormInput.vue -->
<template>
  <FormField
    :label="label"
    :required="required"
    :error="errorMessage"
    :hint="hint"
    :disabled="disabled"
  >
    <div class="relative">
      <!-- Prefix Icon -->
      <div v-if="$slots.prefix" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <slot name="prefix" />
      </div>

      <!-- Input Field -->
      <input
        :id="fieldId"
        ref="inputRef"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        :step="step"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @keydown="handleKeydown"
      />

      <!-- Suffix Icon/Actions -->
      <div v-if="$slots.suffix || clearable" class="absolute inset-y-0 right-0 pr-3 flex items-center">
        <button
          v-if="clearable && modelValue"
          type="button"
          @click="clearInput"
          class="text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <X class="w-4 h-4" />
        </button>
        <slot name="suffix" />
      </div>
    </div>
  </FormField>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useField } from 'vee-validate'
import { X } from 'lucide-vue-next'
import FormField from './FormField.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  clearable: {
    type: Boolean,
    default: false
  },
  maxlength: {
    type: Number,
    default: null
  },
  min: {
    type: [String, Number],
    default: null
  },
  max: {
    type: [String, Number],
    default: null
  },
  step: {
    type: [String, Number],
    default: null
  },
  hint: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus', 'clear'])

const inputRef = ref(null)

// Field ID for accessibility
const fieldId = computed(() => props.name || `input-${Math.random().toString(36).substr(2, 9)}`)

// Input type (handle password visibility)
const showPassword = ref(false)
const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

// Input classes
const inputClasses = computed(() => {
  const base = 'block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors'
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }
  const prefixPadding = props.$slots?.prefix ? 'pl-10' : ''
  const suffixPadding = props.$slots?.suffix || props.clearable ? 'pr-10' : ''
  const errorClass = props.error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
  const disabledClass = props.disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''

  return [
    base,
    sizeClasses[props.size],
    prefixPadding,
    suffixPadding,
    errorClass,
    disabledClass
  ].join(' ')
})

// Event handlers
const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const handleBlur = (event) => {
  emit('blur', event.target.value)
}

const handleFocus = (event) => {
  emit('focus', event.target.value)
}

const handleKeydown = (event) => {
  // Handle enter key
  if (event.key === 'Enter') {
    emit('enter', event.target.value)
  }
}

const clearInput = () => {
  emit('update:modelValue', '')
  emit('clear')
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// Expose methods for parent components
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select()
})
</script>
```

### 2. Button Component
```vue
<!-- src/components/UI/Button.vue -->
<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="handleClick"
  >
    <LoadingSpinner v-if="loading" :size="spinnerSize" class="mr-2" />
    <component :is="icon" v-if="icon && !loading" :class="iconClasses" />
    <span v-if="$slots.default" :class="{ 'sr-only': iconOnly }">
      <slot />
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => [
      'primary', 'secondary', 'success', 'warning', 'danger', 
      'ghost', 'link', 'outline'
    ].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
  },
  icon: {
    type: [String, Object],
    default: null
  },
  iconPosition: {
    type: String,
    default: 'left',
    validator: (value) => ['left', 'right'].includes(value)
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  },
  rounded: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const iconOnly = computed(() => props.icon && !props.$slots.default)

const buttonClasses = computed(() => {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  ]

  // Size classes
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
    xl: 'px-6 py-3 text-base'
  }

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    link: 'text-blue-600 hover:text-blue-800 focus:ring-blue-500 underline',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
  }

  // State classes
  const stateClasses = []
  if (props.disabled || props.loading) {
    stateClasses.push('opacity-50 cursor-not-allowed')
  }

  // Layout classes
  if (props.block) {
    stateClasses.push('w-full')
  }
  if (props.rounded) {
    stateClasses.push('rounded-full')
  } else {
    stateClasses.push('rounded-md')
  }

  return [
    ...baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant],
    ...stateClasses
  ].join(' ')
})

const iconClasses = computed(() => {
  const baseSize = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-5 h-5'
  }

  const classes = [baseSize[props.size]]
  
  if (props.iconPosition === 'right') {
    classes.push('ml-2')
  } else {
    classes.push('mr-2')
  }

  if (iconOnly.value) {
    classes.push('m-0')
  }

  return classes.join(' ')
})

const spinnerSize = computed(() => {
  const sizeMap = {
    xs: 'xs',
    sm: 'sm',
    md: 'sm',
    lg: 'md',
    xl: 'md'
  }
  return sizeMap[props.size]
})

const handleClick = (event) => {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>
```

### 3. Modal Component
```vue
<!-- src/components/UI/Modal.vue -->
<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click="handleOverlayClick"
      >
        <!-- Overlay -->
        <div class="flex min-h-screen items-center justify-center p-4">
          <div class="fixed inset-0 bg-black opacity-30"></div>

          <!-- Modal Content -->
          <Transition
            enter-active-class="duration-300 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="duration-200 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="open"
              ref="modalRef"
              :class="modalClasses"
              @click.stop
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
            >
              <!-- Header -->
              <div v-if="$slots.header || title" class="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 :id="titleId" class="text-lg font-medium text-gray-900">
                  <slot name="header">{{ title }}</slot>
                </h3>
                <button
                  v-if="closable"
                  @click="close"
                  class="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X class="w-6 h-6" />
                </button>
              </div>

              <!-- Body -->
              <div class="p-6">
                <slot />
              </div>

              <!-- Footer -->
              <div v-if="$slots.footer" class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <slot name="footer" :close="close" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value)
  },
  closable: {
    type: Boolean,
    default: true
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  persistent: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'open'])

const modalRef = ref(null)
const titleId = computed(() => `modal-title-${Math.random().toString(36).substr(2, 9)}`)

const modalClasses = computed(() => {
  const base = 'relative bg-white rounded-lg shadow-xl max-h-full overflow-hidden'
  
  const sizeClasses = {
    sm: 'w-full max-w-md',
    md: 'w-full max-w-lg',
    lg: 'w-full max-w-2xl',
    xl: 'w-full max-w-4xl',
    full: 'w-full max-w-7xl'
  }

  return [base, sizeClasses[props.size]].join(' ')
})

const handleOverlayClick = () => {
  if (props.closeOnOverlay && !props.persistent) {
    close()
  }
}

const close = () => {
  emit('close')
}

const handleEscapeKey = (event) => {
  if (event.key === 'Escape' && props.open && !props.persistent) {
    close()
  }
}

// Focus management
const focusFirstElement = () => {
  nextTick(() => {
    const focusableElements = modalRef.value?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements?.length) {
      focusableElements[0].focus()
    }
  })
}

// Lifecycle
watch(() => props.open, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden'
    nextTick(() => {
      focusFirstElement()
    })
    emit('open')
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
  document.body.style.overflow = ''
})
</script>
```

### 4. DataTable Component
```vue
<!-- src/components/Table/DataTable.vue -->
<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <!-- Table Header with Actions -->
    <div v-if="showHeader" class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h3 v-if="title" class="text-lg font-medium text-gray-900">{{ title }}</h3>
          <slot name="header" />
        </div>
        <div class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div v-if="showFilters" class="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <slot name="filters">
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <FormInput
              v-model="searchQuery"
              placeholder="Search..."
              clearable
              class="max-w-sm"
            >
              <template #prefix>
                <Search class="w-4 h-4" />
              </template>
            </FormInput>
          </div>
          <Button
            v-if="searchQuery"
            @click="clearSearch"
            variant="ghost"
            size="sm"
          >
            Clear
          </Button>
        </div>
      </slot>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <!-- Table Head -->
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th
              v-for="column in visibleColumns"
              :key="column.key"
              :class="getHeaderClasses(column)"
              @click="column.sortable && sortBy(column.key)"
            >
              <div class="flex items-center gap-2">
                <span>{{ column.label }}</span>
                <div v-if="column.sortable" class="flex flex-col">
                  <ChevronUp
                    :class="[
                      'w-3 h-3',
                      sortKey === column.key && sortOrder === 'asc' ? 'text-blue-600' : 'text-gray-400'
                    ]"
                  />
                  <ChevronDown
                    :class="[
                      'w-3 h-3 -mt-1',
                      sortKey === column.key && sortOrder === 'desc' ? 'text-blue-600' : 'text-gray-400'
                    ]"
                  />
                </div>
              </div>
            </th>
            <th v-if="hasActions" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>

        <!-- Table Body -->
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="(item, index) in paginatedItems"
            :key="getRowKey(item, index)"
            :class="getRowClasses(item, index)"
            @click="$emit('row-click', item)"
          >
            <td
              v-for="column in visibleColumns"
              :key="column.key"
              :class="getCellClasses(column)"
            >
              <slot
                :name="`cell-${column.key}`"
                :item="item"
                :value="getCellValue(item, column)"
                :column="column"
              >
                {{ formatCellValue(getCellValue(item, column), column) }}
              </slot>
            </td>
            <td v-if="hasActions" class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <slot name="actions" :item="item" :index="index" />
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="filteredItems.length === 0" class="text-center py-12">
        <component :is="emptyIcon" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">{{ emptyTitle }}</h3>
        <p class="text-gray-500">{{ emptyDescription }}</p>
        <div v-if="$slots.empty" class="mt-4">
          <slot name="empty" />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <LoadingSpinner size="lg" class="mx-auto mb-4" />
        <p class="text-gray-500">Loading...</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="showPagination && filteredItems.length > 0" class="px-6 py-4 border-t border-gray-200">
      <Pagination
        v-model:page="currentPage"
        v-model:limit="itemsPerPage"
        :total="filteredItems.length"
        :page-sizes="pageSizes"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ChevronUp, ChevronDown, Search, Inbox } from 'lucide-vue-next'
import FormInput from '../Form/FormInput.vue'
import Button from '../UI/Button.vue'
import LoadingSpinner from '../UI/LoadingSpinner.vue'
import Pagination from './Pagination.vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  columns: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  searchable: {
    type: Boolean,
    default: true
  },
  sortable: {
    type: Boolean,
    default: true
  },
  paginated: {
    type: Boolean,
    default: true
  },
  itemsPerPage: {
    type: Number,
    default: 20
  },
  pageSizes: {
    type: Array,
    default: () => [10, 20, 50, 100]
  },
  title: {
    type: String,
    default: ''
  },
  showHeader: {
    type: Boolean,
    default: true
  },
  showFilters: {
    type: Boolean,
    default: true
  },
  showPagination: {
    type: Boolean,
    default: true
  },
  rowKey: {
    type: String,
    default: 'id'
  },
  emptyTitle: {
    type: String,
    default: 'No data'
  },
  emptyDescription: {
    type: String,
    default: 'There are no items to display'
  },
  emptyIcon: {
    type: [String, Object],
    default: () => Inbox
  },
  rowClasses: {
    type: Function,
    default: () => ''
  }
})

const emit = defineEmits(['row-click', 'sort'])

// Search and sort
const searchQuery = ref('')
const sortKey = ref('')
const sortOrder = ref('asc')

// Pagination
const currentPage = ref(1)

// Computed properties
const visibleColumns = computed(() => 
  props.columns.filter(column => !column.hidden)
)

const hasActions = computed(() => !!props.columns.some(column => column.key === 'actions'))

const filteredItems = computed(() => {
  let items = [...props.data]

  // Apply search filter
  if (props.searchable && searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(item =>
      props.columns.some(column => {
        const value = getCellValue(item, column)
        return value && value.toString().toLowerCase().includes(query)
      })
    )
  }

  return items
})

const sortedItems = computed(() => {
  let items = [...filteredItems.value]

  if (props.sortable && sortKey.value) {
    const column = props.columns.find(col => col.key === sortKey.value)
    if (column) {
      items.sort((a, b) => {
        const aValue = getCellValue(a, column)
        const bValue = getCellValue(b, column)

        let comparison = 0
        if (aValue < bValue) comparison = -1
        if (aValue > bValue) comparison = 1

        return sortOrder.value === 'asc' ? comparison : -comparison
      })
    }
  }

  return items
})

const paginatedItems = computed(() => {
  if (!props.paginated) return sortedItems.value

  const start = (currentPage.value - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return sortedItems.value.slice(start, end)
})

// Methods
const getRowKey = (item, index) => {
  return item[props.rowKey] || index
}

const getCellValue = (item, column) => {
  const keys = column.key.split('.')
  return keys.reduce((obj, key) => obj?.[key], item)
}

const formatCellValue = (value, column) => {
  if (column.formatter) {
    return column.formatter(value)
  }
  return value
}

const getHeaderClasses = (column) => {
  const base = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
  const sortable = column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
  return [base, sortable].join(' ')
}

const getCellClasses = (column) => {
  const base = 'px-6 py-4 whitespace-nowrap text-sm'
  
  let alignment = ''
  if (column.align === 'center') alignment = 'text-center'
  else if (column.align === 'right') alignment = 'text-right'
  else alignment = 'text-gray-900'

  const customClasses = column.className || ''
  
  return [base, alignment, customClasses].join(' ')
}

const getRowClasses = (item, index) => {
  const base = 'hover:bg-gray-50 cursor-pointer'
  const custom = props.rowClasses(item, index)
  return [base, custom].filter(Boolean).join(' ')
}

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  
  emit('sort', { key, order: sortOrder.value })
}

const clearSearch = () => {
  searchQuery.value = ''
  currentPage.value = 1
}

// Watch for data changes to reset pagination
watch(() => props.data, () => {
  currentPage.value = 1
})
</script>
```

## Component Composition Patterns

### 1. Smart vs Dumb Components

#### Smart Components (Container Components)
- Handle state management logic
- Fetch and manage data
- Handle business logic
- Pass data down to dumb components as props
- Emit events up to handle user interactions

```vue
<!-- src/views/Product/ProductsView.vue (Smart Component) -->
<template>
  <section class="space-y-6">
    <PageHeader
      title="Products"
      :breadcrumb="breadcrumb"
    >
      <Button @click="createProduct">
        Add Product
      </Button>
    </PageHeader>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        v-for="stat in stats"
        :key="stat.key"
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :color="stat.color"
      />
    </div>

    <ProductsTable
      :products="productStore.filteredProducts"
      :loading="productStore.loading"
      @edit="editProduct"
      @delete="deleteProduct"
    />
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '@/stores/products'
import PageHeader from '@/components/Layout/PageHeader.vue'
import StatCard from '@/components/Card/StatCard.vue'
import ProductsTable from '@/components/Product/ProductsTable.vue'
import Button from '@/components/UI/Button.vue'

const router = useRouter()
const productStore = useProductStore()

const breadcrumb = [
  { label: 'Dashboard', href: '/' },
  { label: 'Products' }
]

const stats = computed(() => [
  {
    key: 'total',
    label: 'Total Products',
    value: productStore.totalProducts,
    icon: 'package',
    color: 'blue'
  },
  {
    key: 'lowStock',
    label: 'Low Stock',
    value: productStore.lowStockProducts.length,
    icon: 'alert-triangle',
    color: 'yellow'
  },
  {
    key: 'totalValue',
    label: 'Total Value',
    value: productStore.totalValue,
    icon: 'dollar-sign',
    color: 'green'
  }
])

const createProduct = () => {
  router.push('/products/create')
}

const editProduct = (product) => {
  router.push(`/products/${product.id}/edit`)
}

const deleteProduct = async (product) => {
  await productStore.deleteProduct(product.id)
}

onMounted(() => {
  productStore.fetchProducts()
})
</script>
```

#### Dumb Components (Presentational Components)
- Focus purely on presentation
- Receive data via props
- Emit events to handle interactions
- No business logic or API calls
- Highly reusable and testable

```vue
<!-- src/components/Product/ProductsTable.vue (Dumb Component) -->
<template>
  <DataTable
    :data="products"
    :columns="columns"
    :loading="loading"
    title="Products"
    @row-click="handleRowClick"
  >
    <template #cell-status="{ value }">
      <Badge :variant="value === 'active' ? 'success' : 'secondary'">
        {{ value }}
      </Badge>
    </template>

    <template #cell-price="{ value }">
      {{ formatCurrency(value) }}
    </template>

    <template #actions="{ item }">
      <div class="flex items-center gap-2">
        <Button
          @click.stop="edit(item)"
          variant="ghost"
          size="sm"
        >
          <Edit class="w-4 h-4" />
        </Button>
        <Button
          @click.stop="confirmDelete(item)"
          variant="ghost"
          size="sm"
          class="text-red-600 hover:text-red-700"
        >
          <Trash class="w-4 h-4" />
        </Button>
      </div>
    </template>
  </DataTable>
</template>

<script setup>
import { computed } from 'vue'
import DataTable from '../Table/DataTable.vue'
import Badge from '../UI/Badge.vue'
import Button from '../UI/Button.vue'
import { Edit, Trash } from 'lucide-vue-next'
import { formatCurrency } from '@/utils/formatters.js'

const props = defineProps({
  products: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'row-click'])

const columns = computed(() => [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'code', label: 'Code', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'price', label: 'Price', sortable: true, align: 'right' },
  { key: 'stock', label: 'Stock', sortable: true, align: 'right' },
  { key: 'status', label: 'Status', align: 'center' }
])

const handleRowClick = (product) => {
  emit('row-click', product)
}

const edit = (product) => {
  emit('edit', product)
}

const confirmDelete = (product) => {
  emit('delete', product)
}
</script>
```

## Component Testing Strategy

### 1. Unit Testing Example
```javascript
// tests/unit/components/Button.test.js
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import Button from '@/components/UI/Button.vue'

describe('Button', () => {
  it('renders with default props', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me'
      }
    })
    
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.classes()).toContain('bg-blue-600')
  })

  it('applies correct variant classes', () => {
    const wrapper = mount(Button, {
      props: { variant: 'danger' },
      slots: { default: 'Delete' }
    })
    
    expect(wrapper.classes()).toContain('bg-red-600')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(Button, {
      slots: { default: 'Click' }
    })
    
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('shows loading state', () => {
    const wrapper = mount(Button, {
      props: { loading: true },
      slots: { default: 'Loading' }
    })
    
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
```

This component architecture provides a solid foundation for building scalable, maintainable Vue applications with clear separation of concerns and reusable components.
