import RestaurantDetails from '@/src/components/shop/RestaurantDetails';
type PageProps = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { restaurantId } = await params;

  console.log('Restaurant route params:', { restaurantId });

  return (
    <main className="min-h-screen bg-background">
      <RestaurantDetails restaurantId={restaurantId} />
    </main>
  );
}
