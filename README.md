# Take-HomeProject
Take-Home Project:Renaldi

# Meeting Scheduler (MVP)

TypeScript full-stack meeting scheduler dengan:
- **Organizer Settings** (jam kerja, durasi, buffer, min-notice, blackout dates)
- **Public Booking Page** (slot 14 hari, form singkat, anti double-booking)
- **Organizer Dashboard** (list, reschedule, cancel)
- **Timezones** (organizer vs invitee), edge cases (cross-midnight, min-notice)
- **Concurrency** (unique index + buffer checks)

## 1) Setup & Run

```bash
# 1) Server
cd server
npm install
# set .env (contoh SQLite)
# PORT=3000
# NODE_ENV=development
# DATABASE_URL="file:./dev.db"
npm run prisma:generate
npm run db:push
npm run dev

# 2) Client (tab lain)
cd ../client
npm install
# set client/.env
# VITE_API_URL=http://localhost:3000
npm run dev
