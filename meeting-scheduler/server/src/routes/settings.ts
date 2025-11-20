import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const WorkingHoursSchema = z.record(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z.array(z.tuple([z.string(), z.string()]))
);

const SettingsSchema = z.object({
  workingHours: WorkingHoursSchema,
  durationMin: z.number().int().min(5).max(480),
  bufferMin: z.number().int().min(0).max(240),
  minNoticeMin: z
    .number()
    .int()
    .min(0)
    .max(7 * 24 * 60),
  blackoutDates: z.array(z.string()),
});

export default async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings/:organizerId", async (req, res) => {
    const { organizerId } = req.params as { organizerId: string };
    const org = await prisma.organizer.findUnique({
      where: { id: organizerId },
      include: { settings: true },
    });
    if (!org) return res.status(404).send({ error: "Organizer not found" });
    return {
      organizer: { id: org.id, timeZone: org.timeZone },
      settings: org.settings,
    };
  });

  app.put("/api/settings/:organizerId", async (req, res) => {
    const { organizerId } = req.params as { organizerId: string };
    const parsed = SettingsSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).send({ error: parsed.error.flatten() });

    const data = parsed.data;
    const saved = await prisma.settings.upsert({
      where: { organizerId },
      update: data,
      create: { organizerId, ...data },
    });
    return { settings: saved };
  });
}
