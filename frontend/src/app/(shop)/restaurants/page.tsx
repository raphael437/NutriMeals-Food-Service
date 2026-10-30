import RestaurantMarketplace from "../../../components/shop/Restaurants";

// Dedicated route for browsing all approved restaurants.
export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <RestaurantMarketplace />
    </div>
  );
}
