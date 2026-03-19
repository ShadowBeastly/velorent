/**
 * RentCore Booking Widget. Entry Point
 *
 * Finds all <div data-rentcore-tenant="..."> elements on the host page
 * and mounts a React root in each one with the props from data attributes.
 *
 * Usage on any website:
 *   <div data-rentcore-tenant="YOUR_ORG_ID"
 *        data-theme="light"
 *        data-lang="de"
 *        data-primary-color="#1A7D5A"
 *        data-api-base="https://rentcore.de">
 *   </div>
 *   <script src="https://rentcore.de/widget/embed.js" async></script>
 */

import React from "react";
import { createRoot } from "react-dom/client";
import RentCoreWidget from "./RentCoreWidget";

function mountWidget(el) {
  const tenant       = el.dataset.rentcoreTenant;
  const theme        = el.dataset.theme        || "light";
  const lang         = el.dataset.lang         || "de";
  const primaryColor = el.dataset.primaryColor || "#1A7D5A";
  // Allow overriding the API base (e.g. during local dev)
  const apiBase      = el.dataset.apiBase      || "https://rentcore.de";

  if (!tenant) {
    console.warn("[RentCore Widget] Missing data-rentcore-tenant on", el);
    return;
  }

  const root = createRoot(el);
  root.render(
    <React.StrictMode>
      <RentCoreWidget
        tenant={tenant}
        theme={theme}
        lang={lang}
        primaryColor={primaryColor}
        apiBase={apiBase}
      />
    </React.StrictMode>
  );
}

function init() {
  const containers = document.querySelectorAll("[data-rentcore-tenant]");
  containers.forEach(mountWidget);
}

// Run after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
