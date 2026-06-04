
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";

import { getApiError } from "./lib/api";
import { useAuth } from "./lib/auth";

const inputClass =
  "w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-border-hover focus:ring-2 focus:ring-border-hover/30";
const labelClass =
  "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#959eb8]";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError("");
  }, [mode]);

  if (!loading && user) return <Navigate to="/" replace />;

  const setField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiError(err, "Could not sign in"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
      <div className="w-full rounded-xl border border-border/60 bg-background/60 p-6 shadow-2xl shadow-black/20">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg border border-border/70 bg-[#0B0712] p-2 text-[#8867C5]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Joblio</h1>
            <p className="text-sm text-[#959eb8]">
              {mode === "login" ? "Sign in to your workspace" : "Create your workspace"}
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-border/60 bg-[#0B0712]/70 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "login" ? "bg-btn text-white" : "text-[#959eb8]"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "register" ? "bg-btn text-white" : "text-[#959eb8]"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-[#f14d4c]/30 bg-[#f14d4c]/10 px-3 py-2 text-sm text-[#ff9f9f]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-btn px-4 py-2.5 text-sm font-medium text-[#f6f8ff] shadow-lg shadow-btn/30 hover:bg-btn/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mode === "login" ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {submitting ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
