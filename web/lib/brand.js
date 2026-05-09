export const BRAND = {
  name: "MotorXLive",

  colors: {
    bg: "#0B0F14",
    surface: "#11161C",
    surface2: "#0F141A",
    border: "#1F2937",
    border2: "#2A3647",

    text: "#F5F7FA",
    muted: "#9AA4AF",

    blue: "#00E5FF",
    green: "#00FF9D",
    red: "#FF0033",
    yellow: "#FFD28B",
  },

  gradients: {
    primary: "linear-gradient(135deg, #00E5FF, #00FF9D)",
    live: "linear-gradient(135deg, #FF0033, #FF6600)",
  },

  radius: {
    sm: 8,
    md: 10,
    lg: 14,
    xl: 16,
  },

  shadow: {
    glowBlue: "0 0 18px rgba(0, 229, 255, 0.25)",
    glowGreen: "0 0 18px rgba(0, 255, 157, 0.2)",
    glowRed: "0 0 18px rgba(255, 0, 51, 0.35)",
  },
};

export const brandStyles = {
  page: {
    minHeight: "100vh",
    background: BRAND.colors.bg,
    color: BRAND.colors.text,
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },

  panel: {
    background: BRAND.colors.surface,
    border: `1px solid ${BRAND.colors.border}`,
    borderRadius: BRAND.radius.lg,
  },

  input: {
    background: BRAND.colors.surface2,
    border: `1px solid ${BRAND.colors.border2}`,
    color: BRAND.colors.text,
    borderRadius: BRAND.radius.md,
    padding: "12px 14px",
  },

  buttonPrimary: {
    background: BRAND.gradients.primary,
    color: "#020617",
    border: 0,
    borderRadius: BRAND.radius.md,
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 800,
  },

  buttonSecondary: {
    background: "#1B2A40",
    color: BRAND.colors.text,
    border: "1px solid #31598B",
    borderRadius: BRAND.radius.md,
    padding: "12px 14px",
    cursor: "pointer",
  },

  liveBadge: {
    background: BRAND.gradients.live,
    color: "#fff",
    fontWeight: 900,
    letterSpacing: 0.7,
    boxShadow: BRAND.shadow.glowRed,
  },
};