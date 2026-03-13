import HotelLandingPage from "@/src/views/hotel/HotelLandingPage";

export default async function HotelPage({ params }) {
  const { slug } = await params;
  return <HotelLandingPage slug={slug} />;
}
