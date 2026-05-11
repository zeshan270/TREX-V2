import BrowseCategoryClient from "./BrowseCategoryClient";

export const dynamicParams = false;
export async function generateStaticParams() { return [{ type: "_", categoryId: "_" }]; }

export default function BrowseCategoryPage() {
  return <BrowseCategoryClient />;
}
