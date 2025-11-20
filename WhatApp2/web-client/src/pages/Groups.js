// web-client/src/pages/Groups.js
import renderUserBar from "../components/UserBar.js";
import { listGroups, createGroup, joinGroup } from "../services/GroupService.js";

export const renderGroupsPage = (username) => {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const userbar = renderUserBar({ name: username });
  app.appendChild(userbar);

  const box = document.createElement("div");
  box.classList.add("chat-container");

  const h = document.createElement("h3");
  h.textContent = "Grupos";
  h.classList.add("list-title");
  box.appendChild(h);

  // Crear grupo
  const row = document.createElement("div");
  row.classList.add("row", "home-content");

  const inp = document.createElement("input");
  inp.placeholder = "Nombre del grupo (ej. ventas)";
  inp.classList.add("chat-input");

  const btnCreate = document.createElement("button");
  btnCreate.textContent = "Crear";
  btnCreate.classList.add("btn");

  row.appendChild(inp);
  row.appendChild(btnCreate);
  box.appendChild(row);

  // Lista
  const ul = document.createElement("div");
  ul.classList.add("messages");
  box.appendChild(ul);

  const renderList = async () => {
    try {
      const groups = await listGroups();
      ul.innerHTML = "";
      if (!groups.length) {
        const empty = document.createElement("div");
        empty.classList.add("msg", "system");
        empty.textContent = "No hay grupos todavía.";
        ul.appendChild(empty);
        return;
      }
      groups.forEach((g) => {
        const li = document.createElement("div");
        li.classList.add("msg");

        const name = document.createElement("span");
        name.classList.add("user-item")
        name.textContent = g;

        const join = document.createElement("button");
        join.textContent = "Unirme";
        join.classList.add("btn");
        join.style.marginLeft = "8px";
        join.addEventListener("click", async () => {
          try {
            await joinGroup(username, g);
            window.location.hash = `#/g/${encodeURIComponent(g)}`;
          } catch (e) {
            alert("No se pudo unir al grupo");
          }
        });

        const open = document.createElement("button");
        open.textContent = "Abrir";
        open.classList.add("btn");
        open.style.marginLeft = "8px";
        open.addEventListener("click", () => {
          window.location.hash = `#/g/${encodeURIComponent(g)}`;
        });

        li.appendChild(name);
        li.appendChild(join);
        li.appendChild(open);
        ul.appendChild(li);
      });
    } catch (e) {
      ul.innerHTML = "";
      const err = document.createElement("div");
      err.classList.add("msg", "error");
      err.textContent = "Error cargando grupos";
      ul.appendChild(err);
    }
  };

  btnCreate.addEventListener("click", async () => {
    const g = inp.value.trim();
    if (!g) return;
    try {
      await createGroup(username, g);
      inp.value = "";
      // La lista también se actualizará por SSE, pero recargamos por si acaso
      renderList();
    } catch (e) {
      alert("No se pudo crear el grupo");
    }
  });

  // SSE para recibir actualizaciones de la lista de grupos
  try {
    if (window.__groupsSSE && window.__groupsSSE.username === username) {
      try { window.__groupsSSE.es.close(); } catch {}
    }
  } catch {}
  const es = new EventSource(`http://localhost:3002/api/stream?username=${encodeURIComponent(username)}`);
  window.__groupsSSE = { es, username };

  es.addEventListener("groups", (ev) => {
    try {
      const payload = JSON.parse(ev.data);
      // Redibuja la lista con payload.groups
      ul.innerHTML = "";
      const items = (payload.groups || []);
      if (!items.length) {
        const empty = document.createElement("div");
        empty.classList.add("msg", "system");
        empty.textContent = "No hay grupos todavía.";
        ul.appendChild(empty);
        return;
      }
      items.forEach((g) => {
        const li = document.createElement("div");
        li.classList.add("msg");
        const name = document.createElement("span");
        name.textContent = g;

        const join = document.createElement("button");
        join.textContent = "Unirme";
        join.classList.add("chat-send");
        join.style.marginLeft = "8px";
        join.addEventListener("click", async () => {
          try { await joinGroup(username, g); window.location.hash = `#/g/${encodeURIComponent(g)}`; }
          catch { alert("No se pudo unir al grupo"); }
        });

        const open = document.createElement("button");
        open.textContent = "Abrir";
        open.classList.add("chat-send");
        open.style.marginLeft = "8px";
        open.addEventListener("click", () => {
          window.location.hash = `#/g/${encodeURIComponent(g)}`;
        });

        li.appendChild(name); li.appendChild(join); li.appendChild(open);
        ul.appendChild(li);
      });
    } catch {}
  });

  app.appendChild(box);
  renderList();
};
