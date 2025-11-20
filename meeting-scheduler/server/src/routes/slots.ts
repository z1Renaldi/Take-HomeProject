import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { DateTime, Interval } from "luxon";

const prisma = new PrismaClient();

function parseHHMM(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return { hour: h, minute: m ?? 0 };
}

function expandPeriod(dayLocal: DateTime, fromHHMM: string, toHHMM: string) {
  const { hour: fh, minute: fm } = parseHHMM(fromHHMM);
  const { hour: th, minute: tm } = parseHHMM(toHHMM);
  const from = dayLocal.set({ hour: fh, minute: fm });
  const to = dayLocal.set({ hour: th, minute: tm });

  if (to < from) {
    return [
      { from, to: dayLocal.endOf("day") },
      {
        from: dayLocal.plus({ days: 1 }).startOf("day"),
        to: dayLocal.plus({ days: 1 }).set({ hour: th, minute: tm }),
      },
    ];
  }
  return [{ from, to }];
}

export default async function slotsRoutes(app: FastifyInstance) {
  app.get("/api/slots", async (req, res) => {
    try {
      const q = req.query as any;
      const organizerId = String(q.organizerId || "");
      const days = Number(q.days ?? 14);
      const from = q.from ? new Date(q.from) : new Date();
      if (!organizerId) return { slots: [] };

      const org = await prisma.organizer.findUnique({
        where: { id: organizerId },
        include: { settings: true },
      });
      if (!org || !org.settings) return { slots: [] };

      const tz = org.timeZone || "UTC";
      const s = org.settings;

      const startUTC = DateTime.fromJSDate(from).toUTC().startOf("minute");
      const endUTC = startUTC.plus({ days });

      const bookings = await prisma.booking.findMany({
        where: {
          organizerId,
          status: "CONFIRMED",
          startUtc: { gte: startUTC.toJSDate(), lt: endUTC.toJSDate() },
        },
        orderBy: { startUtc: "asc" },
      });

      const blackout = new Set<string>(
        Array.isArray(s.blackoutDates) ? (s.blackoutDates as string[]) : []
      );
      const mapDow: Record<
        number,
        "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
      > = {
        7: "sun",
        1: "mon",
        2: "tue",
        3: "wed",
        4: "thu",
        5: "fri",
        6: "sat",
      };

      const slots: string[] = [];

      for (let d = 0; d < days; d++) {
        const dayLocal = startUTC.plus({ days: d }).setZone(tz).startOf("day");
        const key = mapDow[dayLocal.weekday];
        const periods: [string, string][] =
          (s.workingHours as any)?.[key] ?? [];
        if (!periods.length) continue;

        const ymd = dayLocal.toFormat("yyyy-LL-dd");
        if (blackout.has(ymd)) continue;

        for (const [fromHHMM, toHHMM] of periods) {
          const segments = expandPeriod(dayLocal, fromHHMM, toHHMM);
          for (const seg of segments) {
            let curLocal = seg.from;
            while (curLocal.plus({ minutes: s.durationMin }) <= seg.to) {
              const slotStartUtc = curLocal.setZone("UTC");
              const slotEndUtc = slotStartUtc.plus({ minutes: s.durationMin });

              if (slotStartUtc.diffNow("minutes").minutes < s.minNoticeMin) {
                curLocal = curLocal.plus({ minutes: s.durationMin });
                continue;
              }

              const conflict = bookings.some((b) => {
                const begin = DateTime.fromJSDate(b.startUtc).minus({
                  minutes: s.bufferMin,
                });
                const fin = DateTime.fromJSDate(b.endUtc).plus({
                  minutes: s.bufferMin,
                });
                return Interval.fromDateTimes(begin, fin).overlaps(
                  Interval.fromDateTimes(slotStartUtc, slotEndUtc)
                );
              });

              if (!conflict) slots.push(slotStartUtc.toISO()!);
              curLocal = curLocal.plus({ minutes: s.durationMin });
            }
          }
        }
      }

      return { slots };
    } catch (e) {
      app.log.error(e);
      return res.status(500).send({ error: "Failed to generate slots" });
    }
  });
}
