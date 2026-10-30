# Food marketplace controller starter

These controller files are written for the Prisma schema discussed in this conversation and the previously proposed Express routers.

## Files
- `auth.controller.js`
- `restaurant.controller.js`
- `order.controller.js`
- `reservation.controller.js`
- `review.controller.js`
- `restaurantOwner.controller.js`
- `menu.controller.js`
- `restaurantOrder.controller.js`
- `admin.controller.js`
- `subscriptionPlan.controller.js`
- `subscription.controller.js`
- `payment.controller.js`

## Installation
Copy the files into `backend/src/controllers/` and ensure your route imports use these exact filenames and named exports. The imports assume `src/config/db.js` exports a named `{ prisma }` client, your authentication middleware sets `req.user`, and you use ES modules.

Required environment variables:
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (optional, defaults to `1d`)
- `PAYMOB_HMAC_SECRET` (for Paymob transaction processed callback verification)

Use `app.use(express.json())` before mounting routes. Configure CORS with credentials if authenticating via cookies.

## Important limitations / next work
1. `subscription.controller.js#createCheckout` creates a pending record only. It intentionally does not claim payment succeeded or pretend it generated a Paymob checkout. Integrate Paymob intention/checkout creation before real subscription payments.
2. The current Prisma schema has no Payment ledger, refund records, commissions, payouts, or persisted Paymob transaction ID. The revenue endpoints therefore return gross paid/delivered sales or paid order volume, not net earnings or platform revenue.
3. `payment.controller.js` handles a Paymob Transaction Processed callback for an existing Order whose `paymob_order_id` has been saved. Your order-checkout flow must create the Paymob order and persist its ID first. It cannot activate subscription payments with the present schema.
4. The owner/admin routes need the authentication and role middleware described in your route files. Middleware should attach the authenticated database user to `req.user`; ownership middleware should attach `req.restaurant`.
5. The seed's demo active subscription is development-only and is not evidence of payment.
6. Menu-item deletion is a soft delete (`is_available: false`) to preserve historical order-item references.

## Compatibility notes
- The models use `Role` values `customer`, `restaurant_owner`, `admin`; `Restaurant.status` values `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`.
- Fields such as `reviewed_by`, `is_verified`, order currency, and refund status are not present in the supplied schema and are not referenced here.
- These are starter controllers; test them against your actual installed Prisma/Express versions and add request validation, rate limiting, audit logging, and tests before production.
