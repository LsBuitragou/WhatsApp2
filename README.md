## Instrucciones para ejecutar el sistema

- Ejecutar el servidor backend (proyecto Wasap) con el siguiente comando:

        java -cp out TCPServer

  Este paso inicializa el servidor principal que maneja las conexiones, usuarios, grupos y llamadas.

- Iniciar el proxy:

        cd proxy
        node proxy.js

  El proxy actúa como intermediario entre el cliente web y el backend, gestionando las peticiones del cliente y manteniendo la comunicación con el servidor TCP del backend.

- Ejecutar el cliente web:

        npx serve web-client

    Este comando inicia la aplicación web desde el navegador, permitiendo a los usuarios interactuar con el sistema.

---

Primero se ve la pantalla del login, donde al escribir un nombre se genera un usuario. Si se regresa y se escribe un nombre diferente, se creará otro usuario distinto.
Desde el usuario 1 se pueden ver todos los usuarios existentes, excepto a sí mismo.
Para hablar directamente con alguien, solo se debe hacer clic en el nombre de la persona deseada, lo que llevará al chat personal.

En cuanto a los chats grupales, al presionar el botón “Grupos” se mostrarán todos los grupos existentes (si los hay).
El sistema también permite crear nuevos grupos y, cuando ya existen, añadir personas a ellos.

Descripción del flujo de comunicación entre cliente, proxy y backend

El sistema está compuesto por tres subproyectos: web-client, proxy y backend (Wasap). Cada uno cumple un rol específico dentro del flujo de comunicación.

---

## Cliente (web-client)

El cliente es una aplicación web que permite al usuario iniciar sesión, crear o unirse a grupos, enviar mensajes privados o grupales y participar en llamadas de voz.

Cuando el usuario realiza acciones como enviar mensajes o crear grupos, el cliente envía solicitudes HTTP al proxy, que corre en el puerto 3002.
Estas solicitudes son gestionadas por JavaScript utilizando fetch.

## Llamadas y audios mediante ICE (middleware)

Para las funcionalidades de audios y llamadas de voz, el sistema utiliza un middleware llamado ICE.

Este ICE funciona como un puente entre el cliente web y el backend, permitiendo comunicación directa sin pasar por el proxy.
El middleware ICE utiliza clases y métodos generados a partir de un archivo con extensión .ice.
Ese archivo .ice está presente tanto en el backend (Java) como en el web-client, lo que permite que ambos compartan las mismas estructuras, métodos remotos y tipos de datos para manejar audio y llamadas.

Gracias a esto:

- El cliente puede enviar audios e iniciar llamadas usando métodos remotos definidos en ICE.
- El backend recibe estas llamadas y audios directamente mediante el runtime de ICE.
- El proxy ya no participa en este flujo, porque ICE maneja su propio canal de comunicación.

En resumen:

- Login, mensajes y grupos: webclient → proxy → backend
- Audios y llamadas: webclient → ICE → backend

---
## Proxy (proxy.js)

El proxy actúa como intermediario entre el cliente y el backend para:

• Login
• Envío de mensajes privados
• Envío de mensajes grupales
• Creación y unión a grupos

El proxy convierte JSON en comandos TCP y mantiene una conexión abierta con el servidor, maneja reconexiones y envía al cliente respuestas en formato JSON.

Importante: las llamadas y audios no pasan por el proxy. Ese flujo lo maneja directamente el middleware ICE.

## Backend (Wasap)

El backend contiene:

• TCPServer: recibe conexiones provenientes del proxy
• ClientHandler: interpreta comandos como /msg, /join, /create, etc.
• GroupManager: administra usuarios, grupos y el envío de mensajes
• UserSession: representa la conexión de un usuario

Además, el backend incluye las clases generadas a partir del archivo .ice y escucha las peticiones del middleware ICE para manejar llamadas y audios directamente.

---

## Arquitecturas
el primer diagrama es el flujo para mensajes y el segundo flujo es el flujo con ice.                         


      ┌───────────────┐          HTTP          ┌──────────────┐          TCP          ┌───────────────┐
      │   WEB CLIENT  │ ─────────────────────▶ │    PROXY     │ ───────────────────▶ │    BACKEND     │
      └───────────────┘                        └──────────────┘                       └───────────────┘
                (JSON)                               (traduce a comandos)                  (procesa la lógica)



      ┌───────────────┐           ICE RPC             ┌───────────────┐
      │   WEB CLIENT  │ ───────────────────────────▶ │    BACKEND     │
      └───────────────┘                               └───────────────┘
        (audios, llamadas)                               (clases .ice compartidas)




---

Integrantes del grupo
---

- José David Loaiza
- Laura Buitrago
- Juan Pablo Bello
