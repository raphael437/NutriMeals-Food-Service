import crypto from "crypto";

const BASE_URL = "https://accept.paymob.com/api";

// Step 1 — exchange your API key for a short-lived auth token.
// This token is required on every other Paymob request.
async function getAuthToken() {
  const res = await fetch(`${BASE_URL}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
  });
  if (!res.ok) throw new Error("Paymob auth failed");
  const data = await res.json();
  return data.token;
}

// Step 2 — register the order with Paymob so they know the amount involved.
// amount_cents: Paymob works in the smallest currency unit, same gotcha as Stripe —
// 150.50 EGP must be sent as 15050.
async function registerOrder(authToken, { amountCents, merchantOrderId }) {
  const res = await fetch(`${BASE_URL}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: "EGP",
      merchant_order_id: merchantOrderId, // your own order id, useful for matching later
    }),
  });
  if (!res.ok) throw new Error("Paymob order registration failed");
  return res.json(); // includes Paymob's own numeric order id
}

// Step 3 — get a payment key scoped to this order + customer billing info.
// This key is what you hand to the hosted card-entry iframe.
async function getPaymentKey(authToken, { amountCents, paymobOrderId, billingData }) {
  const res = await fetch(`${BASE_URL}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: 3600, // seconds the key stays valid
      order_id: paymobOrderId,
      billing_data: billingData,
      currency: "EGP",
      integration_id: process.env.PAYMOB_CARD_INTEGRATION_ID,
    }),
  });
  if (!res.ok) throw new Error("Paymob payment key request failed");
  const data = await res.json();
  return data.token;
}

// Runs all three steps and returns the iframe URL the client should redirect to.
export async function createPaymobPayment({ order, user, address }) {
  const amountCents = Math.round(Number(order.total) * 100);

  const authToken = await getAuthToken();

  const paymobOrder = await registerOrder(authToken, {
    amountCents,
    merchantOrderId: order.id,
  });

  // Paymob requires real-looking billing fields — dummy values are fine in
  // test mode, but fill from your actual data wherever you have it.
  const billingData = {
    first_name: user.name?.split(" ")[0] || "Customer",
    last_name: user.name?.split(" ")[1] || "Customer",
    email: user.email,
    phone_number: user.phone || "+20000000000",
    country: "EG",
    city: address?.city || "Cairo",
    street: address?.line1 || "N/A",
    apartment: "N/A",
    floor: "N/A",
    building: "N/A",
    shipping_method: "N/A",
    postal_code: "N/A",
    state: "N/A",
  };

  const paymentToken = await getPaymentKey(authToken, {
    amountCents,
    paymobOrderId: paymobOrder.id,
    billingData,
  });

  const iframeUrl = `${BASE_URL}/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;

  return { iframeUrl, paymobOrderId: paymobOrder.id };
}

// Verifies the HMAC Paymob sends on their webhook callback, proving the
// request actually came from Paymob and wasn't forged by someone hitting
// your endpoint directly to fake a "payment succeeded" event.
export function verifyPaymobHmac(query, body) {
  const receivedHmac = query.hmac;
  if (!receivedHmac) return false;

  // Paymob's documented field order for the HMAC string — must match exactly.
  const orderedFields = [
    "amount_cents", "created_at", "currency", "error_occured",
    "has_parent_transaction", "id", "integration_id", "is_3d_secure",
    "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
    "is_voided", "order", "owner", "pending", "source_data_pan",
    "source_data_sub_type", "source_data_type", "success",
  ];

  const concatenated = orderedFields
    .map((field) => {
      if (field === "order") return body.obj.order.id;
      if (field.startsWith("source_data_")) {
        return body.obj.source_data[field.replace("source_data_", "")];
      }
      return body.obj[field];
    })
    .join("");

  const computedHmac = crypto
    .createHmac("sha512", process.env.PAYMOB_HMAC_SECRET)
    .update(concatenated)
    .digest("hex");

  return computedHmac === receivedHmac;
}