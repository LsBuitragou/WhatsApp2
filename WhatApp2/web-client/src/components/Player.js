import delegate from './../services/delegate.js';

const Player = () => {
  const container = document.createElement('div');
  const audioCtx = new AudioContext({ sampleRate: 44100 });
  delegate.init();

  let bufferQueue = [];
  let isPlaying = false;
  const BUFFER_LATENCY = 0.2; // 200 ms de latencia para suavizar

  const playAudio = (arrayBuffer) => {
    if (!audioCtx) return;
    const floatArray = convertPCM16ToFloat32(arrayBuffer, false);
    bufferQueue.push(floatArray);
    if (!isPlaying) processQueue();
  };

  const processQueue = () => {
    if (bufferQueue.length === 0) {
      isPlaying = false;
      return;
    }
    isPlaying = true;
    const floatArray = bufferQueue.shift();
    const audioBuffer = audioCtx.createBuffer(1, floatArray.length, 44100);
    audioBuffer.getChannelData(0).set(floatArray);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
    source.onended = processQueue;
  };

  const convertPCM16ToFloat32 = (arrayBuffer, littleEndian = false) => {
    const buffer =
      arrayBuffer instanceof ArrayBuffer ? arrayBuffer : arrayBuffer.buffer;

    const view = new DataView(buffer);
    const float32Array = new Float32Array(arrayBuffer.byteLength / 2);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = view.getInt16(i * 2, littleEndian);
      float32Array[i] = sample / 32768;
    }
    return float32Array;
  };

  const button = document.createElement('button');
  button.textContent = 'Play';
  button.onclick = () => {
    delegate.subscribe(playAudio);
    container.innerText = 'Reproduciendo ...';
  };

  container.appendChild(button);

  return container;
};

export default Player;
