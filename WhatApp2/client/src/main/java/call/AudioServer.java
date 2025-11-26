package call;

import com.zeroc.Ice.*;

public class AudioServer {

    public static void main(String[] args) {
        try (Communicator communicator = Util.initialize(args)) {

            ObjectAdapter adapter =
                communicator.createObjectAdapterWithEndpoints("AudioAdapter",
                        "ws -h localhost -p 9099");

            SubjectImpl impl = new SubjectImpl();

            adapter.add(impl, Util.stringToIdentity("AudioService"));
            adapter.activate();
        

            System.out.println("[SERVER] Ice WebSocket server ready on ws://localhost:9099");

            communicator.waitForShutdown();
            
        }
    }
}
