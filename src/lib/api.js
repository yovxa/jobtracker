import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

export const getApiError = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;