import MainLayout from "@/layouts/MainLayout.vue";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: MainLayout,
      children: [
        {
          path: "",
          name: "home",
          component: () => import("@/views/HomeView.vue"),
          meta: { title: "Home" },
        },
        {
          path: "products",
          name: "products",
          component: () => import("@/views/Product/ProductsView.vue"),
          meta: { title: "Products" },
        },
        {
          path: "products/create",
          name: "create-product",
          component: () => import("@/views/Product/CreateProductView.vue"),
          meta: { title: "Create Product" },
        },
        {
          path: "orders",
          name: "orders",
          component: () => import("@/views/OrdersView.vue"),
          meta: { title: "Orders" },
        },
      ],
    },
  ],
});

router.beforeEach((to,from,next) => {
  document.title = to.meta.title || "Dashboard Vue";
  next();
});


export default router;
