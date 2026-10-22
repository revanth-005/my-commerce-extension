import { Tab, TabList, TabPanel, Tabs } from "@react-spectrum/s2";

import { BadgeSettings } from "#web/components/badge-settings.jsx";
import { OrdersDashboard } from "#web/components/orders-dashboard.jsx";

/** Entrypoint for the main page of the app. */
export function MainPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ margin: 0 }}>Product Enrichment</h1>
      <p style={{ margin: "4px 0 20px", color: "#6e6e6e" }}>
        Monitor enriched orders and manage how product badges appear on the storefront.
      </p>

      <Tabs aria-label="Product Enrichment sections" defaultSelectedKey="dashboard">
        <TabList>
          <Tab id="dashboard">Orders Dashboard</Tab>
          <Tab id="settings">Badge Settings</Tab>
        </TabList>
        <TabPanel id="dashboard">
          <OrdersDashboard />
        </TabPanel>
        <TabPanel id="settings">
          <BadgeSettings />
        </TabPanel>
      </Tabs>
    </main>
  );
}
