import VenueLandingPage from "@/src/views/venue/VenueLandingPage";

export default async function VenuePage({ params }) {
  const { slug } = await params;
  return <VenueLandingPage slug={slug} />;
}
