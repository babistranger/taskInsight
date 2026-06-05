const API_URL = window.API_URL || "http://localhost:3000";

function token() { return localStorage.getItem("ti_token"); }
function setSession(t, u) {
  localStorage.setItem("ti_token", t);
  localStorage.setItem("ti_user", JSON.stringify(u));
}
function user() { try { return JSON.parse(localStorage.getItem("ti_user") || "null"); } catch { return null; } }
function logout() { localStorage.clear(); location.href = "index.html"; }

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token()) headers["Authorization"] = `Bearer ${token()}`;
  
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (res.status === 401) { logout(); throw new Error("unauthorized"); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).erro || "request_error");
  if (res.status === 204) return null;
  return res.json();
}

function requireAuth() { if (!token()) location.href = "index.html"; }
