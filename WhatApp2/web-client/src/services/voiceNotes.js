import delegate from "./delegate.js";

function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const t of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000; // stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function recordVoiceNote({ maxMs = 15000 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  recorder.start();

  // stop automático
  const timer = setTimeout(() => {
    if (recorder.state !== "inactive") recorder.stop();
  }, maxMs);

  return {
    stop: async () => {
      clearTimeout(timer);
      if (recorder.state !== "inactive") recorder.stop();
      await stopped;

      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const buf = await blob.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);

      return { mime: blob.type || recorder.mimeType || "audio/webm", b64, blob };
    },
  };
}

export async function sendVoiceNote({ from, scope, target, mime, b64 }) {
  if (!delegate.subject) await delegate.init(from);

  const payload = `VN1|${from}|${scope}|${target}|${mime}|${b64}`;
  const bytes = new TextEncoder().encode(payload);

  await delegate.subject.sendAudio("VN", from, bytes);
}
