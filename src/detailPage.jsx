import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import AppForm from "./components/appFrom";
import { StatusPill } from "./components/StatusPill";
import { getApplication, STATUS, useApplications } from "./lib/app";
import { getApiError } from "./lib/api";

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { update, remove } = useApplications();
  const [app, setApp] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;

    getApplication(id)
      .then((application) => {
        if (active) setApp(application);
      })
      .catch((err) => {
        if (active) setError(getApiError(err, "Application not found"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-3xl text-center text-[#959eb8]">
          Loading application...
        </div>
      </div>
    );
  }

  if (!app || error) {
    return (
      <div className="min-h-screen px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#959eb8] hover:text-[#eff2f9]"
          >
            <ArrowBackIcon className="h-4 w-4" /> Back
          </Link>
          <p className="mt-12 text-center text-[#959eb8]">
            {error || "Application not found."}
          </p>
        </div>
      </div>
    );
  }

  const saveChanges = async (formData) => {
    try {
      const updated = await update(app.id, formData);
      setApp(updated);
      setEditing(false);
      toast.success("Updated");
    } catch (err) {
      toast.error(getApiError(err, "Could not update application"));
    }
  };

  const deleteApplication = async () => {
    if (!confirm(`Remove ${app.company}?`)) return;
    try {
      await remove(app.id);
      toast.success("Removed");
      navigate("/");
    } catch (err) {
      toast.error(getApiError(err, "Could not remove application"));
    }
  };

  return (
    <div className="lg:pr-[17%] lg:pl-[17%]">
      <div className="text-sm text-[#959eb8]">
        <Link to="/" className="inline-flex items-center gap-1 hover:text-[#eff2f9]">
          <ArrowBackIcon /> Back
        </Link>
      </div>

      <div className="mt-10 flex w-full flex-col items-start justify-between gap-5 lg:flex-row">
        <div className="w-full lg:w-[50%]">
          <div className="mb-4 flex flex-row items-center justify-between">
            <h1>{app.position}</h1>
            <StatusPill status={app.status} className="text-sm" />
          </div>
          <div className="mb-4 text-4xl font-bold text-[#8867C5]">{app.company}</div>
          <div className="mb-4 flex rounded-xl border border-border/60 bg-background/60 p-4 transition-all">
            <div className="flex-1">
              <p className="text-sm text-[#959eb8]">APPLIED</p>
              <p>
                {new Date(app.appliedDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex-1">
              {app.location && (
                <div>
                  <p className="text-sm text-[#959eb8]">LOCATION</p>
                  <p>{app.location}</p>
                </div>
              )}
            </div>
            <div>
              {app.salary && (
                <div>
                  <p className="text-sm text-[#959eb8]">SALARY</p>
                  <p>{app.salary}</p>
                </div>
              )}
            </div>
          </div>

          {app.notes && (
            <div className="mt-10">
              <p className="mb-2 text-lg font-bold text-[#959eb8]">NOTES</p>
              <div className="mb-4 flex rounded-xl border border-border/60 bg-background/60 p-4 transition-all">
                <p>{app.notes}</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-2">
            <button
              onClick={() => setEditing((current) => !current)}
              className="rounded-lg bg-btn px-4 py-2 text-sm font-medium hover:bg-btn/80"
            >
              {editing ? "Cancel edit" : "Edit"}
            </button>
            <button
              onClick={deleteApplication}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm text-[#ee343a] hover:bg-[#ee343a]/15"
            >
              <DeleteIcon className="mr-2 h-4 w-4" /> Delete
            </button>
          </div>

          {editing && (
            <div className="mt-6 rounded-xl border border-border/60 bg-background/60 p-6">
              <AppForm
                data={app}
                submitLabel="Save changes"
                onSubmit={saveChanges}
                onCancel={() => setEditing(false)}
              />
            </div>
          )}
        </div>

        <div className="w-full lg:w-[50%]">
          <div className="rounded-xl border border-border/60 bg-background/60 p-6">
            <h2 className="text-sm uppercase tracking-widest text-[#959eb8]">
              Timeline
            </h2>
            <ol className="mt-4 space-y-4">
              {[...(app.history || [])].reverse().map((event, idx) => (
                <li key={`${event.status}-${event.at}`} className="relative pl-6">
                  <span
                    className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#050517]"
                    style={{
                      backgroundColor: `var(--color-status-${event.status})`,
                    }}
                  />
                  {idx < (app.history || []).length - 1 && (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-border" />
                  )}
                  <p className="text-sm font-medium">{STATUS[event.status].label}</p>
                  <p className="text-xs text-[#959eb8]">
                    {new Date(event.at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
