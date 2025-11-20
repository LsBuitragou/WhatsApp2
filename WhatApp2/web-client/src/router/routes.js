import { renderWelcome, renderHomePage } from "../pages/Home.js";
import { renderChatPage } from "../pages/chat.js";
import { renderGroupsPage } from "../pages/Groups.js";
import { renderGroupChatPage } from "../pages/GroupChat.js";

export const routes = {
  "/": (app) => app.appendChild(renderWelcome()),

  "/home": (app) => {
    const username = localStorage.getItem("username") || "Invitado";
    renderHomePage(username);
  },

  // Chat 1 a 1: #/chat/<contactName>
  "/chat": (app, contactName) => {
    const username = localStorage.getItem("username");
    if (!username) {
      window.location.hash = "#/";
      return;
    }
    const contact = decodeURIComponent(contactName || "");
    if (!contact) return;
    renderChatPage(username, contact);
  },

  // Lista/gestión de grupos: #/groups
  "/groups": (app) => {
    const username = localStorage.getItem("username");
    if (!username) {
      window.location.hash = "#/";
      return;
    }
    renderGroupsPage(username);
  },

  // Chat de grupo: #/g/<groupName>
  "/g": (app, groupName) => {
    const username = localStorage.getItem("username");
    if (!username) {
      window.location.hash = "#/";
      return;
    }
    const group = decodeURIComponent(groupName || "");
    if (!group) return;
    renderGroupChatPage(username, group);
  },
};
