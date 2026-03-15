import axios from 'axios';

// ─── Base client ───────────────────────────────────────────────────────────────
// withCredentials: true sends the httpOnly cookie on every request automatically.
// No token reading from localStorage — that's gone.
const api = axios.create({
  baseURL: '/api/proxy',
  withCredentials: true,
});

// ─── Response interceptor ──────────────────────────────────────────────────────
// On 401, the access token has expired.
// Hit /auth/refresh via the Next.js route handler (which calls refreshTokenAction),
// then retry the original request once. If refresh also fails, redirect to login.
let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    // Avoid multiple simultaneous refresh calls
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((ok) => {
          if (ok) resolve(api(original));
          else reject(err);
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Calls our Next.js route handler, which calls refreshTokenAction server-side
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });

      if (!res.ok) throw new Error('Refresh failed');

      // Flush the queue with success
      refreshQueue.forEach(cb => cb(true));
      refreshQueue = [];
      return api(original);
    } catch {
      // Flush the queue with failure
      refreshQueue.forEach(cb => cb(false));
      refreshQueue = [];
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
