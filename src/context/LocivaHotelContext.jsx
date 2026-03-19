"use client";
import { createContext, useContext } from "react";

const LocivaHotelContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useLocivaHotel() {
    const ctx = useContext(LocivaHotelContext);
    if (!ctx) throw new Error("useLocivaHotel must be used inside LocivaLayout");
    return ctx;
}

export default LocivaHotelContext;
