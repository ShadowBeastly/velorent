import KioskView from "@/src/views/kiosk/KioskView";

export default async function KioskPage({ searchParams }) {
  const params = await searchParams;
  const orgId = params?.org || null;
  return <KioskView orgId={orgId} />;
}
