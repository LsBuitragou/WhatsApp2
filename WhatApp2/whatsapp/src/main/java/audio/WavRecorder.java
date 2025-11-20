package audio;


import javax.sound.sampled.*;
import java.io.*;

public class WavRecorder {

    // Formato estándar: 16 kHz, 16-bit, mono, little-endian (signed)
    private static final AudioFormat FORMAT = new AudioFormat(
            AudioFormat.Encoding.PCM_SIGNED,
            16000f,  // sample rate
            16,      // sample size in bits
            1,       // channels
            2,       // frame size = channels * 2 bytes
            16000f,  // frame rate
            false    // little-endian
    );

    /**
     * Graba del micrófono durante N segundos y devuelve un WAV válido en memoria.
     */
    public static byte[] recordSeconds(int seconds) throws Exception {
        if (seconds <= 0 || seconds > 120) {
            throw new IllegalArgumentException("seconds must be in (0, 120]");
        }

        DataLine.Info info = new DataLine.Info(TargetDataLine.class, FORMAT);

        // Si quieres elegir mixer concreto, reemplaza esta línea por AudioSystem.getMixer(...).getLine(info)
        TargetDataLine line = (TargetDataLine) AudioSystem.getLine(info);

        ByteArrayOutputStream rawPcm = new ByteArrayOutputStream( seconds * (int)FORMAT.getSampleRate() * FORMAT.getFrameSize() );

        byte[] buf = new byte[4096];
        try {
            line.open(FORMAT);
            line.start();

            long end = System.currentTimeMillis() + seconds * 1000L;
            while (System.currentTimeMillis() < end) {
                int n = line.read(buf, 0, buf.length);
                if (n > 0) rawPcm.write(buf, 0, n);
            }
        } finally {
            try { line.stop(); } catch (Exception ignored) {}
            try { line.close(); } catch (Exception ignored) {}
        }

        // Empaquetar PCM crudo en contenedor WAV
        byte[] pcm = rawPcm.toByteArray();
        try (AudioInputStream ais = new AudioInputStream(
                new ByteArrayInputStream(pcm), FORMAT, pcm.length / FORMAT.getFrameSize());
             ByteArrayOutputStream wavOut = new ByteArrayOutputStream(pcm.length + 44)) {
            AudioSystem.write(ais, AudioFileFormat.Type.WAVE, wavOut);
            byte[] wav = wavOut.toByteArray();

            // Diagnóstico: nivel RMS (0..1). Si ~0.000–0.005 probablemente grabaste silencio.
            double level = rms(wav);
            System.out.printf("Nivel de grabación (RMS): %.3f%n", level);

            return wav;
        }
    }


    private static double rms(byte[] wavLE16) {
        if (wavLE16 == null || wavLE16.length <= 46) return 0.0;
        long sumSq = 0;
        int count = 0;
        // Saltamos cabecera WAV mínima (44 bytes)
        for (int i = 44; i + 1 < wavLE16.length; i += 2) {
            int lo = wavLE16[i] & 0xff;
            int hi = wavLE16[i + 1];
            int sample = (hi << 8) | lo; // signed little-endian
            sumSq += (long) sample * sample;
            count++;
        }
        if (count == 0) return 0.0;
        double rms = Math.sqrt(sumSq / (double) count) / 32768.0;
        return Math.min(1.0, Math.max(0.0, rms));
    }

    // -------- Utilidades opcionales --------

    /** Lista mixers disponibles por consola (entrada/salida). Útil para depurar dispositivos. */
    public static void listMixers() {
        for (Mixer.Info mi : AudioSystem.getMixerInfo()) {
            System.out.println(mi.getName() + " — " + mi.getDescription());
        }
    }

    /** Guarda bytes WAV a disco rápidamente. */
    public static void saveWav(byte[] wav, String path) throws IOException {
        try (FileOutputStream fos = new FileOutputStream(path)) {
            fos.write(wav);
        }
    }
}
