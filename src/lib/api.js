import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export const getApiError = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;