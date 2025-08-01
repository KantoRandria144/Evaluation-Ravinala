using EvaluationService.Models;
using Newtonsoft.Json;

public class NotificationService
{
    private static readonly Dictionary<string, StreamWriter> ActiveConnections = new();

    public static void RegisterClient(string userId, StreamWriter stream)
    {
        lock (ActiveConnections)
        {
            if (!ActiveConnections.ContainsKey(userId))
            {
                ActiveConnections[userId] = stream;
            }
        }
    }

    public static void Notify(string userId, Notification notification)
    {
        lock (ActiveConnections)
        {
            if (ActiveConnections.TryGetValue(userId, out var stream))
            {
                try
                {
                    stream.WriteLineAsync($"data: {JsonConvert.SerializeObject(notification)}\n\n").Wait();
                    stream.FlushAsync().Wait();
                }
                catch
                {
                    ActiveConnections.Remove(userId);
                }
            }
        }
    }

    public static void UnregisterClient(string userId)
    {
        lock (ActiveConnections)
        {
            if (ActiveConnections.ContainsKey(userId))
            {
                ActiveConnections.Remove(userId);
            }
        }
    }
}
