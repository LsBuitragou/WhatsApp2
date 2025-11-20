package ui;

import audio.WavPlayer;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Consola con buffer de últimos mensajes y utilidades
 * para reproducir notas de voz.
 */
public class ConsoleUI {

    // Tamaño máximo del historial en memoria
    private static final int MAX_SIZE = 100;

    private final Deque<String> buffer = new ArrayDeque<>(MAX_SIZE);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    /** Guarda un mensaje en el historial (thread-safe). */
    public synchronized void saveChatMessage(String msg) {
        // Evita spamear base64 gigantes en el historial
        if (msg != null && msg.contains("[VoiceMsg]")) {
            msg = "[VoiceMsg] (contenido omitido)";
        }
        String line = "[" + LocalDateTime.now().format(FMT) + "] " + msg;
        if (buffer.size() == MAX_SIZE) buffer.removeFirst();
        buffer.addLast(line);
    }

    /** Imprime los últimos N mensajes (por defecto 3 si N<=0). */
    public synchronized void printRecent(int n) {
        if (n <= 0) n = 3;
        int skip = Math.max(0, buffer.size() - n);
        int i = 0;
        System.out.println("---- Últimos " + n + " ----");
        for (String s : buffer) {
            if (i++ < skip) continue;
            System.out.println(s);
        }
        System.out.println("-------------------");
    }

    /** Reproduce una nota de voz WAV ya cargada en memoria. */
    public void reproducirNotaVoz(byte[] wavBytes) {
        if (wavBytes == null || wavBytes.length < 44) {
            System.out.println("Nota de voz vacía o inválida.");
            return;
        }
        try {
            System.out.println("Reproduciendo nota de voz...");
            WavPlayer.play(wavBytes);
        } catch (Exception e) {
            System.out.println("Error reproduciendo nota de voz: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
