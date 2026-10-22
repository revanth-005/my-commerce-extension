import { useEffect, useState } from "react";
import { useIms } from "@adobe/aio-commerce-lib-admin-ui/web";
import {
  Button,
  Content,
  Heading,
  InlineAlert,
  NumberField,
  ProgressCircle,
  Switch,
} from "@react-spectrum/s2";

import { callAction } from "#web/api.js";

const cardStyle = {
  border: "1px solid #d5d5d5",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  maxWidth: 520,
};

function RuleCard({ title, description, enabled, onToggle, children }) {
  return (
    <section style={cardStyle}>
      <Switch isSelected={enabled} onChange={onToggle}>
        {title}
      </Switch>
      <p style={{ margin: 0, color: "#6e6e6e" }}>{description}</p>
      {children}
    </section>
  );
}

/** Settings form where a merchant tunes the product badge rules. */
export function BadgeSettings() {
  const { data: ims, error: imsError } = useIms();
  if (imsError) {
    throw imsError;
  }

  const [config, setConfig] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    callAction("get-badge-config", ims)
      .then((result) => {
        setConfig(result.config);
        setDefaults(result.defaults);
        setUpdatedAt(result.updatedAt);
      })
      .catch((error) => setAlert({ variant: "negative", text: error.message }));
  }, [ims?.imsToken]);

  if (!config) {
    return alert ? (
      <InlineAlert variant={alert.variant}>
        <Heading>Could not load settings</Heading>
        <Content>{alert.text}</Content>
      </InlineAlert>
    ) : (
      <ProgressCircle isIndeterminate aria-label="Loading badge settings" />
    );
  }

  const update = (section, field, value) =>
    setConfig((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));

  const numbersAreValid = [
    config.newBadge.days,
    config.saleBadge.minDiscountPercent,
    config.lowStockBadge.threshold,
  ].every(Number.isFinite);

  const save = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const result = await callAction("save-badge-config", ims, { config });
      setConfig(result.config);
      setUpdatedAt(result.updatedAt);
      setAlert({
        variant: "positive",
        text: "Saved. New rules apply to products the next time they are saved.",
      });
    } catch (error) {
      setAlert({ variant: "negative", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Product badge settings</h1>
      <p>
        Choose when the storefront shows the NEW, SALE and LOW STOCK badges.
        {updatedAt ? ` Last saved ${new Date(updatedAt).toLocaleString()}.` : " Showing default settings."}
      </p>

      <RuleCard
        title="NEW badge"
        description="Show for products created within this many days."
        enabled={config.newBadge.enabled}
        onToggle={(value) => update("newBadge", "enabled", value)}
      >
        <NumberField
          label="Days"
          value={config.newBadge.days}
          onChange={(value) => update("newBadge", "days", value)}
          minValue={1}
          maxValue={365}
          step={1}
          isDisabled={!config.newBadge.enabled}
        />
      </RuleCard>

      <RuleCard
        title="SALE badge"
        description="Show when a special price is set and the discount is at least this percentage."
        enabled={config.saleBadge.enabled}
        onToggle={(value) => update("saleBadge", "enabled", value)}
      >
        <NumberField
          label="Minimum discount (%)"
          value={config.saleBadge.minDiscountPercent}
          onChange={(value) => update("saleBadge", "minDiscountPercent", value)}
          minValue={0}
          maxValue={100}
          isDisabled={!config.saleBadge.enabled}
        />
      </RuleCard>

      <RuleCard
        title="LOW STOCK badge"
        description="Show when the quantity left is above zero and at or below this number."
        enabled={config.lowStockBadge.enabled}
        onToggle={(value) => update("lowStockBadge", "enabled", value)}
      >
        <NumberField
          label="Quantity threshold"
          value={config.lowStockBadge.threshold}
          onChange={(value) => update("lowStockBadge", "threshold", value)}
          minValue={1}
          maxValue={10000}
          step={1}
          isDisabled={!config.lowStockBadge.enabled}
        />
      </RuleCard>

      {alert && (
        <div style={{ maxWidth: 520, marginBottom: 16 }}>
          <InlineAlert variant={alert.variant}>
            <Heading>{alert.variant === "positive" ? "Settings saved" : "Could not save"}</Heading>
            <Content>{alert.text}</Content>
          </InlineAlert>
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <Button variant="accent" onPress={save} isPending={saving} isDisabled={!numbersAreValid}>
          Save settings
        </Button>
        <Button variant="secondary" onPress={() => setConfig(defaults)} isDisabled={saving}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
