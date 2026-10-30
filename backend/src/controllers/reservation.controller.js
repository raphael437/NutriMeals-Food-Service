import { prisma } from "../config/db.js";

export async function createReservation(req, res, next) {
  try {
    const { restaurant_id, party_size, reservation_time } = req.body;
    const parsedTime = new Date(reservation_time);

    if (
      typeof restaurant_id !== "string" ||
      !Number.isInteger(party_size) ||
      party_size < 1 ||
      party_size > 50 ||
      !reservation_time ||
      Number.isNaN(parsedTime.getTime()) ||
      parsedTime <= new Date()
    ) {
      return res.status(400).json({
        message:
          "Provide a restaurant, a future reservation time, and a party size from 1 to 50.",
      });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurant_id, status: "APPROVED" },
      select: { id: true },
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    const reservation = await prisma.reservation.create({
      data: {
        customer_id: req.user.id,
        restaurant_id,
        party_size,
        reservation_time: parsedTime,
      },
      include: {
        restaurant: { select: { id: true, name: true, address: true } },
      },
    });

    return res.status(201).json({
      message: "Reservation request submitted.",
      reservation,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMyReservations(req, res, next) {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { customer_id: req.user.id },
      orderBy: { reservation_time: "desc" },
      include: {
        restaurant: { select: { id: true, name: true, address: true } },
      },
    });

    return res.status(200).json({ reservations });
  } catch (error) {
    return next(error);
  }
}

/** PATCH /api/customer/reservations/:reservationId/cancel */
export async function cancelReservation(req, res, next) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: {
          id: req.params.reservationId,
          customer_id: req.user.id,
        },
      });

      if (!reservation) return { type: "not_found" };

      if (reservation.status === "cancelled") {
        return { type: "already_cancelled" };
      }

      if (reservation.status === "declined") {
        return { type: "declined" };
      }

      if (! ["pending", "confirmed"].includes(reservation.status)) {
        return { type: "not_cancellable" };
      }

      if (reservation.reservation_time <= new Date()) {
        return { type: "past_reservation" };
      }

      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "cancelled" },
        include: {
          restaurant: { select: { id: true, name: true, address: true } },
        },
      });

      return { type: "cancelled", reservation: updated };
    });

    if (result.type === "not_found") {
      return res.status(404).json({ message: "Reservation not found." });
    }

    if (result.type === "already_cancelled") {
      return res.status(409).json({ message: "Reservation is already cancelled." });
    }

    if (result.type === "declined") {
      return res.status(409).json({ message: "A declined reservation cannot be cancelled." });
    }

    if (result.type === "past_reservation") {
      return res.status(409).json({ message: "Past reservations cannot be cancelled." });
    }

    if (result.type === "not_cancellable") {
      return res.status(409).json({ message: "This reservation cannot be cancelled in its current state." });
    }

    return res.status(200).json({
      message: "Reservation cancelled.",
      reservation: result.reservation,
    });
  } catch (error) {
    return next(error);
  }
}
