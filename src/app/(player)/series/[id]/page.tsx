import SeriesDetailClient from "./SeriesDetailClient";

export const dynamicParams = false;
export async function generateStaticParams() { return [{ id: "_" }]; }

export default function SeriesDetailPage() {
  return <SeriesDetailClient />;
}
