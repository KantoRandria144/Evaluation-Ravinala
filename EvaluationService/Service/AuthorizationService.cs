using System.Net.Http;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using CommonModels.DTOs;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;

public class AuthorizationService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public AuthorizationService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(configuration["UserService:BaseUrl"]);
    }

    public async Task<bool> UserHasAccess(string userId, int requiredHabilitationAdminId)
    {
        // Affiche la base URL pour vérification
        // Console.WriteLine("UserService BaseUrl: " + _httpClient.BaseAddress);
        
        // Effectuer la requête HTTP pour obtenir les habilitations de l'utilisateur
        var response = await _httpClient.GetAsync($"/api/User/user-habilitations/{userId}");
        
        // Vérifie le statut de la réponse
        // Console.WriteLine("HTTP Status Code: " + response.StatusCode);
        
        if (!response.IsSuccessStatusCode)
        {
            // Console.WriteLine("Failed to fetch data from UserService.");
            return false;
        }

        // Lire le contenu JSON de la réponse
        var content = await response.Content.ReadAsStringAsync();
        // Console.WriteLine("Response Content:");
        // Console.WriteLine(content);

        // Options pour ignorer la casse des propriétés
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        // Désérialiser le contenu JSON en objet UserHabilitationDto avec gestion des erreurs
        UserHabilitationDto user = null;
        try
        {
            user = JsonSerializer.Deserialize<UserHabilitationDto>(content, options);
            // Console.WriteLine($"User deserialized successfully: Id={user?.Id}, Name={user?.Name}, Email={user?.Email}");
        }
        catch (JsonException ex)
        {
            // Console.WriteLine($"Deserialization error: {ex.Message}");
            return false;
        }

        // Vérifie si les habilitations sont nulles
        if (user?.Habilitations == null)
        {
            // Console.WriteLine("User habilitations are null");
            return false;
        }

        // Parcourt les habilitations et vérifie l'accès
        foreach (var habilitation in user.Habilitations)
        {
            // Console.WriteLine($"Habilitation ID: {habilitation.Id}, Label: {habilitation.Label}");
            if (habilitation.HabilitationAdmins != null)
            {
                foreach (var admin in habilitation.HabilitationAdmins)
                {
                    // Console.WriteLine($"Admin ID: {admin.Id}, Name: {admin.Name}");
                    if (admin.Id == requiredHabilitationAdminId)
                    {
                        // Console.WriteLine("Access granted");
                        return true;
                    }
                }
            }
        }
        
        // Console.WriteLine("Access denied");
        // Console.WriteLine(requiredHabilitationAdminId);
        return false;
    }
}