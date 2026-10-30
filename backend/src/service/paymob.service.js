import crypto from "node:crypto";

const BASE_URL = process.env.PAYMOB_BASE_URL || "https://accept.paymob.com/api";

async function postPaymob(path, payload) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Paymob request failed (${response.status}) at ${path}${detail ? `: ${detail}` : ""}`);
  }

  return response.json();
}

async function getAuthToken() {
  if (!process.env.PAYMOB_API_KEY) {
    throw new Error("PAYMOB_API_KEY is not configured.");
  }
  const data = await postPaymob("/auth/tokens", {
    api_key: process.env.PAYMOB_API_KEY,
  });
  if (!data.token) throw new Error("Paymob did not return an auth token.");
  return data.token;
}

async function registerOrder(authToken, { amountCents, merchantOrderId }) {
  return postPaymob("/ecommerce/orders", {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: "EGP",
    merchant_order_id: merchantOrderId,
  });
}

async function getPaymentKey(authToken, {
  amountCents,
  paymobOrderId,
  billingData,
}) {
  if (!process.env.PAYMOB_CARD_INTEGRATION_ID) {
    throw new Error("PAYMOB_CARD_INTEGRATION_ID is not configured.");
  }

  const data = await postPaymob("/acceptance/payment_keys", {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: paymobOrderId,
    billing_data: billingData,
    currency: "EGP",
    integration_id: Number(process.env.PAYMOB_CARD_INTEGRATION_ID),
  });

  if (!data.token) throw new Error("Paymob did not return a payment key.");
  return data.token;
}

export async function createPaymobPayment({ order, user, address }) {
  const amountCents = Math.round(Number(order.total) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("Order total is invalid for Paymob checkout.");
  }
  if (!process.env.PAYMOB_IFRAME_ID) {
    throw new Error("PAYMOB_IFRAME_ID is not configured.");
  }

  const authToken = await getAuthToken();
  const paymobOrder = await registerOrder(authToken, {
    amountCents,
    merchantOrderId: order.id,
  });

  const nameParts = (user.name || "Customer").trim().split(/\s+/);
  const billingData = {
    first_name: nameParts[0] || "Customer",
    last_name: nameParts.slice(1).join(" ") || "Customer",
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

  const iframeUrl = `${BASE_URL}/acceptance/iframes/${encodeURIComponent(process.env.PAYMOB_IFRAME_ID)}?payment_token=${encodeURIComponent(paymentToken)}`;
  return { iframeUrl, paymobOrderId: paymobOrder.id };
}

const HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured",
  "has_parent_transaction", "id", "integration_id", "is_3d_secure",
  "is_auth", "is_capture", "is_refunded", "is_standalone_payment",
  "is_voided", "order.id", "owner", "pending", "source_data.pan",
  "source_data.sub_type", "source_data.type", "success",
];

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value == null ? undefined : value[key], object);
}

function hmacValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function verifyPaymobHmac(query, body) {
  const receivedHmac = query?.hmac;
  const secret = process.env.PAYMOB_HMAC_SECRET;
  const transaction = body?.obj;

  if (
    !secret ||
    typeof receivedHmac !== "string" ||
    !/^[a-f0-9]{128}$/i.test(receivedHmac) ||
    !transaction
  ) return false;

  const concatenated = HMAC_FIELDS
    .map((field) => hmacValue(getPath(transaction, field)))
    .join("");
  const expected = crypto.createHmac("sha512", secret).update(concatenated).digest();
  const received = Buffer.from(receivedHmac, "hex");

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
