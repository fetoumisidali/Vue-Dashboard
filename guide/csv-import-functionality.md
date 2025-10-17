# CSV Import Functionality Guide

## Overview
This guide covers implementing CSV import functionality for bulk product creation in your Vue dashboard application.

## CSV Format Requirements

### Expected CSV Structure
```csv
Name,Price,Code,Category,Stock
Product 1,29.99,PROD001,Electronics,50
Product 2,15.50,PROD002,Clothing,100
Product 3,9.99,PROD003,Books,25
```

### Required Fields
- **Name** (string, required) - Product name
- **Price** (number, required) - Product price (decimal format)
- **Code** (string, optional) - Product SKU/Code
- **Category** (string, required) - Product category
- **Stock** (number, optional) - Initial stock quantity (defaults to 0)

## Implementation Steps

### 1. CSV Parser Component
```vue
<!-- src/components/BulkImport/BulkImportProduct.vue -->
<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <h3 class="text-lg font-medium mb-4">Bulk Import Products</h3>
    
    <!-- File Upload -->
    <div class="mb-4">
      <input
        ref="fileInput"
        type="file"
        accept=".csv"
        @change="handleFileChange"
        class="hidden"
      />
      <button
        @click="$refs.fileInput.click()"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Select CSV File
      </button>
    </div>

    <!-- File Info -->
    <div v-if="selectedFile" class="mb-4">
      <p class="text-sm text-gray-600">
        Selected: {{ selectedFile.name }}
      </p>
    </div>

    <!-- Import Preview -->
    <div v-if="parsedData.length > 0" class="space-y-4">
      <div class="flex justify-between items-center">
        <h4 class="font-medium">Preview ({{ parsedData.length }} products)</h4>
        <button
          @click="startImport"
          :disabled="importing"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {{ importing ? 'Importing...' : 'Import All' }}
        </button>
      </div>

      <!-- Validation Errors -->
      <div v-if="validationErrors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 class="font-medium text-red-800 mb-2">Validation Errors</h4>
        <ul class="text-sm text-red-600 space-y-1">
          <li v-for="error in validationErrors" :key="error.row">
            Row {{ error.row }}: {{ error.message }}
          </li>
        </ul>
      </div>

      <!-- Preview Table -->
      <div class="overflow-x-auto border border-gray-200 rounded-lg">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="p-2 text-left text-xs font-medium text-gray-500">Row</th>
              <th class="p-2 text-left text-xs font-medium text-gray-500">Name</th>
              <th class="p-2 text-left text-xs font-medium text-gray-500">Price</th>
              <th class="p-2 text-left text-xs font-medium text-gray-500">Code</th>
              <th class="p-2 text-left text-xs font-medium text-gray-500">Category</th>
              <th class="p-2 text-left text-xs font-medium text-gray-500">Stock</th>
              <th class="p-2 text-left text-xs font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="(product, index) in parsedData" :key="index" :class="{ 'bg-red-50': hasError(index) }">
              <td class="p-2 text-sm">{{ index + 2 }}</td>
              <td class="p-2 text-sm">{{ product.name }}</td>
              <td class="p-2 text-sm">${{ product.price }}</td>
              <td class="p-2 text-sm">{{ product.code || '-' }}</td>
              <td class="p-2 text-sm">{{ product.category }}</td>
              <td class="p-2 text-sm">{{ product.stock || 0 }}</td>
              <td class="p-2 text-sm">
                <span :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  hasError(index) ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                ]">
                  {{ hasError(index) ? 'Error' : 'Valid' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Progress -->
    <div v-if="importing" class="mt-4">
      <div class="bg-gray-200 rounded-full h-2">
        <div
          class="bg-blue-600 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${importProgress}%` }"
        ></div>
      </div>
      <p class="text-sm text-gray-600 mt-2">
        Importing: {{ importedCount }}/{{ totalToImport }} products
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProductStore } from '@/stores/products'
import { useNotifications } from '@/composables/useNotifications'
import { validateBulkProducts } from '@/composables/useValidation'

const productStore = useProductStore()
const { success, error } = useNotifications()

const fileInput = ref(null)
const selectedFile = ref(null)
const parsedData = ref([])
const validationErrors = ref([])
const importing = ref(false)
const importProgress = ref(0)
const importedCount = ref(0)

const hasError = (index) => {
  return validationErrors.value.some(err => err.row === index + 2)
}

const handleFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  selectedFile.value = file
  await parseCSV(file)
}

const parseCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target.result
        const lines = csv.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          throw new Error('CSV file must contain header and data rows')
        }

        const headers = lines[0].split(',').map(h => h.trim())
        const data = []

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          const product = {}

          headers.forEach((header, index) => {
            const value = values[index] || ''
            product[header.toLowerCase()] = value
          })

          // Convert numeric fields
          if (product.price) {
            product.price = parseFloat(product.price)
          }
          if (product.stock !== undefined && product.stock !== '') {
            product.stock = parseInt(product.stock)
          } else {
            product.stock = 0
          }

          data.push(product)
        }

        parsedData.value = data
        validateProducts()
        resolve()
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsText(file)
  })
}

const validateProducts = () => {
  const results = validateBulkProducts(parsedData.value)
  validationErrors.value = results
    .filter(result => !result.isValid)
    .flatMap(result => 
      Object.entries(result.errors).map(([field, message]) => ({
        row: result.index + 2,
        field,
        message
      }))
    )
}

const startImport = async () => {
  if (validationErrors.value.length > 0) {
    error('Please fix validation errors before importing')
    return
  }

  importing.value = true
  importedCount.value = 0
  const totalToImport = parsedData.value.length

  try {
    // Import in batches for better performance
    const batchSize = 10
    for (let i = 0; i < parsedData.value.length; i += batchSize) {
      const batch = parsedData.value.slice(i, i + batchSize)
      await productStore.createBulkProducts(batch)
      importedCount.value += batch.length
      importProgress.value = (importedCount.value / totalToImport) * 100

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    success(`Successfully imported ${importedCount.value} products`)
    resetForm()
  } catch (err) {
    error(`Import failed: ${err.message}`)
  } finally {
    importing.value = false
    importProgress.value = 0
  }
}

const resetForm = () => {
  selectedFile.value = null
  parsedData.value = []
  validationErrors.value = []
  fileInput.value.value = ''
}
</script>
```

### 2. CSV Template Download
```javascript
// src/utils/csvTemplate.js
export const generateProductTemplate = () => {
  const headers = ['Name', 'Price', 'Code', 'Category', 'Stock']
  const sampleData = [
    ['Sample Product 1', '29.99', 'PROD001', 'Electronics', '50'],
    ['Sample Product 2', '15.50', 'PROD002', 'Clothing', '100'],
    ['Sample Product 3', '9.99', 'PROD003', 'Books', '25']
  ]

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

export const downloadCSVTemplate = () => {
  const csvContent = generateProductTemplate()
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', 'products_template.csv')
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
```

### 3. Enhanced Product Store Import Method
```javascript
// src/stores/products.js (add to existing store)
const createBulkProducts = async (productsArray) => {
  loading.value = true
  error.value = null
  
  try {
    // Simulate API call - replace with actual API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Generate IDs for new products
    const newProducts = productsArray.map(product => ({
      ...product,
      id: Date.now() + Math.random(),
      createdAt: new Date().toISOString()
    }))
    
    products.value.push(...newProducts)
    return newProducts
  } catch (err) {
    error.value = err.message
    throw err
  } finally {
    loading.value = false
  }
}
```

### 4. Using in CreateProductView
```vue
<!-- src/views/Product/CreateProductView.vue -->
<template>
  <section class="space-y-4">
    <!-- Back Navigation -->
    <router-link :to="{ name: 'products' }" class="flex items-center gap-2 text-gray-600 hover:text-gray-900">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Products
    </router-link>

    <!-- Mode Tabs -->
    <div class="w-fit text-sm font-medium text-center text-gray-500 border-b border-gray-200">
      <ul class="flex flex-wrap space-x-2 -mb-px">
        <li>
          <button @click="mode = 'single'" :class="[
            'inline-block p-4 border-b-2 rounded-t-lg',
            mode === 'single' ? 'text-blue-600 border-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'
          ]">Single</button>
        </li>
        <li>
          <button @click="mode = 'bulk'" :class="[
            'inline-block p-4 border-b-2 rounded-t-lg',
            mode === 'bulk' ? 'text-blue-600 border-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'
          ]">Bulk</button>
        </li>
      </ul>
    </div>

    <h1 class="text-3xl text-center md:text-left">
      {{ mode === 'single' ? 'Create New Product' : 'Create Bulk Products' }}
    </h1>

    <!-- Single Product Form -->
    <div v-if="mode === 'single'" class="md:w-2/3 w-full bg-white p-6 space-y-8 rounded-lg border border-gray-200">
      <form @submit.prevent="createSingleProduct">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form-input v-model="singleProduct.name" label="Name" placeholder="Product name" required />
          <form-input v-model="singleProduct.price" label="Price" placeholder="0.00" type="number" step="0.01" min="0" required />
          <form-input v-model="singleProduct.code" label="Code" placeholder="Product CODE" />
          <form-input v-model="singleProduct.category" label="Category" placeholder="Category" required />
          <form-input v-model="singleProduct.stock" label="Stock" placeholder="0" type="number" step="1" min="0" />
        </div>
        <div class="flex gap-4 justify-end mt-8">
          <button type="button" @click="resetSingleForm" class="px-4 py-2 bg-white border border-red-500 text-red-500 rounded-lg hover:bg-red-50">
            Cancel
          </button>
          <button type="submit" :disabled="singleLoading" class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
            {{ singleLoading ? 'Creating...' : 'Create Product' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Bulk Import -->
    <div v-if="mode === 'bulk'" class="w-full">
      <BulkImportProduct />
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BulkImportProduct from '@/components/BulkImport/BulkImportProduct.vue'
import FormInput from '@/components/FormInput.vue'
import { useProductStore } from '@/stores/products'
import { useNotifications } from '@/composables/useNotifications'

const router = useRouter()
const productStore = useProductStore()
const { success } = useNotifications()

const mode = ref('single')
const singleProduct = ref({
  name: '',
  price: '',
  code: '',
  category: '',
  stock: ''
})
const singleLoading = ref(false)

const createSingleProduct = async () => {
  singleLoading.value = true
  try {
    await productStore.createProduct(singleProduct.value)
    success('Product created successfully')
    router.push({ name: 'products' })
  } catch (err) {
    // Error handled by store
  } finally {
    singleLoading.value = false
  }
}

const resetSingleForm = () => {
  singleProduct.value = {
    name: '',
    price: '',
    code: '',
    category: '',
    stock: ''
  }
}
</script>
```

## Error Handling

### Common CSV Import Errors
1. **Missing Headers**: CSV must have all required column headers
2. **Invalid Data Types**: Price must be numeric, stock must be non-negative integer
3. **Required Fields Missing**: Name, price, and category are required
4. **File Format**: Only CSV files are supported
5. **Large Files**: Consider limiting file size and implementing chunked uploads

### Validation Improvements
- Server-side validation for additional security
- Duplicate product code checking
- Category validation against existing categories
- Price range validation
- Stock level limits

## Performance Considerations

### For Large Imports
- Implement file size limits (e.g., 5MB)
- Use web workers for CSV parsing
- Implement backend batch processing
- Show progress indicators
- Allow import cancellation

### Database Optimization
- Use bulk insert operations
- Implement database transactions
- Consider async processing for very large imports

## Testing

### Test Cases
1. **Valid CSV**: All fields correct format
2. **Missing Required Fields**: Empty name, price, or category
3. **Invalid Numbers**: Non-numeric price or stock
4. **Large File**: Performance with 1000+ records
5. **Duplicate Codes**: Handling duplicate product codes
6. **Invalid Categories**: Category not in system
7. **Empty File**: File with headers only
8. **Malformed CSV**: Invalid CSV structure

This implementation provides a robust CSV import system with proper validation, error handling, and user feedback.
