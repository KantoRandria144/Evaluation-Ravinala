import React, { useEffect, useState } from "react";
import { fetchStoredNotifications } from "./api/notifications"; // Chemin vers votre fichier API
import hubConnection from "./signalR"; // SignalR configuration

const Notifications = ({ userId }) => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Récupérer les notifications stockées
        fetchStoredNotifications(userId).then((storedNotifications) => {
            setNotifications(storedNotifications.map((notif) => ({
                id: notif.id,
                message: notif.message,
                isRead: notif.isRead,
                isRealTime: false,
            })));
        });

        // Connexion à SignalR pour les notifications en temps réel
        hubConnection
            .start()
            .then(() => {
                hubConnection.on("ReceiveNotification", (message) => {
                    setNotifications((prev) => [...prev, { id: null, message, isRealTime: true }]);
                });
            })
            .catch((err) => console.error("Erreur SignalR :", err));

        // Nettoyage à la déconnexion
        return () => {
            hubConnection.off("ReceiveNotification");
            hubConnection.stop();
        };
    }, [userId]);

    return (
        <div>
            <h1>Notifications</h1>
            <ul>
                {notifications.map((notif) => (
                    <li key={notif.id || notif.message}>
                        {notif.message} {notif.isRealTime && <span>(Temps réel)</span>}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Notifications;