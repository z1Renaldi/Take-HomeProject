import { useState } from "react";
import { updateSettings } from "./api";

export default function SettingsForm({
  organizerId,
  onSaved,
}: {
  organizerId: string;
  onSaved: () => void;
}) {
  const [jsonWH, setJsonWH] = useState(
    '{"mon":[["09:00","17:00"]],"tue":[["09:00","17:00"]],"wed":[["09:00","17:00"]],"thu":[["09:00","17:00"]],"fri":[["09:00","17:00"]],"sat":[],"sun":[]}'
  );
  const [duration, setDuration] = useState(30);
  const [buffer, setBuffer] = useState(15);
  const [minNotice, setMinNotice] = useState(0);
  const [blackout, setBlackout] = useState("[]");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        workingHours: JSON.parse(jsonWH),
        durationMin: duration,
        bufferMin: buffer,
        minNoticeMin: minNotice,
        blackoutDates: JSON.parse(blackout),
      };
      await updateSettings(organizerId, payload);
      alert("Settings saved");
      onSaved();
    } catch {
      alert("Invalid JSON or server error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label className="small muted">Working hours (JSON)</label>
      <textarea
        value={jsonWH}
        onChange={(e) => setJsonWH(e.target.value)}
        rows={4}
        style={{
          width: "100%",
          borderRadius: 10,
          padding: 8,
          background: "rgba(255,255,255,.06)",
          border: "1px solid var(--card-border)",
          color: "var(--text)",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        <div>
          <label className="small muted">Duration (min)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="small muted">Buffer (min)</label>
          <input
            type="number"
            value={buffer}
            onChange={(e) => setBuffer(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="small muted">Min notice (min)</label>
          <input
            type="number"
            value={minNotice}
            onChange={(e) => setMinNotice(Number(e.target.value))}
          />
        </div>
      </div>

      <label className="small muted">Blackout dates (JSON array)</label>
      <input value={blackout} onChange={(e) => setBlackout(e.target.value)} />

      <button className="btn" onClick={() => void save()} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
