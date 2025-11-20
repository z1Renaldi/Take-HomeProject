import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { DateTime, Interval } from "luxon";

const prisma = new PrismaClient();

export default async function bookingRoutes(app: FastifyInstance) {
  // CREATE
  app.post("/api/book", async (req, res) => {
    const { organizerId, startUtc, invitee } = req.body as {
      organizerId: string;
      startUtc: string;
      invitee: { name: string; email: string };
    };
    const s = await prisma.settings.findUnique({ where: { organizerId } });
    if (!s) return res.status(400).send({ error: "Settings not found" });

    const start = DateTime.fromISO(startUtc).toUTC();
    const end = start.plus({ minutes: s.durationMin });

    if (start.diffNow("minutes").minutes < s.minNoticeMin) {
      return res.status(400).send({ error: "Fails minimum notice" });
    }

    const org = await prisma.organizer.findUnique({
      where: { id: organizerId },
    });
    const tz = org?.timeZone ?? "UTC";
    const localDay = start.setZone(tz).toFormat("yyyy-LL-dd");
    if ((s.blackoutDates as string[]).includes(localDay)) {
      return res.status(400).send({ error: "Blackout date" });
    }

    const booked = await prisma.booking.findMany({
      where: { organizerId, status: "CONFIRMED" },
    });
    const conflict = booked.some((b) => {
      const begin = DateTime.fromJSDate(b.startUtc).minus({
        minutes: s.bufferMin,
      });
      const fin = DateTime.fromJSDate(b.endUtc).plus({ minutes: s.bufferMin });
      return Interval.fromDateTimes(begin, fin).overlaps(
        Interval.fromDateTimes(start, end)
      );
    });
    if (conflict) return res.status(409).send({ error: "Slot conflict" });

    try {
      const created = await prisma.booking.create({
        data: {
          organizerId,
          startUtc: start.toJSDate(),
          endUtc: end.toJSDate(),
          inviteeName: invitee.name,
          inviteeEmail: invitee.email,
        },
      });
      return { booking: created };
    } catch {
      return res.status(409).send({ error: "Slot taken" });
    }
  });

  // LIST
  app.get("/api/bookings/:organizerId", async (req) => {
    const { organizerId } = req.params as { organizerId: string };
    const bookings = await prisma.booking.findMany({
      where: { organizerId, status: "CONFIRMED" },
      orderBy: { startUtc: "asc" },
    });
    return { bookings };
  });

  // RESCHEDULE
  app.patch("/api/book/:id/reschedule", async (req, res) => {
    const { id } = req.params as { id: string };
    const { startUtc } = req.body as { startUtc: string };

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return res.status(404).send({ error: "Booking not found" });

    const s = await prisma.settings.findUnique({
      where: { organizerId: existing.organizerId },
    });
    if (!s) return res.status(400).send({ error: "Settings not found" });

    const newStart = DateTime.fromISO(startUtc).toUTC();
    const newEnd = newStart.plus({ minutes: s.durationMin });

    if (newStart.diffNow("minutes").minutes < s.minNoticeMin) {
      return res.status(400).send({ error: "Fails minimum notice" });
    }

    const org = await prisma.organizer.findUnique({
      where: { id: existing.organizerId },
    });
    const tz = org?.timeZone ?? "UTC";
    const localDay = newStart.setZone(tz).toFormat("yyyy-LL-dd");
    if ((s.blackoutDates as string[]).includes(localDay)) {
      return res.status(400).send({ error: "Blackout date" });
    }

    const others = await prisma.booking.findMany({
      where: {
        organizerId: existing.organizerId,
        id: { not: id },
        status: "CONFIRMED",
      },
    });
    const hasConflict = others.some((b) => {
      const begin = DateTime.fromJSDate(b.startUtc).minus({
        minutes: s.bufferMin,
      });
      const fin = DateTime.fromJSDate(b.endUtc).plus({ minutes: s.bufferMin });
      return Interval.fromDateTimes(begin, fin).overlaps(
        Interval.fromDateTimes(newStart, newEnd)
      );
    });
    if (hasConflict) return res.status(409).send({ error: "Slot conflict" });

    try {
      const updated = await prisma.booking.update({
        where: { id },
        data: { startUtc: newStart.toJSDate(), endUtc: newEnd.toJSDate() },
      });
      return { booking: updated };
    } catch {
      return res.status(409).send({ error: "Slot taken" });
    }
  });

  // CANCEL
  app.delete("/api/book/:id", async (req, res) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.booking.findUnique({ where: { id } });
    if (!exists) return res.status(404).send({ error: "Booking not found" });
    await prisma.booking.delete({ where: { id } });
    return { ok: true };
  });
}
