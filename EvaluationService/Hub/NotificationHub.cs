using Microsoft.AspNetCore.SignalR;

public class NotificationHub : Hub
{
    // Méthode pour envoyer une notification à un utilisateur spécifique
    public async Task Notify(string userId, string message)
    {
        Console.WriteLine($"Sending notification to user: {userId}, message: {message}");
        await Clients.User(userId).SendAsync("ReceiveNotification", message);
    }
}