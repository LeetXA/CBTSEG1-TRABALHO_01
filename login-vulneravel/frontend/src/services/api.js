import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export const getCsrfToken = () => api.get("/login/csrf-token");
export const loginUsuario = (matricula, senha, csrfToken) =>
  api.post("/login", { matricula, senha }, { headers: { "X-CSRF-Token": csrfToken } });
export const getCurrentUser = () => api.get("/login/me");
export const logoutUsuario = () => api.post("/login/logout");

export default api;
