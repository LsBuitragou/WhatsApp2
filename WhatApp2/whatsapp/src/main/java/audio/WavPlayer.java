// src/main/java/audio/WavPlayer.java
package audio;

import javax.sound.sampled.*;
import java.io.*;

public class WavPlayer {

    // Ajusta si suena bajo. 0.0f = sin cambio, +6.0f o +10.0f para subir.
    private static final float DB_GAIN = 0.0f;

    /**
     * Reproduce un WAV (byte[]) usando SourceDataLine.
     * Convierte a PCM_SIGNED 16-bit LE si es necesario.
     */
    public static void play(byte[] wavBytes) throws Exception {
        if (wavBytes == null || wavBytes.length < 44) return;

        try (AudioInputStream ais0 = AudioSystem.getAudioInputStream(new ByteArrayInputStream(wavBytes))) {
            AudioFormat src = ais0.getFormat();

            // Target “universal” para muchos mixers en Windows/macOS/Linux
            AudioFormat target = new AudioFormat(
                    AudioFormat.Encoding.PCM_SIGNED,
                    src.getSampleRate(),    // mantenemos sample rate original del WAV
                    16,                     // 16-bit
                    src.getChannels(),      // 1 (mono) o 2
                    src.getChannels() * 2,  // frame size
                    src.getSampleRate(),
                    false                   // little-endian
            );

            AudioInputStream ais = AudioSystem.isConversionSupported(target, src)
                    ? AudioSystem.getAudioInputStream(target, ais0)
                    : ais0;

            DataLine.Info info = new DataLine.Info(SourceDataLine.class, ais.getFormat());

            // Si quieres elegir un mixer concreto, reemplaza por AudioSystem.getMixer(chosen).getLine(info)
            try (SourceDataLine line = (SourceDataLine) AudioSystem.getLine(info)) {
                line.open(ais.getFormat());

                // Intentar ajustar ganancia si el control existe
                try {
                    FloatControl gain = (FloatControl) line.getControl(FloatControl.Type.MASTER_GAIN);
                    float newGain = clamp(gain.getValue() + DB_GAIN, gain.getMinimum(), gain.getMaximum());
                    gain.setValue(newGain);
                } catch (IllegalArgumentException ignored) { /* mixer sin control de ganancia */ }

                line.start();

                byte[] buf = new byte[4096];
                int n;
                while ((n = ais.read(buf, 0, buf.length)) != -1) {
                    if (n > 0) line.write(buf, 0, n);
                }

                line.drain();
                line.stop();
            }
        }
    }

    private static float clamp(float v, float lo, float hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    // -------- Utilidades opcionales --------

    /** Reproduce WAV desde archivo (atajo para pruebas). */
    public static void playFile(String path) throws Exception {
        byte[] wav = java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(path));
        play(wav);
    }
}
