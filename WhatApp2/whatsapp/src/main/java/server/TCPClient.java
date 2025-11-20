package server;

import java.io.*;
import java.net.Socket;
import java.util.Base64;

import audio.WavRecorder;
import ui.ConsoleUI;

public class TCPClient {

    private static final int PORT = 12345;
    private static int myLocalCallPort = -1; // se setea con /call

    public static void main(String[] args) {
        try {
            Socket socket = new Socket("localhost", PORT);
            System.out.println("Connected to server on port " + PORT);

            BufferedReader userInput = new BufferedReader(new InputStreamReader(System.in));
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
            ConsoleUI ui = new ConsoleUI();

            // ---- Hilo para escuchar mensajes del servidor ----
            Thread listener = new Thread(() -> {
                try {
                    String line;
                    while ((line = in.readLine()) != null) {

                        // 1) Detectar nota de voz embebida en la línea (DM o grupo)
                        int tagIdx = line.indexOf("[VoiceMsg]");
                        if (tagIdx >= 0) {
                            String base64 = line.substring(tagIdx + "[VoiceMsg]".length()).trim();
                            try {
                                byte[] wavBytes = Base64.getDecoder().decode(base64);

                                // Guardar (opcional) para inspección rápida
                                try (FileOutputStream fos = new FileOutputStream("nota_recibida.wav")) {
                                    fos.write(wavBytes);
                                } catch (Exception ex) {
                                    System.out.println("No pude guardar nota_recibida.wav: " + ex.getMessage());
                                }

                                ui.reproducirNotaVoz(wavBytes);
                                ui.saveChatMessage("[VoiceMsg] (reproducida)");
                            } catch (Exception decodeEx) {
                                System.out.println("No pude decodificar la nota recibida: " + decodeEx.getMessage());
                                ui.saveChatMessage("[VoiceMsg] (falló decodificación)");
                            }
                            // No imprimas la línea completa (evita base64 gigante)
                            continue;
                        }

                        // 2) Señalización de llamadas (igual que antes)
                        System.out.println(line);
                        ui.saveChatMessage(line);

                        if (line.startsWith("Incoming call from")) {
                            try {
                                String[] parts = line.split("at /");
                                String[] addrParts = parts[1].split(":");
                                String remoteIP = addrParts[0];
                                int remotePort = Integer.parseInt(addrParts[1]);
                                if (myLocalCallPort > 0) {
                                    int localPort = myLocalCallPort;
                                    System.out.println(" Iniciando llamada con " + remoteIP + ":" + remotePort);
                                    new Thread(() -> UDPClient.startCall(remoteIP, remotePort, localPort)).start();
                                } else {
                                    System.out.println(" No has configurado tu puerto local con /call <puerto>");
                                }
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        } else if (line.startsWith("Calling ")) {
                            try {
                                String[] parts = line.split("at /");
                                String[] addrParts = parts[1].split(":");
                                String remoteIP = addrParts[0];
                                int remotePort = Integer.parseInt(addrParts[1]);
                                int localPort = myLocalCallPort;
                                System.out.println("Iniciando llamada con " + remoteIP + ":" + remotePort);
                                new Thread(() -> UDPClient.startCall(remoteIP, remotePort, localPort)).start();
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    }
                } catch (IOException e) {
                    System.out.println("Disconnected from server.");
                }
            });
            listener.setName("server-listener");
            listener.start();

            // ---- Hilo para escribir ----
            while (true) {
                System.out.print("Enter message: ");
                String message = userInput.readLine();
                if (message == null) break;

                // salir (permite "exit" o "/exit")
                if (message.equalsIgnoreCase("exit") || message.equalsIgnoreCase("/exit")) {
                    out.println("/exit");
                    break;
                }

                // ---- Historial: últimos N (por defecto 3) ----
                // /recent [N]
                if (message.startsWith("/recent")) {
                    int n = 3;
                    String[] p = message.trim().split("\\s+");
                    if (p.length == 2) {
                        try { n = Integer.parseInt(p[1]); } catch (NumberFormatException ignored) {}
                    }
                    ui.printRecent(n);
                    continue;
                }

                // ---- Notas de voz: grabar y enviar (DM) ----
                // /voice <usuario> <segundos>
                if (message.startsWith("/voice ")) {
                    String[] parts = message.trim().split("\\s+");
                    if (parts.length == 3) {
                        String toUser = parts[1];
                        int seconds;
                        try { seconds = Integer.parseInt(parts[2]); }
                        catch (NumberFormatException nfe) { System.out.println("Uso: /voice <usuario> <segundos>"); continue; }

                        try {
                            byte[] wav = WavRecorder.recordSeconds(seconds);
                            final int MAX_VNOTE_BYTES = 1_500_000;
                            if (wav.length > MAX_VNOTE_BYTES) {
                                System.out.println("Nota muy grande (" + wav.length + " bytes). Máximo: " + MAX_VNOTE_BYTES);
                                continue;
                            }
                            // Guarda copia local para verificar captura
                            try (FileOutputStream fos = new FileOutputStream("nota_enviada.wav")) { fos.write(wav); }
                            String base64 = Base64.getEncoder().encodeToString(wav);
                            out.println("/voice " + toUser + " " + base64);
                            ui.saveChatMessage("[Yo -> " + toUser + "] [VoiceMsg] (" + wav.length + " bytes)");
                        } catch (Exception ex) {
                            System.out.println("Error grabando/enviando nota: " + ex.getMessage());
                        }
                        continue;
                    } else {
                        System.out.println("Uso: /voice <usuario> <segundos>");
                        continue;
                    }
                }

                // ---- Notas de voz: grabar y enviar (GRUPO) ----
                // /voicegroup <grupo> <segundos>
                if (message.startsWith("/voicegroup ")) {
                    String[] parts = message.trim().split("\\s+");
                    if (parts.length == 3) {
                        String group = parts[1];
                        int seconds;
                        try { seconds = Integer.parseInt(parts[2]); }
                        catch (NumberFormatException nfe) { System.out.println("Uso: /voicegroup <grupo> <segundos>"); continue; }

                        try {
                            byte[] wav = WavRecorder.recordSeconds(seconds);
                            final int MAX_VNOTE_BYTES = 1_500_000;
                            if (wav.length > MAX_VNOTE_BYTES) {
                                System.out.println("Nota muy grande (" + wav.length + " bytes). Máximo: " + MAX_VNOTE_BYTES);
                                continue;
                            }
                            String base64 = Base64.getEncoder().encodeToString(wav);
                            out.println("/voicegroup " + group + " " + base64);
                            ui.saveChatMessage("[Yo -> " + group + "] [VoiceMsg] (" + wav.length + " bytes)");
                        } catch (Exception ex) {
                            System.out.println("Error grabando/enviando nota: " + ex.getMessage());
                        }
                        continue;
                    } else {
                        System.out.println("Uso: /voicegroup <grupo> <segundos>");
                        continue;
                    }
                }

                // ---- Notas de voz: enviar archivo local (DM) ----
                // /voicefile <usuario> <ruta_wav>
                if (message.startsWith("/voicefile ")) {
                    String[] parts = message.split(" ", 3);
                    if (parts.length == 3) {
                        String toUser = parts[1];
                        String filePath = parts[2];
                        try {
                            File file = new File(filePath);
                            if (!file.exists()) { System.out.println("El archivo no existe: " + filePath); continue; }
                            byte[] wav = java.nio.file.Files.readAllBytes(file.toPath());
                            final int MAX_VNOTE_BYTES = 1_500_000;
                            if (wav.length > MAX_VNOTE_BYTES) {
                                System.out.println("Nota muy grande (" + wav.length + " bytes). Máximo: " + MAX_VNOTE_BYTES);
                                continue;
                            }
                            String base64 = Base64.getEncoder().encodeToString(wav);
                            out.println("/voice " + toUser + " " + base64);
                            ui.saveChatMessage("[VoiceMsg] Archivo enviado a " + toUser);
                        } catch (Exception ex) {
                            System.out.println("Error al leer el archivo: " + ex.getMessage());
                        }
                        continue;
                    } else {
                        System.out.println("Uso: /voicefile <usuario> <ruta_wav>");
                        continue;
                    }
                }

                // ---- Notas de voz: enviar archivo local (GRUPO) ----
                // /voicegroupfile <grupo> <ruta_wav>
                if (message.startsWith("/voicegroupfile ")) {
                    String[] parts = message.split(" ", 3);
                    if (parts.length == 3) {
                        String group = parts[1];
                        String filePath = parts[2];
                        try {
                            File file = new File(filePath);
                            if (!file.exists()) { System.out.println("El archivo no existe: " + filePath); continue; }
                            byte[] wav = java.nio.file.Files.readAllBytes(file.toPath());
                            final int MAX_VNOTE_BYTES = 1_500_000;
                            if (wav.length > MAX_VNOTE_BYTES) {
                                System.out.println("Nota muy grande (" + wav.length + " bytes). Máximo: " + MAX_VNOTE_BYTES);
                                continue;
                            }
                            String base64 = Base64.getEncoder().encodeToString(wav);
                            out.println("/voicegroup " + group + " " + base64);
                            ui.saveChatMessage("[VoiceMsg] Archivo enviado a grupo " + group);
                        } catch (Exception ex) {
                            System.out.println("Error al leer el archivo: " + ex.getMessage());
                        }
                        continue;
                    } else {
                        System.out.println("Uso: /voicegroupfile <grupo> <ruta_wav>");
                        continue;
                    }
                }

                // ---- /call: registrar puerto local UDP ----
                if (message.startsWith("/call ")) {
                    try {
                        String[] parts = message.split("\\s+");
                        myLocalCallPort = Integer.parseInt(parts[1]);
                        System.out.println("Registrado localPort = " + myLocalCallPort);
                    } catch (NumberFormatException e) {
                        System.out.println("Uso correcto: /call <puerto>");
                        continue;
                    }
                    out.println(message); // notifica al servidor
                    continue;
                }

                // ---- Resto de comandos / chat ----
                ui.saveChatMessage("[Yo] " + message);
                out.println(message);
            }

            socket.close();
            in.close();
            out.close();
            userInput.close();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            System.out.println("Client terminated.");
        }
    }
}
