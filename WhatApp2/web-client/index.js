import { router } from "./src/router/router.js";

// Escucha cambios en la URL (hash) y carga inicial
window.addEventListener("load", router);
window.addEventListener("hashchange", router);
