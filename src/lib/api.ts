import axios from "axios";

const api = axios.create();

api.interceptors.request.use((config) => {
  // 🛑 DO NOT attach auth headers for login
  const isLoginRequest = config.url?.includes("/auth/login");

  if (typeof window !== "undefined" && !isLoginRequest) {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);

        if (Array.isArray(user.roles)) {
          config.headers["X-User-Roles"] = user.roles.join(",");
        }
      } catch (e) {
        console.error("Invalid user in localStorage");
      }
    }
  }

  return config;
});

export default api;
