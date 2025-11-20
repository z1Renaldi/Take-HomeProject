import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default async function organizersRoutes(app: FastifyInstance) {
  app.get("/api/organizers", async () => {
    const rows = await prisma.organizer.findMany({
      select: { id: true, name: true, timeZone: true },
      orderBy: { name: "asc" },
    });
    return { organizers: rows };
  });
}
