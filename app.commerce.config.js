const { defineConfig } = require("@adobe/aio-commerce-lib-app/config");

module.exports = defineConfig({
  adminUi: {
    menu: {
      description: "Displays enriched order data in Adobe Commerce Admin.",
      id: "order_enrichment_admin",
      label: "Order Enrichment",
      pageTitle: "Enriched Orders Dashboard",
    },
  },
  metadata: {
    description:
        "A custom Adobe Commerce application. Fill description for your app.",
    displayName: "product-enrichment",
    id: "product-enrichment",
    version: "1.0.1",
  },
});
