import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { getSlots, rescheduleBooking } from "./api";

type SlotsByDay = Record<string, string[]>;

export default function RescheduleModal({
  open,
  organizerId,
  bookingId,
  onClose,
  onDone,
}: {
  open: boolean;
  organizerId: string;
  bookingId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    DateTime.local().toFormat("yyyy-LL-dd")
  );
  const minDate = DateTime.local().toFormat("yyyy-LL-dd");
  const maxDate = DateTime.local().plus({ days: 13 }).toFormat("yyyy-LL-dd");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !organizerId) return;
    setPicked(null);
    setMsg(null);
    (async () => {
      setLoading(true);
      try {
        const { slots } = await getSlots(organizerId, 14);
        setSlots(slots);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, organizerId]);

  const byDay: SlotsByDay = useMemo(() => {
    return slots.reduce<SlotsByDay>((acc, iso) => {
      const key = DateTime.fromISO(iso).toLocal().toFormat("yyyy-LL-dd");
      (acc[key] ??= []).push(iso);
      return acc;
    }, {});
  }, [slots]);

  const daySlots = byDay[selectedDate] ?? [];

  const confirm = async () => {
    if (!picked) return;
    setLoading(true);
    setMsg(null);
    try {
      await rescheduleBooking(bookingId, picked);
      onDone();
      onClose();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Reschedule booking</h3>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="row" style={{ marginTop: 6 }}>
          <label className="muted small" htmlFor="rs-date">
            Pilih tanggal
          </label>
          <input
            id="rs-date"
            type="date"
            value={selectedDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>

        {loading ? (
          <div className="skeleton">Loading…</div>
        ) : (
          <>
            {daySlots.length === 0 ? (
              <p className="muted">Tidak ada slot pada tanggal ini.</p>
            ) : (
              <div className="day-grid" style={{ marginTop: 8 }}>
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
            )}
          </>
        )}

        {picked && (
          <p className="muted small" style={{ marginTop: 8 }}>
            Slot baru:{" "}
            {DateTime.fromISO(picked)
              .toLocal()
              .toFormat("ccc, dd LLL yyyy HH:mm")}
          </p>
        )}

        {msg && (
          <div className="toast toast-err" style={{ marginTop: 8 }}>
            {msg}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={() => void confirm()}
            disabled={!picked || loading}
          >
            {loading ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
