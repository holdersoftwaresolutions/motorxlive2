function getCookie(name) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift() || "";
  }
  return "";
}

export async function adminFetch(url, options = {}) {
  const adminKey = getCookie("motorxlive_admin_key");

  const headers = {
    ...(options.headers || {}),
    "x-admin-key": adminKey,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}