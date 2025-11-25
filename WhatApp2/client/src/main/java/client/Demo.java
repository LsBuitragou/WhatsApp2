package client;

import com.zeroc.Ice.*;
import Demo.*;

/**
 * Cliente Java que se conecta al servidor Ice, registra un Observer,
 * y espera notificaciones de llamadas.
 */
public class Demo {

    public static void main(String[] args) {
        if (args.length == 0) {
            System.err.println("Usage: java client.Demo <username>");
            System.exit(1);
        }

        String username = args[0];
        System.out.println("[Demo Client] Starting as user: " + username);

        try (Communicator communicator = Util.initialize(args)) {
            
            // Conectar al Subject en el servidor
            ObjectPrx base = communicator.stringToProxy("Subject:ws -h localhost -p 9099");
            SubjectPrx subject = SubjectPrx.checkedCast(base);
            
            if (subject == null) {
                throw new Error("Invalid proxy");
            }

            System.out.println("[Demo Client] Connected to Subject");

            // Crear adaptador para recibir callbacks (Observer)
            ObjectAdapter adapter = communicator.createObjectAdapterWithEndpoints(
                "ClientAdapter", "ws -h localhost -p 0"
            );

            // Crear implementación del Observer
            ObserverI observer = new ObserverI(username);
            
            // Registrar el observer local
            ObserverPrx observerProxy = ObserverPrx.uncheckedCast(
                adapter.addWithUUID(observer)
            );
            
            adapter.activate();
            
            System.out.println("[Demo Client] ObserverAdapter activated, registering with Subject");

            // Registrar el observer con el servidor
            subject.attachObserver(observerProxy, username);
            
            System.out.println("[Demo Client] Registered as " + username + ", waiting for calls...");

            // Esperar indefinidamente
            communicator.waitForShutdown();
            
        } catch (java.lang.Exception e) {
            System.err.println("[Demo Client] Error: " + e);
            e.printStackTrace();
            System.exit(1);
        }
    }
}
