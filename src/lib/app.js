import { useCallback, useEffect, useState } from "react";
import { api, getApiError } from "./api";

export const STATUS = {
  applied: {
    label: "Applied",
    tokenClass: "bg-[#5aa3ec]/15 text-[#5aa3ec] border-[#5aa3ec]/30",
  },
  interview: {
    label: "Interview",
    tokenClass: "bg-[#dfb100]/15 text-[#dfb100] border-[#dfb100]/30",
  },
  offer: {
    label: "Offer",
    tokenClass: "bg-[#4cd676]/15 text-[#4cd676] border-[#4cd676]/30",
  },
  rejected: {
    label: "Rejected",
    tokenClass: "bg-[#f14d4c]/15 text-[#f14d4c] border-[#f14d4c]/30",
  },
};

export const STATUS_ORDER = ["applied", "interview", "offer", "rejected"];

export async function getApplication(id) {
  const { data } = await api.get(`/applications/${id}`);
  return data.application;
}

export function useApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/applications");
      setApps(data.applications);
    } catch (err) {
      setError(getApiError(err, "Could not load applications"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (input) => {
    const { data } = await api.post("/applications", input);
    setApps((current) => [data.application, ...current]);
    return data.application;
  }, []);

  const update = useCallback(async (id, patch) => {
    const { data } = await api.put(`/applications/${id}`, patch);
    setApps((current) =>
      current.map((app) => (app.id === id ? data.application : app)),
    );
    return data.application;
  }, []);

  const remove = useCallback(async (id) => {
    await api.delete(`/applications/${id}`);
    setApps((current) => current.filter((app) => app.id !== id));
  }, []);

  return { apps, loading, error, refresh, add, update, remove };
}
