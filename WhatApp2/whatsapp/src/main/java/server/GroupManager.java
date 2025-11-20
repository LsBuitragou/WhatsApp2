package server;
import java.net.SocketAddress;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Maneja usuarios y grupos en el servidor.
 * Ahora usa UserSession para poder trabajar tanto con TCP (mensajes)
 * como con UDP (llamadas).
 */
public class GroupManager {
    // usuario -> sesión
    private final Map<String, UserSession> clients = new ConcurrentHashMap<>();
    // grupo -> lista de miembros
    private final Map<String, Set<String>> groups = new ConcurrentHashMap<>();

    private final Map<String, Set<String>> activeGroupCalls = new ConcurrentHashMap<>();

    // Llamadas activas: nombre del grupo -> conjunto de miembros conectados a la llamada



    public GroupManager() {}

    /** Registrar un nuevo usuario en el servidor */
    public void registerUser(String username, UserSession session) {
        clients.put(username, session);
        System.out.println("User registered: " + username);
    }

    /** Eliminar usuario de la lista y de todos los grupos */
    public void removeUser(String username) {
        clients.remove(username);
        groups.values().forEach(g -> g.remove(username));
        System.out.println("User removed: " + username);
    }

    /** Crear un grupo vacío */
    public void createGroup(String groupName) {
        groups.putIfAbsent(groupName, ConcurrentHashMap.newKeySet());
        System.out.println("Group created: " + groupName);
    }

    /** Agregar usuario a un grupo */
    public void addUserToGroup(String groupName, String username) {
        groups.putIfAbsent(groupName, ConcurrentHashMap.newKeySet());
        groups.get(groupName).add(username);
        System.out.println("User " + username + " joined group " + groupName);
    }

    /** Enviar mensaje privado entre dos usuarios */
    public void sendPrivateMessage(String from, String to, String message) {
        UserSession recipient = clients.get(to);
        if (recipient != null) {
            recipient.sendMessage("[Private from " + from + "]: " + message);
        } else {
            UserSession sender = clients.get(from);
            if (sender != null) {
                sender.sendMessage("User " + to + " not found.");
            }
        }
    }

    /** Enviar mensaje a todos los miembros de un grupo */
    public void sendGroupMessage(String from, String group, String message) {
        Set<String> members = groups.get(group);
        if (members == null) return;

        for (String user : members) {
            if (!user.equals(from)) {
                UserSession session = clients.get(user);
                if (session != null) {
                    session.sendMessage("[" + group + "] " + from + ": " + message);
                }
            }
        }
    }

    /** Obtener una sesión de usuario */
    public UserSession getUserSession(String username) {
        return clients.get(username);
    }

    public Collection<UserSession> getAllUserSessions() {
    return clients.values();
    }

    
    public UserSession findUserByUdpAddress(SocketAddress addr) {
        for (UserSession user : getAllUserSessions()) {
            if (addr.equals(user.getUdpAddress())) {
                return user;
            }
        }
        return null;
    }

    /** Obtener el compañero actual de llamada de un usuario */
    public UserSession getActiveCallPartner(UserSession user) {
        if (user.getInCallWith() != null) {
            return getUserSession(user.getInCallWith());
        }
        return null;
    }

    /** Registrar las direcciones UDP de ambos usuarios cuando empieza una llamada */
    public void linkCall(String userA, String userB, SocketAddress addrA, SocketAddress addrB) {
        UserSession sessionA = getUserSession(userA);
        UserSession sessionB = getUserSession(userB);

        if (sessionA != null && sessionB != null) {
            sessionA.setInCallWith(userB);
            sessionB.setInCallWith(userA);
            sessionA.setUdpAddress(addrA);
            sessionB.setUdpAddress(addrB);
            System.out.println("Llamada vinculada entre " + userA + " y " + userB);
        }
    }

    public void startGroupCall(String username, String groupName) {
        if (!groups.containsKey(groupName)) {
            UserSession u = clients.get(username);
            if (u != null) u.sendMessage("❌ El grupo " + groupName + " no existe.");
            return;
        }

        // Inicializa la llamada grupal si no existe
        activeGroupCalls.putIfAbsent(groupName, ConcurrentHashMap.newKeySet());
        activeGroupCalls.get(groupName).add(username);

        // Notificar a todos los usuarios del grupo
        broadcastToGroup(groupName, "📞 Llamada grupal iniciada por " + username);
        broadcastToGroup(groupName, "👉 Usa el comando /joincall " + groupName + " para unirte.");
    }


    public Set<String> getActiveCallMembers(String groupName) {
        return activeGroupCalls.getOrDefault(groupName, Set.of());
    }

    public void broadcastToGroup(String groupName, String message) {
        Set<String> groupMembers = new HashSet<>();

        // Añadir miembros del grupo
        groupMembers.addAll(groups.getOrDefault(groupName, Set.of()));

        // Añadir miembros activos en llamada (si hay una)
        if (activeGroupCalls.containsKey(groupName)) {
            groupMembers.addAll(activeGroupCalls.get(groupName));
        }

        // Enviar el mensaje a todos los usuarios conectados del grupo
        for (String member : groupMembers) {
            UserSession s = clients.get(member);
            if (s != null) {
                s.sendMessage(message);
            }
        }
    }


    public Set<String> getAllGroups() {
    return groups.keySet();
    }

    public boolean groupExists(String groupName) {
        return groups.containsKey(groupName);
    }

    public void addUserToGroupCall(String username, String groupName) {
        activeGroupCalls.putIfAbsent(groupName, ConcurrentHashMap.newKeySet());
        activeGroupCalls.get(groupName).add(username);
    }


    public void joinGroupCall(String username, String groupName, SocketAddress udpAddr) {
        if (!groups.containsKey(groupName)) {
            UserSession u = clients.get(username);
            if (u != null) u.sendMessage("El grupo " + groupName + " no existe.");
            return;
        }

        activeGroupCalls.putIfAbsent(groupName, ConcurrentHashMap.newKeySet());
        activeGroupCalls.get(groupName).add(username);

        UserSession user = clients.get(username);
        if (user != null) {
            user.setUdpAddress(udpAddr);
            user.sendMessage("Te uniste a la llamada grupal " + groupName);
        }

        broadcastToGroup(groupName, " " + username + " se unió a la llamada grupal.");
    }

    public String getActiveGroupCallName(UserSession user) {
        for (var entry : activeGroupCalls.entrySet()) {
            if (entry.getValue().contains(user.getUsername())) {
                return entry.getKey();
            }
        }
        return null;
    }


    public String getGroupInActiveCall(String username) {
        for (String group : activeGroupCalls.keySet()) {
            Set<String> members = activeGroupCalls.get(group);
            if (members.contains(username)) return group;
        }
        return null;
    }

    public void removeUserFromGroupCall(String username, String groupName) {
        if (activeGroupCalls.containsKey(groupName)) {
            activeGroupCalls.get(groupName).remove(username);
        }
    }


}

