import { onLogin } from "../services/UserService.js";
import renderUserBar from "../components/UserBar.js";
import delegate from "../services/delegate.js";

export function renderWelcome() {
  const div = document.createElement("div");
  div.classList.add("welcome");

  const title = document.createElement("h2");
  title.textContent = "Bienvenido a Wassap";
  title.classList.add("welcome-title");

  const input = document.createElement("input");
  input.placeholder = "Ingresa tu nombre";
  input.classList.add("input-name");

  const button = document.createElement("button");
  button.textContent = "Entrar";
  button.classList.add("btn");

  button.addEventListener("click", async () => {
    const name = input.value.trim();
    if (!name) return alert("Por favor ingresa un nombre");

    try {
      console.log('[Home.js] Iniciando login para:', name);
      const data = await onLogin(name);
      console.log('[Home.js] Respuesta de login:', data);
      
      if (data.status === "ok") {
        console.log('[Home.js] Login exitoso, guardando username y inicializando delegate');
        localStorage.setItem("username", name);
        await delegate.init(name);
        
        console.log('[Home.js] Delegate inicializado, navegando a #/home');
        window.location.hash = "#/home";
      } else {
        console.error('[Home.js] Login falló, status:', data.status);
        alert("Error al crear el usuario: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error('[Home.js] Excepción en login:', err);
      alert(err.message);
    }
  });

  div.appendChild(title);
  div.appendChild(input);
  div.appendChild(button);
  return div;
}

export async function renderHomePage(username) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const user = { name: username };
  const userbar = renderUserBar(user);
  app.appendChild(userbar);

  const actions = document.createElement("div");
  actions.classList.add("home-actions");

  const content = document.createElement("div");
  content.classList.add("home-content");
  content.textContent = `Bienvenido al mejor Wassap, ${username}!`;
  app.appendChild(content);

  const btnGroups = document.createElement("button");
  btnGroups.textContent = "Grupos";
  btnGroups.classList.add("btn");
  btnGroups.addEventListener("click", () => {
    window.location.hash = "#/groups";
  });

  actions.appendChild(btnGroups);
  app.appendChild(actions);

  const userListDiv = document.createElement("div");
  userListDiv.classList.add("user-list");
  app.appendChild(userListDiv);

  try {
    const { data: users } = await axios.get("http://localhost:3002/api/users");

    const listTitle = document.createElement("h3");
    listTitle.textContent = "Usuarios conectados:";
    listTitle.classList.add("list-title");
    userListDiv.appendChild(listTitle);

    const ul = document.createElement("ul");
    ul.classList.add("user-ul");

    users
      .filter((u) => u.username !== username)
      .forEach((u) => {
        const li = document.createElement("li");
        li.textContent = u.username;
        li.classList.add("user-item");
        li.addEventListener("click", () => {
          location.hash = `#/chat/${u.username}`;
        });
        ul.appendChild(li);
      });

    if (ul.children.length === 0) {
      const emptyMsg = document.createElement("p");
      emptyMsg.textContent = "No hay otros usuarios conectados.";
      emptyMsg.classList.add("empty-msg");
      userListDiv.appendChild(emptyMsg);
    } else {
      userListDiv.appendChild(ul);
    }
  } catch (err) {
    console.error("Error al cargar usuarios:", err);
    userListDiv.textContent = "Error al obtener usuarios.";
  }
}
