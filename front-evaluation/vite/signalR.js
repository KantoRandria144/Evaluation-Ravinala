// src/signalrConnection.js
import * as signalR from '@microsoft/signalr';

const hubUrl = 'http://localhost:5231/notificationHub'; // Ajustez selon votre backend

const hubConnection = new signalR.HubConnectionBuilder()
  .withUrl(hubUrl, {
    accessTokenFactory: () => localStorage.getItem('token'),
    withCredentials: true, // Optionnel pour les cookies CORS
  })
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information) // Pour les logs de débogage
  .build();

const startConnection = async () => {
  try {
    await hubConnection.start();
    console.log('SignalR connected successfully');
  } catch (err) {
    console.error('Error while starting SignalR connection:', err);
    setTimeout(startConnection, 5000); // Retry après 5 secondes
  }
};

// Initialiser la connexion
startConnection();

// Gérer les événements de reconnexion
hubConnection.onreconnecting((error) => {
  console.assert(hubConnection.state === signalR.HubConnectionState.Reconnecting);
  console.log('Reconnecting to SignalR...', error);
});

hubConnection.onreconnected((connectionId) => {
  console.assert(hubConnection.state === signalR.HubConnectionState.Connected);
  console.log('Reconnected to SignalR. Connection ID:', connectionId);
});

hubConnection.onclose((error) => {
  console.log('SignalR connection closed.', error);
  setTimeout(startConnection, 5000);
});

export default hubConnection;
