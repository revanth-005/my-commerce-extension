import { useCallback, useEffect, useState } from "react";
import { useIms } from "@adobe/aio-commerce-lib-admin-ui/web";
import {
  Button,
  Content,
  Heading,
  InlineAlert,
  ProgressCircle,
} from "@react-spectrum/s2";

import { callAction } from "#web/api.js";
import { SectionHeader } from "#web/components/section-header.jsx";

const TIER_COLORS = {
  platinum: "#5b5b8a",
  gold: "#b8860b",
  silver: "#6e7b8b",
  bronze: "#a0522d",
};

const cellStyle = { padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #e6e6e6" };

function StatCard({ label, value, accent }) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        minWidth: 180,
        padding: 16,
        borderRadius: 8,
        border: "1px solid #d5d5d5",
        borderTop: `4px solid ${accent}`,
        background: "#fff",
      }}
    >
      <div style={{ color: "#6e6e6e", fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function TierChip({ tier }) {
  if (!tier) return "—";
  return (
    <span
      style={{
        background: TIER_COLORS[tier] || "#555",
        color: "#fff",
        borderRadius: 12,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        textTransform: "capitalize",
      }}
    >
      {tier}
    </span>
  );
}

/** Read-only view of orders processed by the order event consumer. */
export function OrdersDashboard() {
  const { data: ims, error: imsError } = useIms();
  if (imsError) {
    throw imsError;
  }

  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callAction("get-enriched-orders", ims);
      setOrders(result.orders || []);
      setSummary(result.summary || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ims?.imsToken]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ padding: "8px 0" }}>
      <SectionHeader
        title="Orders Dashboard"
        description="Orders processed by the order event consumer, with their value tier. This view is read-only."
        tag="Read-only"
        tagColor="#2d7ff9"
      />

      {error && (
        <div style={{ marginBottom: 16 }}>
          <InlineAlert variant="negative">
            <Heading>Could not load orders</Heading>
            <Content>{error}</Content>
          </InlineAlert>
        </div>
      )}

      {loading ? (
        <ProgressCircle isIndeterminate aria-label="Loading orders" />
      ) : (
        <>
          {summary && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard label="Total orders" value={summary.totalOrders} accent="#2d7ff9" />
              <StatCard
                label="Total revenue"
                value={`$${Number(summary.totalRevenue).toFixed(2)}`}
                accent="#2d9d78"
              />
              <StatCard label="High-value orders" value={summary.highValueCount} accent="#b8860b" />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: "0 0 8px" }}>Processed orders</h3>
            <Button variant="secondary" onPress={load}>
              Refresh
            </Button>
          </div>

          {orders.length === 0 ? (
            <p style={{ color: "#6e6e6e" }}>
              No enriched orders yet. Place an order in Commerce to see it here.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  {["Order #", "Status", "Total", "Tier", "Items", "Processed"].map((name) => (
                    <th key={name} style={cellStyle}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderId || order.incrementId}>
                    <td style={cellStyle}>{order.incrementId || order.orderId}</td>
                    <td style={cellStyle}>{order.status}</td>
                    <td style={cellStyle}>
                      {order.currency} {Number(order.grandTotal).toFixed(2)}
                    </td>
                    <td style={cellStyle}>
                      <TierChip tier={order.enrichment?.orderTier} />
                    </td>
                    <td style={cellStyle}>{order.itemCount ?? order.enrichment?.itemSummary?.length ?? 0}</td>
                    <td style={cellStyle}>
                      {order.processedAt ? new Date(order.processedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
