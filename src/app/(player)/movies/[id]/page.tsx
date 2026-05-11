import MovieDetailClient from "./MovieDetailClient";

export const dynamicParams = false;
export async function generateStaticParams() { return [{ id: "_" }]; }

export default function MovieDetailPage() {
  return <MovieDetailClient />;
}
