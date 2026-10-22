const { defineConfig } = require("@adobe/aio-commerce-lib-app/config");

module.exports = defineConfig({
  adminUi: {
    menu: {
      description: "Lets merchants configure product badge rules and thresholds.",
      id: "order_enrichment_admin",
      label: "Badge Settings",
      pageTitle: "Product Badge Settings",
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
