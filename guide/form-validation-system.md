# Form Validation System Guide

## Overview
This guide covers implementing a comprehensive form validation system for your Vue dashboard application using both client-side and server-side validation.

## Validation Architecture

### 1. Validation Utils
```javascript
// src/utils/validators.js
import { VALIDATION_RULES } from './constants.js'

export const isRequired = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'number') return !isNaN(value)
  if (Array.isArray(value)) return value.length > 0
  return true
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

export const isValidUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const isValidCode = (code) => {
  if (!code) return true // Optional field
  const codeRegex = /^[A-Z0-9-_]{3,50}$/i
  return codeRegex.test(code)
}

export const isUniqueCode = (code, existingCodes = []) => {
  if (!code) return true // Optional field
  return !existingCodes.includes(code.toUpperCase())
}

export const isValidCategory = (category, allowedCategories = []) => {
  if (!category) return false
  return allowedCategories.includes(category)
}

export const validateMinLength = (value, min) => {
  return value && value.length >= min
}

export const validateMaxLength = (value, max) => {
  return !value || value.length <= max
}

export const validateRange = (value, min, max) => {
  const num = parseFloat(value)
  return !isNaN(num) && num >= min && num <= max
}
```

### 2. Validation Rules Constants
```javascript
// src/utils/constants.js (add to existing)
export const VALIDATION_RULES = {
  PRODUCT: {
    NAME_MIN_LENGTH: 3,
    NAME_MAX_LENGTH: 100,
    PRICE_MIN: 0.01,
    PRICE_MAX: 999999.99,
    STOCK_MIN: 0,
    STOCK_MAX: 999999,
    CODE_MIN_LENGTH: 3,
    CODE_MAX_LENGTH: 50
  },
  CATEGORY: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    DESCRIPTION_MAX_LENGTH: 500
  },
  ORDER: {
    QUANTITY_MIN: 1,
    QUANTITY_MAX: 1000
  },
  USER: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    EMAIL_MAX_LENGTH: 100,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128
  }
}

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_URL: 'Please enter a valid URL',
  INVALID_NUMBER: 'Please enter a valid number',
  POSITIVE_NUMBER: 'This value must be greater than 0',
  NON_NEGATIVE: 'This value cannot be negative',
  MIN_LENGTH: 'Must be at least {min} characters',
  MAX_LENGTH: 'Must not exceed {max} characters',
  INVALID_RANGE: 'Must be between {min} and {max}',
  INVALID_CODE: 'Only letters, numbers, hyphens, and underscores allowed',
  UNIQUE_CODE: 'This code already exists',
  INVALID_CATEGORY: 'Please select a valid category'
}
```

### 3. Validation Composable
```typescript
// src/composables/useValidation.js
import { ref, computed } from 'vue'
import { VALIDATION_RULES, VALIDATION_MESSAGES } from '@/utils/constants.js'
import * as validators from '@/utils/validators.js'

export const useValidation = () => {
  const errors = ref({})
  const isValid = computed(() => Object.keys(errors.value).length === 0)

  const validateField = (field, value, rules, context = {}) => {
    const fieldErrors = []

    for (const rule of rules) {
      const { type, params, message } = rule

      switch (type) {
        case 'required':
          if (!validators.isRequired(value)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.REQUIRED)
          }
          break

        case 'email':
          if (value && !validators.isValidEmail(value)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.INVALID_EMAIL)
          }
          break

        case 'phone':
          if (value && !validators.isValidPhone(value)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.INVALID_PHONE)
          }
          break

        case 'numeric':
          if (value && !validators.isNumeric(value)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.INVALID_NUMBER)
          }
          break

        case 'positive':
          if (value && !validators.isPositive(value)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.POSITIVE_NUMBER)
          }
          break

        case 'nonNegative':
          if (value && !validators.isNonNegative(value)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.NON_NEGATIVE)
          }
          break

        case 'minLength':
          if (value && !validators.validateMinLength(value, params.min)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.MIN_LENGTH.replace('{min}', params.min))
          }
          break

        case 'maxLength':
          if (value && !validators.validateMaxLength(value, params.max)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.MAX_LENGTH.replace('{max}', params.max))
          }
          break

        case 'range':
          if (value && !validators.validateRange(value, params.min, params.max)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.INVALID_RANGE.replace('{min}', params.min).replace('{max}', params.max))
          }
          break

        case 'code':
          if (value && !validators.isValidCode(value)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.INVALID_CODE)
          }
          break

        case 'uniqueCode':
          if (!validators.isUniqueCode(value, context.existingCodes)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.UNIQUE_CODE)
          }
          break

        case 'category':
          if (!validators.isValidCategory(value, context.allowedCategories)) {
            fieldErrors.push(message || VALIDATION_MESSAGES.INVALID_CATEGORY)
          }
          break

        case 'custom':
          if (params.validator && !params.validator(value, context)) {
            fieldErrors.push(message)
          }
          break
      }
    }

    if (fieldErrors.length > 0) {
      errors.value[field] = fieldErrors
    } else {
      delete errors.value[field]
    }

    return fieldErrors.length === 0
  }

  const validateForm = (formData, validationSchema, context = {}) => {
    let allValid = true

    for (const [field, rules] of Object.entries(validationSchema)) {
      const fieldValid = validateField(field, formData[field], rules, context)
      if (!fieldValid) {
        allValid = false
      }
    }

    return allValid
  }

  const clearErrors = (field = null) => {
    if (field) {
      delete errors.value[field]
    } else {
      errors.value = {}
    }
  }

  const setError = (field, message) => {
    errors.value[field] = [message]
  }

  const setErrors = (newErrors) => {
    errors.value = { ...errors.value, ...newErrors }
  }

  return {
    errors,
    isValid,
    validateField,
    validateForm,
    clearErrors,
    setError,
    setErrors
  }
}
```

### 4. Form Validation Schemas
```javascript
// src/validation/schemas.js
export const productValidationSchema = {
  name: [
    { type: 'required' },
    { type: 'minLength', params: { min: 3 } },
    { type: 'maxLength', params: { max: 100 } }
  ],
  price: [
    { type: 'required' },
    { type: 'numeric' },
    { type: 'positive' },
    { type: 'range', params: { min: 0.01, max: 999999.99 } }
  ],
  code: [
    { type: 'code' },
    { 
      type: 'uniqueCode', 
      message: 'This product code already exists'
    }
  ],
  category: [
    { type: 'required' }
  ],
  stock: [
    { type: 'numeric' },
    { type: 'nonNegative' },
    { type: 'range', params: { min: 0, max: 999999 } }
  ]
}

export const categoryValidationSchema = {
  name: [
    { type: 'required' },
    { type: 'minLength', params: { min: 2 } },
    { type: 'maxLength', params: { max: 50 } }
  ],
  description: [
    { type: 'maxLength', params: { max: 500 } }
  ]
}

export const orderValidationSchema = {
  items: [
    { type: 'required' }
  ],
  customerEmail: [
    { type: 'email' }
  ],
  customerPhone: [
    { type: 'phone' }
  ]
}

export const userValidationSchema = {
  name: [
    { type: 'required' },
    { type: 'minLength', params: { min: 2 } },
    { type: 'maxLength', params: { max: 50 } }
  ],
  email: [
    { type: 'required' },
    { type: 'email' }
  ],
  password: [
    { type: 'required' },
    { type: 'minLength', params: { min: 8 } },
    { type: 'maxLength', params: { max: 128 } },
    { 
      type: 'custom', 
      params: { 
        validator: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value),
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      }
    }
  ]
}
```

### 5. Validated Form Input Component
```vue
<!-- src/components/ValidatedFormInput.vue -->
<template>
  <div>
    <label :for="id" class="block text-sm font-medium text-gray-700 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500',
        hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
      ]"
      @input="handleInput"
      @blur="handleBlur"
    />
    
    <div v-if="hasError" class="mt-2">
      <p v-for="error in errors" :key="error" class="text-sm text-red-600">
        {{ error }}
      </p>
    </div>
    
    <p v-else-if="hint" class="mt-1 text-sm text-gray-500">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
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
  hint: {
    type: String,
    default: ''
  },
  errors: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const id = computed(() => `input-${props.name}`)

const hasError = computed(() => props.errors && props.errors.length > 0)

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const handleBlur = () => {
  emit('blur', props.name)
}
</script>
```

### 6. Enhanced Form Component
```vue
<!-- src/components/FormComponent.vue -->
<template>
  <form @submit.prevent="handleSubmit" novalidate>
    <ValidatedFormInput
      v-for="field in fields"
      :key="field.name"
      v-model="formData[field.name]"
      :name="field.name"
      :label="field.label"
      :type="field.type || 'text'"
      :placeholder="field.placeholder"
      :required="field.required"
      :disabled="field.disabled"
      :hint="field.hint"
      :errors="validationErrors[field.name]"
      @blur="validateField"
    />
    
    <slot name="actions" :is-valid="isFormValid" :submit="handleSubmit" :loading="loading">
      <button
        type="submit"
        :disabled="!isFormValid || loading"
        class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {{ loading ? 'Processing...' : submitText }}
      </button>
    </slot>
  </form>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import ValidatedFormInput from './ValidatedFormInput.vue'
import { useValidation } from '@/composables/useValidation.js'

const props = defineProps({
  fields: {
    type: Array,
    required: true
  },
  validationSchema: {
    type: Object,
    required: true
  },
  submitText: {
    type: String,
    default: 'Submit'
  },
  initialData: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  validationContext: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['submit', 'submit-success', 'submit-error'])

const { errors: validationErrors, validateForm, validateField, setErrors } = useValidation()

const formData = reactive(
  Object.fromEntries(
    props.fields.map(field => [field.name, props.initialData[field.name] || ''])
  )
)

const isFormValid = computed(() => Object.keys(validationErrors.value).length === 0)

const handleSubmit = async () => {
  const isValid = validateForm(formData, props.validationSchema, props.validationContext)
  
  if (!isValid) {
    return
  }

  try {
    await props.onSubmit?.(formData)
    emit('submit-success', formData)
  } catch (err) {
    // Handle server validation errors
    if (err.response?.data?.errors) {
      setErrors(err.response.data.errors)
    }
    emit('submit-error', err)
  }
}

const validateField = (fieldName) => {
  const rules = props.validationSchema[fieldName]
  if (rules) {
    validateField(fieldName, formData[fieldName], rules, props.validationContext)
  }
}

// Expose form data for parent component
defineExpose({
  formData,
  validateForm,
  isFormValid
})
</script>
```

### 7. Usage Examples

#### Product Form
```vue
<!-- src/views/Product/CreateProductView.vue -->
<template>
  <FormComponent
    :fields="productFields"
    :validation-schema="productValidationSchema"
    :validation-context="{ existingCodes: existingProductCodes }"
    submit-text="Create Product"
    :loading="loading"
    @submit="createProduct"
    @submit-success="handleSuccess"
    @submit-error="handleError"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import FormComponent from '@/components/FormComponent.vue'
import { productFields, productValidationSchema } from '@/validation/schemas.js'
import { useProductStore } from '@/stores/products'
import { useNotifications } from '@/composables/useNotifications'

const productStore = useProductStore()
const { success, error } = useNotifications()

const loading = ref(false)

const productFields = [
  { name: 'name', label: 'Product Name', placeholder: 'Enter product name', required: true },
  { name: 'price', label: 'Price', type: 'number', placeholder: '0.00', required: true },
  { name: 'code', label: 'Product Code', placeholder: 'PROD001' },
  { name: 'category', label: 'Category', placeholder: 'Select category', required: true },
  { name: 'stock', label: 'Stock', type: 'number', placeholder: '0' }
]

const existingProductCodes = computed(() => 
  productStore.products.map(p => p.code).filter(Boolean)
)

const createProduct = async (formData) => {
  loading.value = true
  try {
    await productStore.createProduct(formData)
  } finally {
    loading.value = false
  }
}

const handleSuccess = () => {
  success('Product created successfully!')
  // Navigate or reset form
}

const handleError = (err) => {
  error(err.message || 'Failed to create product')
}
</script>
```

## Advanced Features

### 1. Async Validation
```javascript
// Add to useValidation composable
const validateFieldAsync = async (field, value, rules, context = {}) => {
  for (const rule of rules) {
    if (rule.type === 'async') {
      try {
        const isValid = await rule.validator(value, context)
        if (!isValid) {
          errors.value[field] = [rule.message]
          return false
        }
      } catch (err) {
        errors.value[field] = [err.message || 'Validation failed']
        return false
      }
    }
  }
  return true
}

// Usage example: Check if product code is unique
const asyncValidationRules = {
  code: [
    { 
      type: 'async',
      validator: async (code) => {
        if (!code) return true
        const isUnique = await productStore.checkCodeUnique(code)
        return isUnique
      },
      message: 'This product code is already in use'
    }
  ]
}
```

### 2. Debounced Validation
```javascript
// Add to useValidation composable
import { debounce } from 'lodash-es'

const debouncedValidation = ref({})

const validateFieldDebounced = debounce((field, value, rules, context) => {
  validateField(field, value, rules, context)
}, 300)

// Update the ValidatedFormInput to use debounced validation
const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
  
  // Debounced validation during typing
  if (props.debounceValidation) {
    validateFieldDebounced(props.name, event.target.value, rules, context)
  }
}
```

### 3. Form Progress Indicator
```vue
<!-- src/components/FormProgress.vue -->
<template>
  <div class="mb-4">
    <div class="flex justify-between text-sm text-gray-600 mb-2">
      <span>Form Completion</span>
      <span>{{ completionPercentage }}%</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2">
      <div
        class="bg-blue-600 h-2 rounded-full transition-all duration-300"
        :style="{ width: `${completionPercentage}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  formData: Object,
  requiredFields: Array,
  validationErrors: Object
})

const completedFields = computed(() => {
  return props.requiredFields.filter(field => 
    props.formData[field] && !props.validationErrors[field]
  ).length
})

const completionPercentage = computed(() => {
  return Math.round((completedFields.value / props.requiredFields.length) * 100)
})
</script>
```

## Testing Strategy

### Unit Tests
```javascript
// tests/unit/validation.test.js
import { describe, it, expect } from 'vitest'
import { useValidation } from '@/composables/useValidation.js'
import { productValidationSchema } from '@/validation/schemas.js'

describe('Form Validation', () => {
  it('should validate required fields', () => {
    const { validateForm } = useValidation()
    const formData = { name: '', price: '', category: '' }
    
    const isValid = validateForm(formData, productValidationSchema)
    expect(isValid).toBe(false)
  })
  
  it('should validate positive numbers', () => {
    const { validateField } = useValidation()
    const isValid = validateField('price', -10, [{ type: 'positive' }])
    expect(isValid).toBe(false)
  })
})
```

This comprehensive validation system provides robust form handling with real-time feedback, async validation support, and maintainable validation rules.
