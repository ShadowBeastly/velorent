// app/kiosk/layout.jsx
// Fullscreen kiosk layout — no sidebar, no header, no auth guard.
// Designed for touch screens at point-of-sale.

export const metadata = {
  title: "RentCore Kiosk",
  description: "Self-service bike rental kiosk",
};

export default function KioskLayout({ children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#ffffff",
        overflow: "hidden",
        fontSize: "18px",
        touchAction: "manipulation",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {children}
    </div>
  );
}
