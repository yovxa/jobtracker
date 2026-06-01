import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const token = localStorage.getItem("trackhire:auth-token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          localStorage.removeItem("trackhire:auth-token");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,

      login: async (credentials) => {
        const { data } = await api.post("/auth/login", credentials);

        localStorage.setItem("trackhire:auth-token", data.token);
        setUser(data.user);

        return data.user;
      },

      register: async (input) => {
        const { data } = await api.post("/auth/register", input);

        localStorage.setItem("trackhire:auth-token", data.token);
        setUser(data.user);

        return data.user;
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          localStorage.removeItem("trackhire:auth-token");
          setUser(null);
        }
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}