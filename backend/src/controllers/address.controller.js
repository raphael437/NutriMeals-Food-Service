import { prisma } from "../config/db.js";

const ADDRESS_FIELDS = new Set(["label", "line1", "city", "is_default"]);

function validateAddressInput(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !ADDRESS_FIELDS.has(field)
  );
  if (unknownFields.length > 0) {
    return `Unsupported address field(s): ${unknownFields.join(", ")}.`;
  }

  if (!partial || Object.hasOwn(body, "line1")) {
    if (typeof body.line1 !== "string" || !body.line1.trim()) {
      return "line1 is required and must be a non-empty string.";
    }
  }

  if (!partial || Object.hasOwn(body, "city")) {
    if (typeof body.city !== "string" || !body.city.trim()) {
      return "city is required and must be a non-empty string.";
    }
  }

  if (Object.hasOwn(body, "label") && body.label !== null && typeof body.label !== "string") {
    return "label must be a string or null.";
  }

  if (Object.hasOwn(body, "is_default") && typeof body.is_default !== "boolean") {
    return "is_default must be a boolean.";
  }

  if (partial && Object.keys(body).length === 0) {
    return "Provide at least one address field to update.";
  }

  return null;
}

function normalizeAddressInput(body) {
  const data = {};

  if (Object.hasOwn(body, "label")) {
    data.label = typeof body.label === "string" ? body.label.trim() || null : null;
  }
  if (Object.hasOwn(body, "line1")) data.line1 = body.line1.trim();
  if (Object.hasOwn(body, "city")) data.city = body.city.trim();
  if (Object.hasOwn(body, "is_default")) data.is_default = body.is_default;

  return data;
}

/** POST /api/customer/addresses */
export async function createAddress(req, res, next) {
  try {
    const validationError = validateAddressInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const input = normalizeAddressInput(req.body);
    const userId = req.user.id;

    const address = await prisma.$transaction(async (tx) => {
      const addressCount = await tx.address.count({
        where: { user_id: userId },
      });

      // The first saved address becomes the default unless a default was chosen.
      const makeDefault = input.is_default === true || addressCount === 0;

      if (makeDefault) {
        await tx.address.updateMany({
          where: { user_id: userId },
          data: { is_default: false },
        });
      }

      return tx.address.create({
        data: {
          user_id: userId,
          label: input.label ?? null,
          line1: input.line1,
          city: input.city,
          is_default: makeDefault,
        },
      });
    });

    return res.status(201).json({ message: "Address created.", address });
  } catch (error) {
    return next(error);
  }
}

/** GET /api/customer/addresses */
export async function getAddresses(req, res, next) {
  try {
    const addresses = await prisma.address.findMany({
      where: { user_id: req.user.id },
      orderBy: [{ is_default: "desc" }, { id: "asc" }],
    });

    return res.status(200).json({ addresses });
  } catch (error) {
    return next(error);
  }
}

/** PATCH /api/customer/addresses/:addressId */
export async function updateAddress(req, res, next) {
  try {
    const validationError = validateAddressInput(req.body, { partial: true });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const input = normalizeAddressInput(req.body);
    const userId = req.user.id;
    const { addressId } = req.params;

    const address = await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({
        where: { id: addressId, user_id: userId },
      });

      if (!existing) return null;

      if (input.is_default === true) {
        await tx.address.updateMany({
          where: { user_id: userId },
          data: { is_default: false },
        });
      }

      return tx.address.update({
        where: { id: existing.id },
        data: input,
      });
    });

    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    return res.status(200).json({ message: "Address updated.", address });
  } catch (error) {
    return next(error);
  }
}

/** DELETE /api/customer/addresses/:addressId */
export async function deleteAddress(req, res, next) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({
        where: { id: req.params.addressId, user_id: req.user.id },
      });

      if (!address) return { type: "not_found" };

      // Keep historical order-to-address links intact. The current Order model
      // does not store a separate delivery-address snapshot, so deleting a used
      // address could erase delivery information from order history.
      const linkedOrderCount = await tx.order.count({
        where: { address_id: address.id },
      });

      if (linkedOrderCount > 0) {
        return { type: "in_use" };
      }

      await tx.address.delete({ where: { id: address.id } });

      if (address.is_default) {
        const nextDefault = await tx.address.findFirst({
          where: { user_id: req.user.id },
          orderBy: { id: "asc" },
        });

        if (nextDefault) {
          await tx.address.update({
            where: { id: nextDefault.id },
            data: { is_default: true },
          });
        }
      }

      return { type: "deleted" };
    });

    if (result.type === "not_found") {
      return res.status(404).json({ message: "Address not found." });
    }

    if (result.type === "in_use") {
      return res.status(409).json({
        message:
          "This address is linked to an existing order and cannot be deleted yet. Update the order address-history model before allowing deletion of addresses used by orders.",
      });
    }

    return res.status(200).json({ message: "Address deleted." });
  } catch (error) {
    return next(error);
  }
}
