import DeviceDetailClient from "./DeviceDetailClient";

export const dynamicParams = true;
export async function generateStaticParams() { return [{ id: "_" }]; }

export default function DeviceDetailPage() {
  return <DeviceDetailClient />;
}
