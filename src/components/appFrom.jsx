import { useState } from "react";
import { STATUS, STATUS_ORDER } from "../lib/app";

const lblstyle =
  "block text-xs font-medium uppercase tracking-wider text-[#959eb8] mb-1.5";
const inputstyle =
  "w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-border-hover focus:ring-2 focus:ring-border-hover/30";

export default function AppForm({
  data,
  onSubmit,
  onCancel,
  submitLabel = "Add application",
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState({
    company: data?.company ?? "",
    position: data?.position ?? "",
    salary: data?.salary ?? "",
    appliedDate: data?.appliedDate ? data.appliedDate.slice(0, 10) : today,
    location: data?.location ?? "",
    notes: data?.notes ?? "",
    status: data?.status ?? "applied",
  });

  const set = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!formData.company.trim() || !formData.position.trim()) return;
        onSubmit({
          ...formData,
          appliedDate: new Date(formData.appliedDate).toISOString(),
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={lblstyle}>Company *</label>
          <input
            className={inputstyle}
            value={formData.company}
            onChange={(e) => set("company", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={lblstyle}>Role *</label>
          <input
            className={inputstyle}
            value={formData.position}
            onChange={(e) => set("position", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={lblstyle}>Location</label>
          <input
            className={inputstyle}
            value={formData.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Remote - Amman"
          />
        </div>
        <div>
          <label className={lblstyle}>Salary range</label>
          <input
            className={inputstyle}
            value={formData.salary}
            onChange={(e) => set("salary", e.target.value)}
            placeholder="200JD-1000JD"
          />
        </div>
        <div>
          <label className={lblstyle}>Applied date</label>
          <input
            type="date"
            className={inputstyle}
            value={formData.appliedDate}
            onChange={(e) => set("appliedDate", e.target.value)}
            required
          />
        </div>
        <div>
          <label className={lblstyle}>Status</label>
          <select
            className={inputstyle}
            value={formData.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {STATUS_ORDER.map((s) => (
              <option
                key={s}
                value={s}
                className="bg-background text-[#959eb8]"
              >
                {STATUS[s].label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={lblstyle}>Notes</label>
          <textarea
            rows={4}
            className={inputstyle}
            value={formData.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm hover:bg-btn/10"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-lg bg-btn px-4 py-2 text-sm font-medium text-[#f6f8ff] shadow-lg shadow-btn/30 hover:bg-btn/90"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
