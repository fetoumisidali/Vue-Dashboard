# Making Mode Part of the Link

This guide explains how to make the mode (single/bulk) part of the URL in the Create Product view.

## Current Implementation

Currently, the mode is managed internally using a Vue ref:
```javascript
const mode = ref('single');
```

The buttons toggle between modes but don't change the URL, which means:
- Mode state is lost on page refresh
- Users can't bookmark specific modes
- Can't share direct links to specific modes

## Solution Options

### Option 1: Query Parameters (Recommended)

Use query parameters to track the mode in the URL.

**Route Structure:**
- `/products/create?mode=single` (default)
- `/products/create?mode=bulk`

**Implementation:**

1. **Update the component to use route query:**
```javascript
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();

const mode = computed({
  get: () => route.query.mode || 'single',
  set: (newMode) => {
    router.replace({
      query: { ...route.query, mode: newMode }
    });
  }
});
```

2. **Update the buttons:**
```html
<button @click="mode = 'single'" :class="[...]">Single</button>
<button @click="mode = 'bulk'" :class="[...]">Bulk</button>
```

3. **Update navigation links:**
```html
<router-link :to="{ name: 'create-product', query: { mode: 'bulk' } }">
  Create Bulk Products
</router-link>
```

**Pros:**
- Simple to implement
- Preserves other potential query parameters
- Backward compatible

### Option 2: Nested Routes

Create separate routes for each mode.

**Route Structure:**
- `/products/create/single`
- `/products/create/bulk`

**Router Configuration:**
```javascript
{
  path: "products/create",
  component: () => import("@/views/Product/CreateProductView.vue"),
  children: [
    {
      path: "single",
      name: "create-product-single",
      component: () => import("@/views/Product/CreateProductSingleView.vue"),
    },
    {
      path: "bulk", 
      name: "create-product-bulk",
      component: () => import("@/views/Product/CreateProductBulkView.vue"),
    }
  ]
}
```

**Pros:**
- Clean URLs
- Separate components if needed

**Cons:**
- More complex setup
- Component duplication or complex layout sharing

### Option 3: URL Path Parameter

Use a path parameter for the mode.

**Route Structure:**
- `/products/create/single`
- `/products/create/bulk`

**Router Configuration:**
```javascript
{
  path: "products/create/:mode(single|bulk)?",
  name: "create-product",
  component: () => import("@/views/Product/CreateProductView.vue"),
}
```

**Implementation:**
```javascript
const route = useRoute();
const mode = computed(() => route.params.mode || 'single');
```

**Pros:**
- Clean, semantic URLs
- Built-in validation

**Cons:**
- Requires route changes
- May need redirects for old URLs

## Recommended Implementation (Query Parameters)

Here's the complete implementation for Option 1:

**Updated Component Code:**
```javascript
import FormInput from '@/components/FormInput.vue';
import BulkProductForm from './components/BulkProductForm.vue';
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();

const mode = computed({
  get: () => route.query.mode || 'single',
  set: (newMode) => {
    if (newMode !== route.query.mode) {
      router.replace({
        name: 'create-product',
        query: { ...route.query, mode: newMode }
      });
    }
  }
});
```

**Benefits:**
- ✅ Mode is preserved in URL
- ✅ Bookmarking works correctly
- ✅ Back/forward navigation works
- ✅ Shareable links
- ✅ Minimal code changes
- ✅ Backward compatible

**Navigation Examples:**
```html
<!-- From Products page -->
<router-link 
  :to="{ name: 'create-product', query: { mode: 'bulk' } }"
  class="btn btn-primary"
>
  Create Bulk Products
</router-link>

<!-- From anywhere -->
<router-link 
  :to="{ path: '/products/create', query: { mode: 'single' } }"
>
  Create Single Product
</router-link>
```

## Migration Steps

1. Update CreateProductView.vue with route-aware mode
2. Update any navigation links that should point to specific modes
3. Test all navigation scenarios
4. Consider adding a redirect for old bookmarked URLs

## URL Examples After Implementation

- Single mode: `https://yourdomain.com/products/create?mode=single`
- Bulk mode: `https://yourdomain.com/products/create?mode=bulk`
- Default (no mode specified): `https://yourdomain.com/products/create` (shows single mode)
