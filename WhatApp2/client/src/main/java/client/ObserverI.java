package client;

import Demo.Observer;
import com.zeroc.Ice.Current;

public class ObserverI implements Observer {

    private CallClient callClient; 

    public ObserverI() {
    }

    public void attachCallClient(CallClient cc) {
    this.callClient = cc;}

    @Override
    public void notifyMessage(byte[] data, Current current) {
        if (callClient != null) {
            callClient.playIncomingAudio(data);
        }
    }

    @Override
    public void onCallStarted(String sessionId, Current current) {
        System.out.println("Llamada iniciada: " + sessionId);
    }

    @Override
    public void onCallEnded(String sessionId, Current current) {
        System.out.println("Llamada finalizada: " + sessionId);
    }
}