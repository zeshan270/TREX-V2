import BrowseCategoryClient from "./BrowseCategoryClient";

export const dynamicParams = true;
export async function generateStaticParams() { return [{ type: "_", categoryId: "_" }]; }

export default function BrowseCategoryPage() {
  return <BrowseCategoryClient />;
}
