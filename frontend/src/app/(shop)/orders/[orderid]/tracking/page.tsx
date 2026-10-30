import OrderTrackingPage from "../../../../../components/shop/OrderTrackingPage";

type OrderPageProps = {
  params: Promise<{ orderid: string }>;
};

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderid } = await params;

  console.log("Tracking order ID:", orderid);

  if (!orderid) {
    return <p>Order ID is missing from the URL.</p>;
  }

  return <OrderTrackingPage orderId={orderid} />;
}