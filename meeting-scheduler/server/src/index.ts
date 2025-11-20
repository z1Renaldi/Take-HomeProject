import Fastify from "fastify";
import cors from "@fastify/cors";

import organizersRoutes from "./routes/organizers.js";
import settingsRoutes from "./routes/settings.js";
import bookingRoutes from "./routes/booking.js";
import slotsRoutes from "./routes/slots.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.get("/api/health", async () => ({ ok: true }));

await app.register(organizersRoutes);
await app.register(settingsRoutes);
await app.register(bookingRoutes);
await app.register(slotsRoutes);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
