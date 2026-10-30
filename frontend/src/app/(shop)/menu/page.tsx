
import MenuCategory from "../../../components/sections/MenuCategories";

type PageProps = {
  params: Promise<{
    restaurantId: string;
    category: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { restaurantId, category } = await params;

  return (
    <MenuCategory
      restaurantId={restaurantId}
      category={category}
    />
  );
}
