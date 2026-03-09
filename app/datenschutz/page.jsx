"use client";
import { useRouter } from "next/navigation";
import { Datenschutz } from "../../src/views/LegalPages";

export default function DatenschutzPage() {
    const router = useRouter();
    return <Datenschutz onBack={() => router.back()} />;
}
