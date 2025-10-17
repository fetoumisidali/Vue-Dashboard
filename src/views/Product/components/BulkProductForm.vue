<template>
  <div class="bulk-product-form space-y-6">
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-gray-50">
            <th v-for="field in formFields" :key="field.key"
              class="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {{ field.label }}
            </th>
            <th class="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="(product, index) in manualProducts" :key="product.id">
            <td v-for="field in formFields" :key="field.key" class="p-3">
              <div class="space-y-1">
                <input v-if="field.type === 'text'" v-model="product[field.key]" type="text"
                  :placeholder="field.placeholder"
                  class="inline-block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="{ 'border-red-500': getFieldError(product, field.key) }">
                <input v-else-if="field.type === 'number'" v-model.number="product[field.key]" type="number"
                  :step="field.step" :min="field.min" :max="field.max" :placeholder="field.placeholder"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="{ 'border-red-500': getFieldError(product, field.key) }">
                <input v-else-if="field.type === 'email'" v-model="product[field.key]" type="email"
                  :placeholder="field.placeholder"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="{ 'border-red-500': getFieldError(product, field.key) }">
                <div class="relative" v-else-if="field.type === 'password'">
                  <input v-model="product[field.key]" :type="showPasswords?.[product.id] ? 'text' : 'password'"
                    :placeholder="field.placeholder"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    :class="{ 'border-red-500': getFieldError(product, field.key) }">
                  <button @click="togglePasswordVisibility(product.id)"
                    class="absolute right-2 top-2 text-gray-400 hover:text-gray-600" type="button">
                    <Eye v-if="!showPasswords?.[product.id]" class="w-4 h-4" />
                    <EyeOff v-else class="w-4 h-4" />
                  </button>
                </div>
                <textarea v-else-if="field.type === 'textarea'" v-model="product[field.key]"
                  :placeholder="field.placeholder" :rows="field.rows || 3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="{ 'border-red-500': getFieldError(product, field.key) }"></textarea>

                <div class="min-h-5">
                  <div v-if="getFieldError(product, field.key)" class="text-xs text-red-600">
                    {{ getFieldError(product, field.key) }}
                  </div>
                </div>
              </div>


            </td>

            <td class="p-3">
              <span :class="[
                'px-2 py-1 text-xs font-medium rounded-full',
                hasValidationErrors(product)
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              ]">
                {{ hasValidationErrors(product) ? 'Invalid' : 'Valid' }}
              </span>
            </td>

            <td class="p-3">
              <button @click="removeProduct(index)" class="text-red-600 hover:text-red-800 p-1" title="Remove product">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="manualProducts.length === 0" class="text-center py-8 text-gray-500">
        <Package class="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No products added yet</p>
        <p class="text-sm">Click "Add Product" to start adding products</p>
      </div>
    </div>

    <div class="flex justify-between items-center mt-6">
      <button @click="addEmptyProduct"
        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
        <Plus class="w-4 h-4" />
        Add Product
      </button>

      <div class="flex gap-4">
        <button @click="validateAll" :disabled="manualProducts.length === 0"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          <CheckCircle class="w-4 h-4" />
          Validate All
        </button>

        <button @click="createAllProducts" :disabled="manualProducts.length === 0 || hasAnyValidationErrors || creating"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
          <Check class="w-4 h-4" />
          {{ creating ? 'Creating...' : 'Create All Products' }}
        </button>
      </div>
    </div>
  </div>

  <div v-if="creating" class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Creating Products</h3>
      <span class="text-sm text-gray-600">
        {{ createdCount }} / {{ totalToCreate }} products
      </span>
    </div>

    <div class="bg-gray-200 rounded-full h-2">
      <div class="bg-green-600 h-2 rounded-full transition-all duration-300" :style="{ width: creationProgress + '%' }">
      </div>
    </div>

    <div class="mt-4 space-y-2">
      <div v-for="result in creationResults" :key="result.index" class="flex items-center justify-between p-2 rounded"
        :class="result.success ? 'bg-green-50' : 'bg-red-50'">
        <span class="text-sm">{{ result.product.name || `Product ${result.index + 1}` }}</span>
        <span class="text-xs font-medium" :class="result.success ? 'text-green-800' : 'text-red-800'">
          {{ result.success ? 'Created' : 'Failed' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  Trash2,
  Plus,
  CheckCircle,
  Package,
  Check,
  Eye,
  EyeOff
} from 'lucide-vue-next'

// Dynamic form fields configuration
const formFields = ref([
  { key: 'name', label: 'Name *', type: 'text', placeholder: 'Product name', required: true },
  { key: 'price', label: 'Price *', type: 'number', step: '0.01', min: 0, placeholder: '0.00', required: true },
  { key: 'code', label: 'Code', type: 'text', placeholder: 'Product code', required: false },
  { key: 'category', label: 'Category *', type: 'text', placeholder: 'Category', required: true },
  { key: 'stock', label: 'Stock', type: 'number', min: 0, placeholder: '0', required: false }
])

// State
const manualProducts = ref([])
const validationErrors = ref({})
const creating = ref(false)
const creationResults = ref([])
const createdCount = ref(0)
const totalToCreate = ref(0)
const showPasswords = ref({}) // For password fields if any

// Counter for unique IDs
let productIdCounter = 0

// Computed properties
const hasAnyValidationErrors = computed(() =>
  manualProducts.value.some(product => hasValidationErrors(product))
)

const creationProgress = computed(() => {
  return totalToCreate.value > 0 ? (createdCount.value / totalToCreate.value) * 100 : 0
})

// API function
const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

const validateProduct = (product) => {
  const errors = {}

  formFields.value.forEach(field => {
    const value = product[field.key]

    if (field.required && !value?.toString().trim()) {
      errors[field.key] = `${field.label.replace(' *', '')} is required`
      return
    }

    if (field.type === 'text') {
      if (value && field.key === 'name' && value.length < 3) {
        errors[field.key] = 'Product name must be at least 3 characters'
      }
      if (value && field.key === 'code' && !/^[A-Z0-9-_]{3,50}$/i.test(value)) {
        errors[field.key] = 'Invalid code format (3-50 chars, alphanumeric only)'
      }
    } else if (field.type === 'number') {
      if (value !== undefined && value !== null && value !== '') {
        if (field.key === 'price' && value <= 0) {
          errors[field.key] = 'Price must be greater than 0'
        }
        if (field.min !== undefined && value < field.min) {
          errors[field.key] = `Must be ${field.min} or greater`
        }
      }
    } else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field.key] = 'Invalid email format'
    }
  })

  return errors
}

const hasValidationErrors = (product) => Object.keys(validateProduct(product)).length > 0

const getFieldError = (product, field) => {
  const productId = product.id
  if (!validationErrors.value[productId]) {
    const errors = validateProduct(product)
    if (Object.keys(errors).length > 0) {
      validationErrors.value[productId] = errors
    }
  }
  return validationErrors.value[productId]?.[field] || null
}

const validateAll = () => {
  const newValidationErrors = {}

  manualProducts.value.forEach(product => {
    const errors = validateProduct(product)
    if (Object.keys(errors).length > 0) {
      newValidationErrors[product.id] = errors
    }
  })

  validationErrors.value = newValidationErrors
  return Object.keys(newValidationErrors).length === 0
}

const addEmptyProduct = () => {
  const product = {
    id: `manual_${++productIdCounter}`,
  }

  formFields.value.forEach(field => {
    if (field.type === 'checkbox') {
      product[field.key] = field.default || false
    } else if (field.type === 'number') {
      product[field.key] = field.min || 0
    } else {
      product[field.key] = ''
    }
  })

  manualProducts.value.push(product)
}

const removeProduct = (index) => {
  const product = manualProducts.value[index]
  delete validationErrors.value[product.id]
  manualProducts.value.splice(index, 1)
}

const createAllProducts = async () => {
  if (!validateAll()) {
    alert('Please fix validation errors before creating products')
    return
  }

  creating.value = true
  createdCount.value = 0
  totalToCreate.value = manualProducts.value.length
  creationResults.value = []

  try {
    for (let i = 0; i < manualProducts.value.length; i++) {
      const product = manualProducts.value[i]

      try {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(product)
        })
        creationResults.value.push({
          index: i,
          product,
          success: true
        })
      } catch (err) {
        creationResults.value.push({
          index: i,
          product,
          success: false,
          error: err.message
        })
      }

      createdCount.value++
    }

    const successCount = creationResults.value.filter(r => r.success).length
    const failCount = totalToCreate.value - successCount

    if (failCount === 0) {
      alert(`Successfully created ${successCount} products`)
      resetManualProducts()
    } else {
      alert(`Created ${successCount} products, ${failCount} failed`)
    }
  } catch (err) {
    alert(`Bulk creation failed: ${err.message}`)
  } finally {
    creating.value = false
  }
}

const togglePasswordVisibility = (productId) => {
  showPasswords.value[productId] = !showPasswords.value[productId]
}

const resetManualProducts = () => {
  manualProducts.value = []
  validationErrors.value = {}
  creationResults.value = []
  createdCount.value = 0
  totalToCreate.value = 0
  productIdCounter = 0
  showPasswords.value = {}
}
</script>
