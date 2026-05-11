import PlayerPageClient from "./PlayerPageClient";

export const dynamicParams = true;
export async function generateStaticParams() { return [{ id: "_" }]; }

export default function PlayerPage() {
  return <PlayerPageClient />;
}
