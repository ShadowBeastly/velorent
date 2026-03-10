import React from 'react';
import ReactDOM from 'react-dom/client';
import RentCoreBookingWidget from '../components/widget/BookingWidget';

// ============ STANDALONE EMBED SCRIPT ============
// Für Hotels die nur ein Script einbinden wollen
export function initRentCoreWidget(containerId, options) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("RentCore: Container not found:", containerId);
        return;
    }

    // React dynamisch laden falls nicht vorhanden
    if (typeof React === "undefined") {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/react@18/umd/react.production.min.js";
        script.onload = () => {
            const script2 = document.createElement("script");
            script2.src = "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js";
            script2.onload = () => renderWidget(container, options);
            document.head.appendChild(script2);
        };
        document.head.appendChild(script);
    } else {
        renderWidget(container, options);
    }
}

function renderWidget(container, options) {
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(RentCoreBookingWidget, options));
}
