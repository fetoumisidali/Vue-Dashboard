# Pagination and Search System Guide

## Overview
This guide covers implementing a comprehensive pagination and search system for your Vue dashboard application, including server-side pagination, intelligent search, filtering, and performance optimization.

## Pagination Architecture

### 1. Pagination Composable
```typescript
// src/composables/usePagination.js
import { ref, computed, watch } from 'vue'

export const usePagination = (items = ref([]), options = {}) => {
  const {
    itemsPerPage: defaultItemsPerPage = 20,
    pageSizes = [10, 20, 50, 100],
    showFirstLast = true,
    showJumpButtons = true,
    maxJumpButtons = 5
  } = options

  // State
  const currentPage = ref(1)
  const itemsPerPage = ref(defaultItemsPerPage)
  const totalItems = computed(() => items.value.length)
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  // Computed properties
  const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
  const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, totalItems.value))

  const paginatedItems = computed(() => {
    if (!items.value.length) return []
    return items.value.slice(startIndex.value, endIndex.value)
  })

  const paginationInfo = computed(() => ({
    currentPage: currentPage.value,
    itemsPerPage: itemsPerPage.value,
    totalItems: totalItems.value,
    totalPages: totalPages.value,
    startIndex: startIndex.value,
    endIndex: endIndex.value,
    hasNextPage: currentPage.value < totalPages.value,
    hasPreviousPage: currentPage.value > 1
  }))

  // Page numbers for navigation
  const pageNumbers = computed(() => {
    const pages = []
    const half = Math.floor(maxJumpButtons / 2)
    
    let start = Math.max(1, currentPage.value - half)
    let end = Math.min(totalPages.value, start + maxJumpButtons - 1)
    
    if (end - start + 1 < maxJumpButtons) {
      start = Math.max(1, end - maxJumpButtons + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  })

  const canGoToFirst = computed(() => 
    showFirstLast && currentPage.value > 1
  )

  const canGoToLast = computed(() => 
    showFirstLast && currentPage.value < totalPages.value
  )

  // Methods
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const goToFirstPage = () => {
    goToPage(1)
  }

  const goToLastPage = () => {
    goToPage(totalPages.value)
  }

  const goToNextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }

  const goToPreviousPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  const jumpToPage = (page) => {
    if (showJumpButtons) {
      goToPage(page)
    }
  }

  const setItemsPerPage = (newItemsPerPage) => {
    itemsPerPage.value = newItemsPerPage
    currentPage.value = 1 // Reset to first page
  }

  const resetPagination = () => {
    currentPage.value = 1
    itemsPerPage.value = defaultItemsPerPage
  }

  // Watch for items changes to reset page if necessary
  watch(totalItems, (newTotal, oldTotal) => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value || 1
    }
  })

  return {
    // State
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    pageSizes,
    // Computed
    paginatedItems,
    paginationInfo,
    pageNumbers,
    startIndex,
    endIndex,
    canGoToFirst,
    canGoToLast,
    // Methods
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    jumpToPage,
    setItemsPerPage,
    resetPagination
  }
}
```

### 2. Pagination Component
```vue
<!-- src/components/Pagination/PaginationComponent.vue -->
<template>
  <div class="flex items-center justify-between">
    <!-- Page info -->
    <div class="text-sm text-gray-700">
      Showing
      <span class="font-medium">{{ startIndex + 1 }}</span>
      to
      <span class="font-medium">{{ endIndex }}</span>
      of
      <span class="font-medium">{{ totalItems }}</span>
      results
    </div>

    <!-- Pagination controls -->
    <div class="flex items-center space-x-4">
      <!-- Items per page selector -->
      <div class="flex items-center space-x-2">
        <label class="text-sm text-gray-700">Show</label>
        <select
          :value="itemsPerPage"
          @change="handleItemsPerPageChange"
          class="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option
            v-for="size in pageSizes"
            :key="size"
            :value="size"
          >
            {{ size }}
          </option>
        </select>
        <label class="text-sm text-gray-700">per page</label>
      </div>

      <!-- Navigation buttons -->
      <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
        <!-- First page -->
        <button
          v-if="canGoToFirst"
          @click="goToFirstPage"
          :disabled="!hasPreviousPage"
          class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsLeft class="w-4 h-4" />
        </button>

        <!-- Previous page -->
        <button
          @click="goToPreviousPage"
          :disabled="!hasPreviousPage"
          class="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="{ 'rounded-l-md': !canGoToFirst }"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <!-- Page numbers -->
        <template v-for="page in pageNumbers" :key="page">
          <button
            v-if="page === '...'"
            disabled
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            ...
          </button>
          <button
            v-else
            @click="goToPage(page)"
            :class="[
              'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
              page === currentPage
                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            ]"
          >
            {{ page }}
          </button>
        </template>

        <!-- Next page -->
        <button
          @click="goToNextPage"
          :disabled="!hasNextPage"
          class="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="{ 'rounded-r-md': !canGoToLast }"
        >
          <ChevronRight class="w-4 h-4" />
        </button>

        <!-- Last page -->
        <button
          v-if="canGoToLast"
          @click="goToLastPage"
          :disabled="!hasNextPage"
          class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsRight class="w-4 h-4" />
        </button>
      </nav>

      <!-- Page jump input -->
      <div v-if="enablePageJump" class="flex items-center space-x-2">
        <label class="text-sm text-gray-700">Go to page</label>
        <input
          v-model.number="jumpToPageNumber"
          @keyup.enter="handlePageJump"
          type="number"
          :min="1"
          :max="totalPages"
          class="w-16 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder="1"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-vue-next'

const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalItems: {
    type: Number,
    required: true
  },
  itemsPerPage: {
    type: Number,
    required: true
  },
  pageSizes: {
    type: Array,
    default: () => [10, 20, 50, 100]
  },
  showFirstLast: {
    type: Boolean,
    default: true
  },
  enablePageJump: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'page-change',
  'items-per-page-change'
])

const jumpToPageNumber = ref(props.currentPage)

// Computed properties
const totalPages = computed(() => 
  Math.ceil(props.totalItems / props.itemsPerPage)
)

const startIndex = computed(() => 
  (props.currentPage - 1) * props.itemsPerPage
)

const endIndex = computed(() => 
  Math.min(startIndex.value + props.itemsPerPage, props.totalItems)
)

const hasPreviousPage = computed(() => props.currentPage > 1)
const hasNextPage = computed(() => props.currentPage < totalPages.value)

const canGoToFirst = computed(() => 
  props.showFirstLast && hasPreviousPage.value
)

const canGoToLast = computed(() => 
  props.showFirstLast && hasNextPage.value
)

const pageNumbers = computed(() => {
  const pages = []
  const maxJumpButtons = 5
  const half = Math.floor(maxJumpButtons / 2)
  
  let start = Math.max(1, props.currentPage - half)
  let end = Math.min(totalPages.value, start + maxJumpButtons - 1)
  
  if (end - start + 1 < maxJumpButtons) {
    start = Math.max(1, end - maxJumpButtons + 1)
  }
  
  // Add ellipsis if needed
  if (start > 1) {
    pages.push(1)
    if (start > 2) {
      pages.push('...')
    }
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  if (end < totalPages.value) {
    if (end < totalPages.value - 1) {
      pages.push('...')
    }
    pages.push(totalPages.value)
  }
  
  return pages
})

// Methods
const goToPage = (page) => {
  emit('page-change', page)
}

const goToFirstPage = () => {
  goToPage(1)
}

const goToLastPage = () => {
  goToPage(totalPages.value)
}

const goToNextPage = () => {
  if (hasNextPage.value) {
    goToPage(props.currentPage + 1)
  }
}

const goToPreviousPage = () => {
  if (hasPreviousPage.value) {
    goToPage(props.currentPage - 1)
  }
}

const handleItemsPerPageChange = (event) => {
  emit('items-per-page-change', parseInt(event.target.value))
}

const handlePageJump = () => {
  const page = Math.max(1, Math.min(jumpToPageNumber.value, totalPages.value))
  goToPage(page)
}

// Update jump input when current page changes
watch(() => props.currentPage, (newPage) => {
  jumpToPageNumber.value = newPage
})
</script>
```

## Search System

### 1. Search Composable
```typescript
// src/composables/useSearch.js
import { ref, computed, watch, nextTick } from 'vue'
import { debounce } from 'lodash-es'

export const useSearch = (items, searchOptions = {}) => {
  const {
    searchableFields = [],
    fuzzySearch = true,
    caseSensitive = false,
    minSearchLength = 2,
    highlightMatches = true,
    searchDebounce = 300
  } = searchOptions

  // State
  const searchQuery = ref('')
  const searchFields = ref(searchableFields)
  const isSearching = ref(false)
  const searchHistory = ref([])
  const maxHistoryItems = 10

  // Computed
  const filteredItems = computed(() => {
    if (!searchQuery.value || searchQuery.value.length < minSearchLength) {
      return items.value
    }

    isSearching.value = true

    const query = caseSensitive ? searchQuery.value : searchQuery.value.toLowerCase()
    const searchTerms = query.split(' ').filter(term => term.length > 0)

    const results = items.value.filter(item => {
      return searchTerms.every(term => {
        return searchFields.value.some(field => {
          const fieldValue = getNestedValue(item, field)
          if (fieldValue == null) return false

          const value = caseSensitive ? fieldValue.toString() : fieldValue.toString().toLowerCase()
          
          if (fuzzySearch) {
            return fuzzyMatch(value, term)
          } else {
            return value.includes(term)
          }
        })
      })
    })

    // Highlight matches if enabled
    if (highlightMatches) {
      return results.map(item => ({
        ...item,
        _highlighted: highlightSearchResults(item, searchFields.value, query)
      }))
    }

    return results
  })

  // Methods
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  const fuzzyMatch = (text, pattern) => {
    const patternLength = pattern.length
    const textLength = text.length
    
    if (patternLength > textLength) return false
    if (patternLength === textLength) return pattern === text
    
    let i = 0
    let j = 0
    
    while (i < patternLength && j < textLength) {
      if (pattern[i] === text[j]) {
        i++
      }
      j++
    }
    
    return i === patternLength
  }

  const highlightSearchResults = (item, fields, query) => {
    const highlighted = {}
    
    fields.forEach(field => {
      const value = getNestedValue(item, field)
      if (value != null && typeof value === 'string') {
        highlighted[field] = highlightText(value, query)
      }
    })
    
    return highlighted
  }

  const highlightText = (text, query) => {
    if (!query) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  const search = (query) => {
    searchQuery.value = query
    addToHistory(query)
  }

  const clearSearch = () => {
    searchQuery.value = ''
  }

  const addToHistory = (query) => {
    if (!query || query.length < minSearchLength) return
    
    const queryIndex = searchHistory.value.findIndex(item => item.query === query)
    
    if (queryIndex !== -1) {
      searchHistory.value.splice(queryIndex, 1)
    }
    
    searchHistory.value.unshift({
      query,
      timestamp: Date.now()
    })
    
    if (searchHistory.value.length > maxHistoryItems) {
      searchHistory.value = searchHistory.value.slice(0, maxHistoryItems)
    }
  }

  const removeFromHistory = (query) => {
    const index = searchHistory.value.findIndex(item => item.query === query)
    if (index !== -1) {
      searchHistory.value.splice(index, 1)
    }
  }

  const clearHistory = () => {
    searchHistory.value = []
  }

  const setSearchFields = (fields) => {
    searchFields.value = fields
  }

  // Debounced search function
  const debouncedSearch = debounce(search, searchDebounce)

  // Watch for search query changes
  watch(filteredItems, () => {
    nextTick(() => {
      isSearching.value = false
    })
  })

  return {
    // State
    searchQuery,
    searchFields,
    isSearching,
    searchHistory,
    // Computed
    filteredItems,
    // Methods
    search,
    debouncedSearch,
    clearSearch,
    addToHistory,
    removeFromHistory,
    clearHistory,
    setSearchFields
  }
}
```

### 2. Advanced Search Component
```vue
<!-- src/components/Search/AdvancedSearch.vue -->
<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <!-- Quick Search -->
    <div class="space-y-4">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search class="h-5 w-5 text-gray-400" />
        </div>
        <input
          v-model="searchQuery"
          @input="handleSearchInput"
          @focus="showSuggestions = true"
          @blur="hideSuggestions"
          type="text"
          class="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search..."
        />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="h-4 w-4" />
          </button>
          <button
            @click="toggleAdvancedSearch"
            class="text-gray-400 hover:text-gray-600"
            :class="{ 'text-blue-600': showAdvancedSearch }"
          >
            <Filter class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Search Suggestions -->
      <div
        v-if="showSuggestions && (searchHistory.length > 0 || suggestions.length > 0)"
        class="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1"
      >
        <div v-if="searchHistory.length > 0" class="p-2 border-b border-gray-200">
          <div class="text-xs font-medium text-gray-500 mb-2">Recent Searches</div>
          <button
            v-for="historyItem in searchHistory"
            :key="historyItem.query"
            @click="selectFromHistory(historyItem.query)"
            class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center justify-between group"
          >
            <span>{{ historyItem.query }}</span>
            <button
              @click.stop="removeFromHistory(historyItem.query)"
              class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
            >
              <X class="h-3 w-3" />
            </button>
          </button>
        </div>

        <div v-if="suggestions.length > 0" class="p-2">
          <div class="text-xs font-medium text-gray-500 mb-2">Suggestions</div>
          <button
            v-for="suggestion in suggestions"
            :key="suggestion"
            @click="selectFromHistory(suggestion)"
            class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>
    </div>

    <!-- Advanced Search -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 transform -translate-y-2"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform -translate-y-2"
    >
      <div v-if="showAdvancedSearch" class="mt-6 space-y-4 border-t border-gray-200 pt-6">
        <h3 class="text-lg font-medium text-gray-900">Advanced Search</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Search Fields -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Search In</label>
            <div class="space-y-2">
              <label
                v-for="field in availableFields"
                :key="field.key"
                class="flex items-center"
              >
                <input
                  v-model="selectedSearchFields"
                  :value="field.key"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">{{ field.label }}</span>
              </label>
            </div>
          </div>

          <!-- Date Range -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div class="space-y-2">
              <FormInput
                v-model="filters.dateFrom"
                type="date"
                placeholder="From"
              />
              <FormInput
                v-model="filters.dateTo"
                type="date"
                placeholder="To"
              />
            </div>
          </div>

          <!-- Filters -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Filters</label>
            <div class="space-y-2">
              <FormSelect
                v-model="filters.category"
                :options="categoryOptions"
                placeholder="All Categories"
              />
              <FormSelect
                v-model="filters.status"
                :options="statusOptions"
                placeholder="All Statuses"
              />
            </div>
          </div>
        </div>

        <!-- Additional Filters -->
        <div class="flex items-center space-x-4">
          <label class="flex items-center">
            <input
              v-model="filters.fuzzySearch"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">Fuzzy Search</span>
          </label>

          <label class="flex items-center">
            <input
              v-model="filters.caseSensitive"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">Case Sensitive</span>
          </label>
        </div>

        <!-- Search Actions -->
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">
            {{ searchResultInfo }}
          </div>
          <div class="flex space-x-2">
            <Button
              @click="resetFilters"
              variant="ghost"
              size="sm"
            >
              Reset Filters
            </Button>
            <Button
              @click="applyAdvancedSearch"
              size="sm"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Search, X, Filter } from 'lucide-vue-next'
import { useSearch } from '@/composables/useSearch.js'
import FormInput from '../Form/FormInput.vue'
import FormSelect from '../Form/FormSelect.vue'
import Button from '../UI/Button.vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  availableFields: {
    type: Array,
    required: true
  },
  categoryOptions: {
    type: Array,
    default: () => []
  },
  statusOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['search', 'filter-change'])

// Search state
const searchQuery = ref('')
const showSuggestions = ref(false)
const showAdvancedSearch = ref(false)
const selectedSearchFields = ref(props.availableFields.map(f => f.key))

// Filter state
const filters = ref({
  dateFrom: '',
  dateTo: '',
  category: '',
  status: '',
  fuzzySearch: true,
  caseSensitive: false
})

// Initialize search composable
const searchOptions = computed(() => ({
  searchableFields: selectedSearchFields.value,
  fuzzySearch: filters.value.fuzzySearch,
  caseSensitive: filters.value.caseSensitive,
  minSearchLength: 2
}))

const {
  filteredItems,
  searchHistory,
  search: performSearch,
  debouncedSearch,
  clearSearch,
  removeFromHistory
} = useSearch(() => props.items, searchOptions)

// Computed
const suggestions = computed(() => {
  // Generate suggestions based on available data
  const queries = new Set()
  props.items.forEach(item => {
    selectedSearchFields.value.forEach(field => {
      const value = getNestedValue(item, field)
      if (value && typeof value === 'string') {
        const words = value.toLowerCase().split(/\s+/)
        words.forEach(word => {
          if (word.length > 2 && word.includes(searchQuery.value.toLowerCase())) {
            queries.add(word)
          }
        })
      }
    })
  })
  return Array.from(queries).slice(0, 5)
})

const searchResultInfo = computed(() => {
  const total = props.items.length
  const filtered = filteredItems.value.length
  
  if (filtered === total) {
    return `${total} items`
  } else if (filtered === 0) {
    return 'No items found'
  } else {
    return `${filtered} of ${total} items`
  }
})

// Methods
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

const handleSearchInput = (event) => {
  searchQuery.value = event.target.value
  debouncedSearch(searchQuery.value)
}

const selectFromHistory = (query) => {
  searchQuery.value = query
  performSearch(query)
  showSuggestions.value = false
}

const hideSuggestions = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const toggleAdvancedSearch = () => {
  showAdvancedSearch.value = !showAdvancedSearch.value
}

const applyAdvancedSearch = () => {
  emit('filter-change', {
    ...filters.value,
    searchFields: selectedSearchFields.value,
    query: searchQuery.value
  })
  
  // Apply the search with updated options
  performSearch(searchQuery.value)
}

const resetFilters = () => {
  filters.value = {
    dateFrom: '',
    dateTo: '',
    category: '',
    status: '',
    fuzzySearch: true,
    caseSensitive: false
  }
  selectedSearchFields.value = props.availableFields.map(f => f.key)
  clearSearch()
}

// Watch for changes and emit
watch(filteredItems, (newFiltered) => {
  emit('search', {
    query: searchQuery.value,
    results: newFiltered,
    total: newFiltered.length
  })
})
</script>
```

## Server-Side Integration

### 1. Server-Side Pagination Hook
```typescript
// src/composables/useServerPagination.js
import { ref, computed, watch } from 'vue'

export const useServerPagination = (fetchAction, options = {}) => {
  const {
    initialPage = 1,
    initialItemsPerPage = 20,
    defaultSort = { field: 'id', direction: 'asc' }
  } = options

  // State
  const currentPage = ref(initialPage)
  const itemsPerPage = ref(initialItemsPerPage)
  const totalItems = ref(0)
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))
  const sort = ref(defaultSort)
  const loading = ref(false)
  const error = ref(null)
  const data = ref([])

  // Computed
  const paginationInfo = computed(() => ({
    currentPage: currentPage.value,
    itemsPerPage: itemsPerPage.value,
    totalItems: totalItems.value,
    totalPages: totalPages.value,
    hasNextPage: currentPage.value < totalPages.value,
    hasPreviousPage: currentPage.value > 1,
    startIndex: (currentPage.value - 1) * itemsPerPage.value + 1,
    endIndex: Math.min(currentPage.value * itemsPerPage.value, totalItems.value)
  }))

  // Methods
  const fetchData = async (params = {}) => {
    loading.value = true
    error.value = null

    try {
      const requestParams = {
        page: currentPage.value,
        limit: itemsPerPage.value,
        sort: sort.value.field,
        order: sort.value.direction,
        ...params
      }

      const response = await fetchAction(requestParams)
      
      data.value = response.data || []
      totalItems.value = response.total || 0
      
      // Update page if requested page is out of bounds
      if (currentPage.value > totalPages.value && totalPages.value > 0) {
        currentPage.value = totalPages.value
        await fetchData(params)
      }
      
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

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

  const setItemsPerPage = (newItemsPerPage) => {
    itemsPerPage.value = newItemsPerPage
    currentPage.value = 1
  }

  const setSort = (field, direction = 'asc') => {
    sort.value = { field, direction }
  }

  const toggleSort = (field) => {
    if (sort.value.field === field) {
      sort.value.direction = sort.value.direction === 'asc' ? 'desc' : 'asc'
    } else {
      sort.value.field = field
      sort.value.direction = 'asc'
    }
  }

  const refresh = () => {
    return fetchData()
  }

  const reset = () => {
    currentPage.value = initialPage
    itemsPerPage.value = initialItemsPerPage
    sort.value = defaultSort
    return refresh()
  }

  // Auto-fetch when pagination parameters change
  watch([currentPage, itemsPerPage, sort], () => {
    fetchData()
  })

  return {
    // State
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    sort,
    loading,
    error,
    data,
    // Computed
    paginationInfo,
    // Methods
    fetchData,
    goToPage,
    nextPage,
    previousPage,
    setItemsPerPage,
    setSort,
    toggleSort,
    refresh,
    reset
  }
}
```

### 2. Server-Side Search Hook
```typescript
// src/composables/useServerSearch.js
import { ref, watch } from 'vue'
import { debounce } from 'lodash-es'

export const useServerSearch = (searchAction, options = {}) => {
  const { debounceDelay = 300, minSearchLength = 2 } = options

  // State
  const searchQuery = ref('')
  const searchFilters = ref({})
  const loading = ref(false)
  const error = ref(null)
  const results = ref([])
  const total = ref(0)

  // Methods
  const executeSearch = async (params = {}) => {
    if (searchQuery.value.length < minSearchLength && !Object.keys(params).length) {
      results.value = []
      total.value = 0
      return
    }

    loading.value = true
    error.value = null

    try {
      const requestParams = {
        query: searchQuery.value,
        ...searchFilters.value,
        ...params
      }

      const response = await searchAction(requestParams)
      
      results.value = response.data || []
      total.value = response.total || 0
      
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const search = executeSearch
  const debouncedSearch = debounce(executeSearch, debounceDelay)

  const clearSearch = () => {
    searchQuery.value = ''
    searchFilters.value = {}
    results.value = []
    total.value = 0
  }

  const setFilters = (filters) => {
    searchFilters.value = { ...searchFilters.value, ...filters }
  }

  const removeFilter = (key) => {
    const newFilters = { ...searchFilters.value }
    delete newFilters[key]
    searchFilters.value = newFilters
  }

  const resetFilters = () => {
    searchFilters.value = {}
  }

  // Auto-search when query or filters change
  watch([searchQuery, searchFilters], () => {
    debouncedSearch()
  })

  return {
    // State
    searchQuery,
    searchFilters,
    loading,
    error,
    results,
    total,
    // Methods
    search,
    debouncedSearch,
    clearSearch,
    setFilters,
    removeFilter,
    resetFilters
  }
}
```

## Usage Examples

### 1. Combined Pagination and Search
```vue
<!-- src/views/Product/ProductsView.vue -->
<template>
  <div class="space-y-6">
    <!-- Search -->
    <AdvancedSearch
      :items="products"
      :available-fields="searchFields"
      :category-options="categories"
      @search="handleSearch"
      @filter-change="handleFilterChange"
    />

    <!-- Table -->
    <DataTable
      :data="filteredProducts"
      :columns="tableColumns"
      :loading="loading"
      @sort="handleSort"
    />

    <!-- Pagination -->
    <PaginationComponent
      v-if="totalItems > 0"
      :current-page="currentPage"
      :total-items="totalItems"
      :items-per-page="itemsPerPage"
      @page-change="handlePageChange"
      @items-per-page-change="handleItemsPerPageChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useServerPagination } from '@/composables/useServerPagination.js'
import { useServerSearch } from '@/composables/useServerSearch.js'
import AdvancedSearch from '@/components/Search/AdvancedSearch.vue'
import DataTable from '@/components/Table/DataTable.vue'
import PaginationComponent from '@/components/Pagination/PaginationComponent.vue'
import productService from '@/services/products.js'

const searchFields = [
  { key: 'name', label: 'Product Name' },
  { key: 'code', label: 'Product Code' },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' }
]

const tableColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'code', label: 'Code', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'stock', label: 'Stock', sortable: true }
]

// Initialize pagination
const pagination = useServerPagination(async (params) => {
  return await productService.getProducts(params)
})

// Initialize search
const search = useServerSearch(async (params) => {
  return await productService.searchProducts(params)
})

const categories = ref([])

// Computed
const filteredProducts = computed(() => {
  return search.searchQuery.value ? search.results.value : pagination.data.value
})

const loading = computed(() => pagination.loading.value || search.loading.value)
const currentPage = computed(() => pagination.currentPage.value)
const itemsPerPage = computed(() => pagination.itemsPerPage.value)
const totalItems = computed(() => {
  return search.searchQuery.value ? search.total.value : pagination.totalItems.value
})

// Event handlers
const handleSearch = ({ results }) => {
  // Handle search results
  console.log('Search results:', results)
}

const handleFilterChange = (filters) => {
  pagination.fetchData(filters)
  search.setFilters(filters)
}

const handleSort = ({ field, direction }) => {
  pagination.setSort(field, direction)
}

const handlePageChange = (page) => {
  pagination.goToPage(page)
}

const handleItemsPerPageChange = (size) => {
  pagination.setItemsPerPage(size)
}

onMounted(async () => {
  await Promise.all([
    pagination.fetchData(),
    productService.getCategories().then(response => {
      categories.value = response.data
    })
  ])
})
</script>
```

This comprehensive pagination and search system provides flexible, performant data handling with both client-side and server-side capabilities for your Vue dashboard application.
