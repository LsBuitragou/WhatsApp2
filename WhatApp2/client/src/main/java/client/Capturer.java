package client;

import javax.sound.sampled.AudioFormat;


public class Capturer {
    private String username;
    private PlayerThread playerThread;

    public Capturer(String username) {
        this.username = username;
    }

    public void start() throws Exception {
        AudioFormat format = new AudioFormat(44100, 16, 1, true, true);
        playerThread = new PlayerThread(format);
        playerThread.setPlay(true);
        playerThread.start();
        System.out.println("Capturer iniciado para: " + username);
    }

    public void stop() {
        if(playerThread != null) playerThread.setPlay(false);
    }
}