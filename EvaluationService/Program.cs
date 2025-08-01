using Microsoft.EntityFrameworkCore;
using EvaluationService.Data;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json.Serialization;
using SendGrid;

var builder = WebApplication.CreateBuilder(args);

// Ajouter SignalR
builder.Services.AddSignalR();

// Configuration de la connexion à SQL Server
builder.Services.AddDbContext<AppdbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
           .EnableSensitiveDataLogging()
           .LogTo(Console.WriteLine, LogLevel.Information));

// Ajouter Swagger pour la documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Ajouter les contrôleurs
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.WriteIndented = true;
});

// Ajouter HttpClient pour UserService avec l'URL de base
builder.Services.AddHttpClient("UserService", client =>
{
    var baseUrl = builder.Configuration["UserService:BaseUrl"];
    client.BaseAddress = new Uri(baseUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Ajouter un service personnalisé à l'injection de dépendances
builder.Services.AddScoped<AuthorizationService>();

builder.Services.AddSingleton<ISendGridClient>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var apiKey = configuration["SendGrid:ApiKey"];
    return new SendGridClient(apiKey);
});


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:3000") // Frontend URL
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .SetIsOriginAllowed(_ => true); // For SignalR or if cookies are involved
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Apply middleware in the correct order
app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("AllowAll"); // Ensure this comes after UseRouting
app.UseAuthorization();

// Map endpoints
app.MapHub<NotificationHub>("/notificationHub").RequireCors("AllowAll");
app.MapControllers();

app.Run();

