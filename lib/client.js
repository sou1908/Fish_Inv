// Tiny fetch wrapper for the client side.

async function handle(res) {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  get: (url) => fetch(url).then(handle),
  post: (url, data) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handle),
  put: (url, data) =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handle),
  del: (url) => fetch(url, { method: "DELETE" }).then(handle),
};
