import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Add, Delete } from "@mui/icons-material";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import AppForm from "./components/appFrom";
import { AppBtn } from "./components/appBtn";
import { StatusPill } from "./components/StatusPill";
import { STATUS, STATUS_ORDER, useApplications } from "./lib/app";
import { getApiError } from "./lib/api";
import { useAuth } from "./lib/auth";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [now] = useState(() => Date.now());
  const { apps, loading, error, add, update, remove } = useApplications();
  const { user, logout } = useAuth();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps
      .filter((app) => statusFilter === "all" || app.status === statusFilter)
      .filter(
        (app) =>
          !q ||
          app.company.toLowerCase().includes(q) ||
          app.position.toLowerCase().includes(q) ||
          app.location?.toLowerCase().includes(q),
      )
      .sort((a, b) => +new Date(b.appliedDate) - +new Date(a.appliedDate));
  }, [apps, query, statusFilter]);

  const stats = useMemo(() => {
    const counts = STATUS_ORDER.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
    apps.forEach((app) => {
      if (counts[app.status] !== undefined) counts[app.status] += 1;
    });
    const weekAgo = now - 7 * 86400000;
    const thisWeek = apps.filter((app) => +new Date(app.appliedDate) >= weekAgo).length;
    const responded = apps.filter((app) => app.status !== "applied").length;
    const rate = apps.length ? Math.round((responded / apps.length) * 100) : 0;
    return { counts, thisWeek, rate, total: apps.length };
  }, [apps, now]);

  const changeStatus = async (id, status) => {
    try {
      await update(id, { status });
    } catch (err) {
      toast.error(getApiError(err, "Could not update status"));
    }
  };

  const deleteApplication = async (app) => {
    if (!confirm(`Remove ${app.company}?`)) return;
    try {
      await remove(app.id);
      toast.success("Removed");
    } catch (err) {
      toast.error(getApiError(err, "Could not remove application"));
    }
  };

  const confirmLogout = async () => {
    if (!confirm("Are you sure you want to logout?")) return;
    try {
      await logout();
      toast.success("Logged out");
    } catch (err) {
      toast.error(getApiError(err, "Could not logout"));
    }
  };

  return (
    <div className="lg:pr-20 lg:pl-20">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Track hire</h1>
          <p className="text-sm text-[#959eb8]">{user?.name}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-btn px-4 py-2 text-sm font-medium text-[#E6F7FF] shadow-lg shadow-btn/30 hover:bg-btn/90"
          >
            <Add className="h-5 w-5" />
            New application
          </button>
          <button
            onClick={confirmLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-[#eff2f9] hover:bg-btn/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search applications"
          className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-border-hover focus:ring-2 focus:ring-border-hover/30"
        />
        <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-2 text-sm text-[#959eb8]">
          {stats.total} total - {stats.thisWeek} this week - {stats.rate}% responded
        </div>
      </div>

      <div className="mb-10 flex w-full flex-col items-start justify-between gap-5 lg:flex-row">
        <div className="flex w-full flex-col items-center justify-center gap-2 lg:w-[50%]">
          {loading ? (
            <div className="w-full rounded-xl border border-border/60 bg-background/60 p-8 text-center text-[#959eb8]">
              Loading applications...
            </div>
          ) : error ? (
            <div className="w-full rounded-xl border border-[#f14d4c]/30 bg-[#f14d4c]/10 p-8 text-center text-[#ff9f9f]">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="w-full rounded-xl border border-dashed border-border bg-background/40 p-12 text-center">
              <p className="text-[#959eb8]">
                No applications match. Try clearing filters or add a new one.
              </p>
            </div>
          ) : (
            filtered.map((app) => (
              <article
                key={app.id}
                className="group w-full rounded-xl border border-border/60 bg-background/60 p-4 transition-all hover:border-border-hover/50 hover:bg-background hover:shadow-lg hover:shadow-border-hover/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/application/${app.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="text-lg font-semibold group-hover:text-[#8867C5]">
                        {app.company}
                      </h3>
                      <span className="text-sm text-[#eff2f9]/80">{app.position}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#959eb8]">
                      <span>
                        Applied{" "}
                        {new Date(app.appliedDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {app.location && <span>- {app.location}</span>}
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={app.status}
                      onChange={(event) => changeStatus(app.id, event.target.value)}
                      className={`inline-flex items-center gap-1.5 rounded-full border bg-transparent px-2.5 py-0.5 text-xs font-medium ${STATUS[app.status].tokenClass}`}
                    >
                      {STATUS_ORDER.map((status) => (
                        <option
                          key={status}
                          value={status}
                          className="bg-background text-[#959eb8]"
                        >
                          {STATUS[status].label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => deleteApplication(app)}
                      className="rounded-md p-1.5 text-[#ee343a] hover:bg-[#ee343a]/15 hover:text-[#ee343a]"
                      aria-label="Delete"
                    >
                      <Delete className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="flex w-full items-start justify-start lg:w-[50%]">
          <div className="w-full rounded-xl border border-border/60 bg-background/60 p-6">
            <p className="text-xs uppercase tracking-widest text-[#959eb8]">status</p>
            <ul className="mt-4 space-y-5">
              {STATUS_ORDER.map((status) => {
                const count = stats.counts[status];
                const pct = stats.total ? (count / stats.total) * 100 : 0;
                return (
                  <li key={status}>
                    <button
                      onClick={() =>
                        setStatusFilter(status === statusFilter ? "all" : status)
                      }
                      className="w-full cursor-pointer text-left"
                    >
                      <div className="mb-3 flex items-center justify-between text-sm">
                        <StatusPill status={status} />
                        <span className="font-display font-semibold tabular-nums">
                          {count}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#000000]/50">
                        <div
                          className="h-full rounded-full opacity-60"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: `var(--color-status-${status})`,
                          }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <AppBtn open={open} onClose={() => setOpen(false)} title="Add application">
        <AppForm
          onSubmit={async (app) => {
            try {
              await add(app);
              setOpen(false);
              toast.success(`Added ${app.company}`);
            } catch (err) {
              toast.error(getApiError(err, "Could not add application"));
            }
          }}
          onCancel={() => setOpen(false)}
        />
      </AppBtn>
    </div>
  );
}
