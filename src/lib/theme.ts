export const t = {
  bg:       "var(--color-bg)",
  surface:  "var(--color-surface)",
  surface2: "var(--color-surface2)",
  border:   "var(--color-border)",
  text:     "var(--color-text)",
  muted:    "var(--color-muted)",
  accent:   "var(--color-accent)",
  accent2:  "var(--color-accent2)",
  accentFg: "var(--color-accent-fg)",
} as const;

export const ts = {
  bg:      { backgroundColor: "var(--color-bg)" },
  surface: { backgroundColor: "var(--color-surface)" },
  surface2:{ backgroundColor: "var(--color-surface2)" },
  border:  { borderColor: "var(--color-border)" },
  text:    { color: "var(--color-text)" },
  muted:   { color: "var(--color-muted)" },
  accent:  { color: "var(--color-accent)" },
  accentBg:{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-fg)" },
} as const;
