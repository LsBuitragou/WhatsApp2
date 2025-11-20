// web-client/src/services/GroupService.js
const API = "http://localhost:3002";

export async function listGroups() {
  const r = await fetch(`${API}/api/groups`);
  if (!r.ok) throw new Error("No se pudo listar grupos");
  return r.json();
}

export async function createGroup(from, group) {
  const r = await fetch(`${API}/api/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, group }),
  });
  if (!r.ok) throw new Error("No se pudo crear el grupo");
  return r.json();
}

export async function joinGroup(from, group) {
  const r = await fetch(`${API}/api/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, group }),
  });
  if (!r.ok) throw new Error("No se pudo unir al grupo");
  return r.json();
}

export async function sendGroupMessage(from, group, msg) {
  const r = await fetch(`${API}/api/group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, group, msg }),
  });
  if (!r.ok) throw new Error("No se pudo enviar el mensaje grupal");
  return r.json();
}
