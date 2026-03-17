import GuestCancelPage from "@/src/views/hotel/GuestCancelPage";

export default async function CancelPage({ params, searchParams }) {
  const { slug } = await params;
  const { token } = await searchParams;
  return <GuestCancelPage slug={slug} token={token} />;
}
