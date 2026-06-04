import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const { data } = await api.get("/auth/me");

        if (active) {
          setUser(data.user || null);
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error(error);
        }

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    checkAuth();

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
        setUser(data.user);
        return data.user;
      },

      register: async (input) => {
        const { data } = await api.post("/auth/register", input);
        setUser(data.user);
        return data.user;
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
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