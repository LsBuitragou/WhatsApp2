import { routes } from "./routes.js";

export function router() {
  const path = location.hash.slice(1) || "/";
  const app = document.getElementById("app");

  if (!app) {
    console.error("No se encontró el elemento #app");
    return;
  }

  // Determinar clave de ruta por el primer segmento
  const firstSeg = path.split("/")[1] || "";  // "", "home", "chat", "groups", "g", ...
  const routeKey = firstSeg ? `/${firstSeg}` : path; // "/" | "/home" | "/chat" | "/groups" | "/g"
  const route = routes[routeKey];

  if (!route) {
    app.innerHTML = "<h2>404 - Página no encontrada</h2>";
    return;
  }

  app.innerHTML = "";

  // /chat/<contact>
  if (path.startsWith("/chat/")) {
    const contactName = decodeURIComponent(path.slice("/chat/".length));
    route(app, contactName);
    return;
  }

  // /g/<groupName>
  if (path.startsWith("/g/")) {
    const groupName = decodeURIComponent(path.slice("/g/".length));
    route(app, groupName);
    return;
  }

  // Rutas sin parámetro (/ , /home , /groups, etc.)
  route(app);
}

// Escuchar cambios en la URL
window.addEventListener("hashchange", router);
// Llamarlo al cargar
window.addEventListener("load", router);
