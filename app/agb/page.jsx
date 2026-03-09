"use client";
import { useRouter } from "next/navigation";
import { AGB } from "../../src/views/LegalPages";

export default function AGBPage() {
    const router = useRouter();
    return <AGB onBack={() => router.back()} />;
}
