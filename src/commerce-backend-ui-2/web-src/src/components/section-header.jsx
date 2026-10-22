/** Title block that tells the user which part of the app they are in. */
export function SectionHeader({ title, description, tag, tagColor }) {
  return (
    <header style={{ margin: "8px 0 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span
          style={{
            background: tagColor,
            color: "#fff",
            borderRadius: 12,
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {tag}
        </span>
      </div>
      <p style={{ margin: "6px 0 0", color: "#6e6e6e" }}>{description}</p>
    </header>
  );
}
