import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export const getApiError = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;




api.interceptors.request.use((config) => {
  const token = localStorage.getItem("trackhire:auth-token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});