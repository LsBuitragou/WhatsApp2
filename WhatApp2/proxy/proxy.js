// proxy/proxy.js
const express = require('express');
const net = require('net');
const cors = require('cors');

const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 3002;
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = process.env.BACKEND_PORT ? parseInt(process.env.BACKEND_PORT, 10) : 12345;

// username -> net.Socket
const clients = new Map();
// username -> Set<res SSE>
const sseClients = new Map();
// Lista simple de grupos (viva mientras corre el proxy)
const groups = new Set();

const app = express();
app.use(cors());
app.use(express.json());

// --- Helpers de parsing de éxito del backend ---
const OK_CREATE_RE = /^(OK\b)|\bGroup\s+created\b|\bGroup\s+created:/i;
const OK_JOIN_RE   = /^(OK\b)|\bjoined\b|\byou\s+have\s+joined\b/i;

function makeLineBuffer(onLine) {
  let buf = '';
  return (data) => {
    buf += data.toString('utf8');
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '');
      buf = buf.slice(idx + 1);
      onLine(line);
    }
  };
}

function broadcastToUser(username, line) {
  const set = sseClients.get(username);
  if (!set || set.size === 0) return;
  for (const res of set) {
    try { res.write(`data: ${JSON.stringify({ line })}\n\n`); } catch {}
  }
}

function broadcastGroups() {
  const payload = JSON.stringify({ groups: Array.from(groups).sort() });
  for (const set of sseClients.values()) {
    for (const res of set) {
      try { res.write(`event: groups\ndata: ${payload}\n\n`); } catch {}
    }
  }
}

function getClient(username) {
  return new Promise((resolve, reject) => {
    if (!username || !username.trim()) return reject(new Error('Username requerido'));
    if (clients.has(username)) {
      const sock = clients.get(username);
      if (sock && !sock.destroyed && sock.writable) return resolve(sock);
      clients.delete(username);
    }
    const socket = new net.Socket();
    let resolved = false;

    socket.connect(BACKEND_PORT, BACKEND_HOST, () => {
      console.log(`[TCP][${username}] conectado -> ${BACKEND_HOST}:${BACKEND_PORT}`);
      socket.write(username + '\n');
      clients.set(username, socket);
      resolved = true;
      resolve(socket);
    });

    socket.on('data', makeLineBuffer((line) => {
      console.log(`[TCP][${username}] ${line}`);
      broadcastToUser(username, line);
    }));

    socket.on('error', (err) => {
      console.error(`[TCP][${username}] error: ${err.message}`);
      clients.delete(username);
      if (!resolved) reject(err);
      const set = sseClients.get(username);
      if (set) {
        for (const res of set) {
          try { res.write(`event: error\ndata: ${JSON.stringify(err.message)}\n\n`); } catch {}
        }
      }
    });

    socket.on('close', () => {
      console.log(`[TCP][${username}] cerrado`);
      clients.delete(username);
      const set = sseClients.get(username);
      if (set) {
        for (const res of set) {
          try { res.write(`event: close\ndata: "tcp-closed"\n\n`); } catch {}
          try { res.end(); } catch {}
        }
        sseClients.delete(username);
      }
    });
  });
}

async function sendCommand(username, command) {
  const socket = await getClient(username);
  return new Promise((resolve) => {
    let collected = '';
    let done = false;

    const onData = (chunk) => {
      collected += chunk.toString('utf8');
      console.log(`[sendCommand][${username}] data recibida: "${collected}"`);
      // Heurística: primera línea/OK/ERR
      if (/\n|OK:|ERR:/i.test(collected)) {
        cleanup();
        done = true;
        console.log(`[sendCommand][${username}] resolviendo con: "${collected.trim()}"`);
        resolve(collected.trim());
      }
    };
    const cleanup = () => { try { socket.off('data', onData); } catch {} };

    socket.on('data', onData);
    console.log(`[sendCommand][${username}] enviando comando: "${command}"`);
    socket.write(command + '\n');

    setTimeout(() => {
      if (!done) { 
        console.log(`[sendCommand][${username}] TIMEOUT después de 5s, collected="${collected}"`);
        cleanup(); 
        resolve(collected.trim() || 'Timeout: no response from command'); 
      }
    }, 5000);
  });
}

// ---------- API ----------
app.post('/api/login', async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: 'Username requerido' });
    console.log(`[/api/login] Intentando conectar usuario: ${username}`);
    await getClient(username);
    console.log(`[/api/login] Usuario ${username} conectado exitosamente`);
    const response = { status: 'ok', user: { name: username } };
    console.log(`[/api/login] Respondiendo:`, response);
    res.json(response);
  } catch (err) {
    console.error('[/api/login] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/message', async (req, res) => {
  try {
    const { from, to, msg } = req.body || {};
    if (!from || !to || !msg) return res.status(400).json({ error: 'Faltan parámetros (from, to, msg)' });
    const socket = await getClient(from);
    socket.write(`/msg ${to} ${msg}\n`);
    console.log(`[HTTP] ${from} → ${to}: ${msg}`);
    res.json({ status: 'ok', sent: true });
  } catch (err) {
    console.error('Error /api/message:', err);
    res.status(500).json({ error: err.message });
  }
});

// Crear grupo (con fallback a /join si el backend no soporta /create)
app.post('/api/create', async (req, res) => {
  try {
    const { from, group } = req.body || {};
    if (!from || !group) return res.status(400).json({ error: 'Faltan parámetros' });

    let response = await sendCommand(from, `/create ${group}`);
    console.log(`[CREATE][resp] ${JSON.stringify(response)}`);

    // ¿Éxito directo?
    if (OK_CREATE_RE.test(response)) {
      if (!groups.has(group)) {
        groups.add(group);
        broadcastGroups();
      }
      return res.json({ ok: true, response });
    }

    const looksUnknown = /ERR|unknown|invalid|no\s+such|not\s+found/i.test(response);
    if (looksUnknown) {
      response = await sendCommand(from, `/join ${group}`);
      console.log(`[CREATE→JOIN][resp] ${JSON.stringify(response)}`);
      if (OK_JOIN_RE.test(response)) {
        if (!groups.has(group)) {
          groups.add(group);
          broadcastGroups();
        }
        return res.json({ ok: true, response, via: 'join-fallback' });
      }
    }

    response = await sendCommand(from, `/group ${group} [system] grupo creado`);
    console.log(`[CREATE→GROUPMSG][resp] ${JSON.stringify(response)}`);

    if (!groups.has(group)) {
      groups.add(group);
      broadcastGroups();
    }
    return res.json({ ok: true, response, via: 'groupmsg-fallback' });

  } catch (err) {
    console.error('Error /api/create:', err);
    res.status(500).json({ error: err.message });
  }
});

// Unirse a grupo
app.post('/api/join', async (req, res) => {
  try {
    const { from, group } = req.body || {};
    if (!from || !group) return res.status(400).json({ error: 'Faltan parámetros' });
    const response = await sendCommand(from, `/join ${group}`);
    console.log(`[JOIN][resp] ${JSON.stringify(response)}`);
    if (OK_JOIN_RE.test(response)) {
      if (!groups.has(group)) {
        groups.add(group);
        broadcastGroups();
      }
    }
    res.json({ ok: true, response });
  } catch (err) {
    console.error('Error /api/join:', err);
    res.status(500).json({ error: err.message });
  }
});

// Enviar a grupo
app.post('/api/group', async (req, res) => {
  try {
    const { from, group, msg } = req.body || {};
    if (!from || !group || !msg) return res.status(400).json({ error: 'Faltan parámetros' });
    const response = await sendCommand(from, `/group ${group} ${msg}`);
    res.json({ ok: true, response });
  } catch (err) {
    console.error('Error /api/group:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lista de grupos (cache local del proxy)
app.get('/api/groups', (_req, res) => {
  res.json(Array.from(groups).sort());
});

// Lista de usuarios con socket abierto en el proxy
app.get('/api/users', (_req, res) => {
  const users = Array.from(clients.keys());
  res.json(users.map((u) => ({ username: u })));
});

// SSE por usuario
app.get('/api/stream', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients.has(username)) sseClients.set(username, new Set());
  sseClients.get(username).add(res);

  // Mensaje inicial + lista de grupos actual
  res.write(`data: ${JSON.stringify({ hello: username })}\n\n`);
  res.write(`event: groups\ndata: ${JSON.stringify({ groups: Array.from(groups).sort() })}\n\n`);

  try { await getClient(username); } catch {}

  req.on('close', () => {
    const set = sseClients.get(username);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) sseClients.delete(username);
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, backend: { host: BACKEND_HOST, port: BACKEND_PORT } });
});

app.listen(HTTP_PORT, () => {
  console.log(`API server running at http://localhost:${HTTP_PORT}  (-> ${BACKEND_HOST}:${BACKEND_PORT})`);
});
