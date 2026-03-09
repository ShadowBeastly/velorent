"use client";
import { useRouter } from "next/navigation";
import { Impressum } from "../../src/views/LegalPages";

export default function ImpressumPage() {
    const router = useRouter();
    return <Impressum onBack={() => router.back()} />;
}
