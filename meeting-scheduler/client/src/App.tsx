import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import {
  getSlots,
  createBooking,
  getBookings,
  cancelBooking,
  getOrganizerAndSettings,
  getOrganizers,
} from "./api";
import type { Booking, Organizer } from "./api";
import SettingsForm from "./SettingsForm";
import RescheduleModal from "./RescheduleModel";
import Button from "./button";
import "./index.css";

type SlotsByDay = Record<string, string[]>;

export default function App() {
  const [slots, setSlots] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [org, setOrg] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);

  const [orgId, setOrgId] = useState<string>("");
  const [orgList, setOrgList] = useState<
    { id: string; name: string; timeZone: string }[]
  >([]);

  const [selectedDate, setSelectedDate] = useState(
    DateTime.local().toFormat("yyyy-LL-dd")
  );
  const minDate = DateTime.local().toFormat("yyyy-LL-dd");
  const maxDate = DateTime.local().plus({ days: 13 }).toFormat("yyyy-LL-dd");

  const [rsOpen, setRsOpen] = useState(false);
  const [rsBookingId, setRsBookingId] = useState<string | null>(null);

  const [cnOpen, setCnOpen] = useState(false);
  const [cnBookingId, setCnBookingId] = useState<string | null>(null);
  const [cnBusy, setCnBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const qs = new URLSearchParams(location.search);
      const fromUrl = qs.get("org") || "";
      const { organizers } = await getOrganizers();
      setOrgList(organizers);
      setOrgId(fromUrl || organizers[0]?.id || "");
    })();
  }, []);

  useEffect(() => {
    if (!orgId) return;
    void loadFor(orgId);
  }, [orgId]);

  async function loadFor(id: string) {
    setLoading(true);
    try {
      const [{ slots }, { bookings }, { organizer }] = await Promise.all([
        getSlots(id, 14),
        getBookings(id),
        getOrganizerAndSettings(id),
      ]);
      setSlots(slots);
      setBookings(bookings);
      setOrg(organizer);
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  const byDay: SlotsByDay = useMemo(() => {
    return slots.reduce<SlotsByDay>((acc, iso) => {
      const key = DateTime.fromISO(iso).toLocal().toFormat("yyyy-LL-dd");
      (acc[key] ??= []).push(iso);
      return acc;
    }, {});
  }, [slots]);

  const daySlots = byDay[selectedDate] ?? [];

  const fmtOrg = (iso: string) =>
    org
      ? DateTime.fromISO(iso)
          .setZone(org.timeZone)
          .toFormat("ccc, dd LLL yyyy • HH:mm")
      : DateTime.fromISO(iso).toLocal().toFormat("ccc, dd LLL yyyy • HH:mm");

  const book = async () => {
    if (!picked || !name || !email || !orgId) return;
    try {
      await createBooking({
        organizerId: orgId,
        startUtc: picked,
        invitee: { name, email },
      });
      setMsg({ type: "ok", text: "Booking sukses 🎉" });
      setName("");
      setEmail("");
      setPicked(null);
      await loadFor(orgId);
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const onReschedule = (b: Booking) => {
    setRsBookingId(b.id);
    setRsOpen(true);
  };

  const askCancel = (id: string) => {
    setCnBookingId(id);
    setCnOpen(true);
  };

  const doCancel = async () => {
    if (!cnBookingId) return;
    setCnBusy(true);
    try {
      await cancelBooking(cnBookingId);
      setMsg({ type: "ok", text: "Booking dibatalkan." });
      await loadFor(orgId);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg({ type: "err", text });
    } finally {
      setCnBusy(false);
      setCnOpen(false);
      setCnBookingId(null);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <header className="header header-with-org">
          <div className="title-wrap">
            <h1>Online Meeting Scheduler</h1>
            <p>Pilih slot → isi data → Book</p>
          </div>

          <div className="org-picker">
            <label htmlFor="org" className="muted small">
              Organizer
            </label>
            <select
              id="org"
              value={orgId}
              onChange={(ev) => setOrgId(ev.target.value)}
              className="org-select"
            >
              {orgList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.timeZone})
                </option>
              ))}
            </select>
          </div>
        </header>

        {msg && (
          <div
            className={`toast ${msg.type === "ok" ? "toast-ok" : "toast-err"}`}
          >
            {msg.text}
            <button className="toast-close" onClick={() => setMsg(null)}>
              ✕
            </button>
          </div>
        )}

        <section className="section two-col">
          {/* Public booking */}
          <div className="card">
            <h2 className="card-title">Public Booking</h2>

            <div className="row">
              <label className="muted small" htmlFor="pick-date">
                Pilih tanggal
              </label>
              <input
                id="pick-date"
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={(ev) => {
                  setSelectedDate(ev.target.value);
                  setPicked(null);
                }}
                className="date-input"
              />
            </div>

            {loading ? (
              <div className="skeleton">Loading…</div>
            ) : (
              <>
                {daySlots.length === 0 && (
                  <p className="muted">
                    Tidak ada slot pada tanggal ini. Pilih tanggal lain.
                  </p>
                )}

                <div className="day-grid" style={{ marginBottom: 10 }}>
                  {daySlots.map((iso) => (
                    <button
                      key={iso}
                      onClick={() => setPicked(iso)}
                      className={`slot ${picked === iso ? "slot-picked" : ""}`}
                      title={iso}
                    >
                      <span className="slot-time">
                        {DateTime.fromISO(iso).toLocal().toFormat("HH:mm")}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="form">
                  <input
                    placeholder="Nama"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                  />
                  <input
                    placeholder="Email"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    type="email"
                  />
                  <button
                    className="btn"
                    onClick={() => void book()}
                    disabled={!picked || !name || !email || !orgId}
                  >
                    Book
                  </button>
                  {picked && (
                    <p className="muted small">
                      Slot:{" "}
                      {DateTime.fromISO(picked)
                        .toLocal()
                        .toFormat("ccc, dd LLL yyyy HH:mm")}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h2 className="card-title">Organizer Dashboard</h2>
            {bookings.length === 0 ? (
              <p className="muted">Belum ada booking.</p>
            ) : (
              <ul className="list">
                {bookings.map((b) => (
                  <li key={b.id} className="list-item">
                    <div>
                      <div className="list-title">{fmtOrg(b.startUtc)}</div>
                      <div className="list-sub">
                        {b.inviteeName} — {b.inviteeEmail}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span className="badge badge-ok">CONFIRMED</span>
                      <button
                        className="icon-btn"
                        title="Reschedule"
                        onClick={() => onReschedule(b)}
                      >
                        ↻
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Cancel"
                        onClick={() => askCancel(b.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <hr style={{ margin: "16px 0" }} />
            <h3 style={{ marginTop: 0 }}>Settings (Organizer)</h3>
            {orgId && (
              <SettingsForm
                organizerId={orgId}
                onSaved={() => void loadFor(orgId)}
              />
            )}
          </div>
        </section>

        {orgId && rsOpen && rsBookingId && (
          <RescheduleModal
            open={rsOpen}
            organizerId={orgId}
            bookingId={rsBookingId}
            onClose={() => setRsOpen(false)}
            onDone={() => void loadFor(orgId)}
          />
        )}

        {cnOpen && cnBookingId && (
          <Button
            open={cnOpen}
            title="Cancel booking?"
            message="Tindakan ini akan membatalkan booking dan slot akan kembali tersedia."
            confirmText="Yes, cancel it"
            cancelText="Keep booking"
            busy={cnBusy}
            onConfirm={() => void doCancel()}
            onClose={() => setCnOpen(false)}
          />
        )}

        <footer className="footer">
          <span className="muted small">
            Multi-organizer • Date picker • Reschedule/Cancel • Organizer TZ
          </span>
        </footer>
      </div>
    </div>
  );
}
