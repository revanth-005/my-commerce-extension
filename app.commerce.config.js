const { defineConfig } = require("@adobe/aio-commerce-lib-app/config");

module.exports = defineConfig({
  adminUi: {
    menu: {
      description: "Monitor enriched orders and configure product badge rules.",
      id: "order_enrichment_admin",
      label: "Product Enrichment",
      pageTitle: "Product Enrichment",
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
