```markdown:README.md
# Système d'Évaluation - Architecture Microservices

## 📋 Vue d'ensemble du système

Ce projet implémente un système d'évaluation basé sur une architecture microservices avec :
- **UserService** : Gestion des utilisateurs et authentification
- **EvaluationService** : Gestion des évaluations et périodes
- **Frontend** : Interface utilisateur (Web/Mobile)

## 🏗️ Architecture globale

```

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Frontend │ │ UserService │ │ EvaluationService│
│ (Client) │◄──►│ (API) │◄──►│ (API) │
│ │ │ │ │ │
│ - Interface UI │ │ - Auth │ │ - Evaluations │
│ - Notifications │ │ - Users CRUD │ │ - Périodes │
│ - SignalR │ │ - Permissions │ │ - Notifications │
└─────────────────┘ └─────────────────┘ └─────────────────┘
│ │ │
│ │ │
└───────────────────────┼───────────────────────┘
│
┌─────────────────┐
│ SQL Server │
│ (Database) │
│ │
│ - Users DB │
│ - Evaluations DB│
└─────────────────┘

```

## 🔧 Services détaillés

### 1. UserService

#### Responsabilités
- Authentification et autorisation
- Gestion des utilisateurs (CRUD)
- Gestion des rôles et permissions
- Validation des tokens

#### Technologies
- ASP.NET Core Web API
- Entity Framework Core
- SQL Server
- JWT Authentication
- Swagger/OpenAPI

#### Structure
```

UserService/
├── Controllers/
│ ├── AuthController.cs # Authentification
│ ├── UserController.cs # Gestion utilisateurs
│ └── RoleController.cs # Gestion des rôles
├── Models/
│ ├── User.cs # Modèle utilisateur
│ ├── Role.cs # Modèle rôle
│ └── DTOs/ # Data Transfer Objects
├── Services/
│ ├── AuthService.cs # Service d'authentification
│ ├── UserService.cs # Service utilisateur
│ └── TokenService.cs # Gestion des tokens
├── Data/
│ └── UserDbContext.cs # Contexte base de données
└── Program.cs # Configuration

```

#### Endpoints principaux
```

POST /api/auth/login # Connexion
POST /api/auth/register # Inscription
GET /api/users # Liste des utilisateurs
POST /api/users # Créer utilisateur
PUT /api/users/{id} # Modifier utilisateur
DELETE /api/users/{id} # Supprimer utilisateur
GET /api/users/{id}/roles # Rôles d'un utilisateur

```

### 2. EvaluationService

#### Responsabilités
- Gestion des évaluations
- Gestion des périodes d'évaluation
- Validation des données d'évaluation
- Notifications temps réel (SignalR)
- Envoi d'emails (SendGrid)

#### Technologies
- ASP.NET Core Web API
- Entity Framework Core
- SQL Server
- SignalR (temps réel)
- SendGrid (emails)
- Swagger/OpenAPI

#### Structure
```

EvaluationService/
├── Controllers/
│ ├── PeriodeController.cs # Gestion des périodes
│ ├── EvaluationController.cs # Gestion des évaluations
│ └── NotificationController.cs # Notifications
├── Models/
│ ├── Evaluation.cs # Modèle évaluation
│ ├── Periode.cs # Modèle période
│ └── DTOs/
│ ├── EvaluationDto.cs # DTO évaluation
│ └── ErrorResponse.cs # Réponse d'erreur
├── Services/
│ ├── AuthorizationService.cs # Autorisation
│ ├── EmailService.cs # Service email
│ └── NotificationService.cs # Service notifications
├── Hubs/
│ └── NotificationHub.cs # Hub SignalR
├── Data/
│ └── AppdbContext.cs # Contexte base de données
└── Program.cs # Configuration

```

#### Endpoints principaux
```

GET /api/periode # Liste des périodes
POST /api/periode # Créer période/évaluation
PUT /api/periode/{id} # Modifier période
DELETE /api/periode/{id} # Supprimer période
GET /api/evaluations # Liste des évaluations
POST /api/evaluations # Créer évaluation
GET /api/evaluations/{id} # Détail évaluation

```

### 3. Frontend

#### Technologies possibles
- **React/Vue.js/Angular** (SPA)
- **Blazor** (si .NET)
- **Mobile** : React Native, Flutter, Xamarin

#### Responsabilités
- Interface utilisateur
- Authentification côté client
- Communication avec les APIs
- Notifications temps réel (SignalR)
- Gestion des états

#### Structure type (React)
```

frontend/
├── src/
│ ├── components/
│ │ ├── Auth/ # Composants d'authentification
│ │ ├── Users/ # Gestion des utilisateurs
│ │ ├── Evaluations/ # Gestion des évaluations
│ │ └── Common/ # Composants partagés
│ ├── services/
│ │ ├── authService.js # Service d'authentification
│ │ ├── userService.js # Service utilisateur
│ │ ├── evaluationService.js # Service évaluation
│ │ └── signalrService.js # Service SignalR
│ ├── store/ # Gestion d'état (Redux/Vuex)
│ ├── utils/ # Utilitaires
│ └── App.js # Composant principal
├── public/
└── package.json

````

## 🔄 Communication inter-services

### 1. Frontend ↔ UserService
```javascript
// Authentification
const login = async (credentials) => {
  const response = await fetch(`${USER_SERVICE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return response.json();
};
````

### 2. Frontend ↔ EvaluationService

```javascript
// Création d'évaluation
const createEvaluation = async (evaluationData, userId) => {
  const response = await fetch(
    `${EVAL_SERVICE_URL}/api/periode?userId=${userId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(evaluationData),
    }
  );
  return response.json();
};
```

### 3. EvaluationService ↔ UserService

```csharp
// Dans EvaluationService
public class AuthorizationService
{
    private readonly HttpClient _httpClient;

    public async Task<bool> ValidateUserAsync(string userId)
    {
        var response = await _httpClient.GetAsync($"/api/users/{userId}");
        return response.IsSuccessStatusCode;
    }
}
```

## 📊 Base de données

### UserService Database

```sql
-- Tables principales
Users (Id, Username, Email, PasswordHash, CreatedAt, UpdatedAt)
Roles (Id, Name, Description)
UserRoles (UserId, RoleId)
```

### EvaluationService Database

```sql
-- Tables principales
Evaluations (Id, UserId, EvalAnnee, Type, Status, CreatedAt)
Periodes (Id, Name, StartDate, EndDate, IsActive)
EvaluationPeriodes (EvaluationId, PeriodeId)
```

## 🚀 Configuration et déploiement

### Variables d'environnement

#### UserService

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=UserServiceDB;..."
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key",
    "Issuer": "UserService",
    "Audience": "EvaluationSystem"
  }
}
```

#### EvaluationService

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=EvaluationServiceDB;..."
  },
  "UserService": {
    "BaseUrl": "https://localhost:5001"
  },
  "SendGrid": {
    "ApiKey": "your-sendgrid-key"
  }
}
```

#### Frontend

```javascript
// config.js
export const API_CONFIG = {
  USER_SERVICE_URL:
    process.env.REACT_APP_USER_SERVICE_URL || "https://localhost:5001",
  EVALUATION_SERVICE_URL:
    process.env.REACT_APP_EVAL_SERVICE_URL || "https://localhost:5002",
  SIGNALR_HUB_URL:
    process.env.REACT_APP_SIGNALR_URL ||
    "https://localhost:5002/notificationHub",
};
```

## 🔐 Sécurité

### Authentification JWT

1. **Login** → UserService génère JWT
2. **Token** → Inclus dans toutes les requêtes
3. **Validation** → Chaque service valide le token
4. **Refresh** → Mécanisme de renouvellement

### Autorisation

```csharp
// Exemple de middleware d'autorisation
[Authorize(Roles = "Admin,Manager")]
public async Task<IActionResult> CreateEvaluation([FromBody] EvaluationDto dto)
{
    // Logique métier
}
```

## 📱 Notifications temps réel

### SignalR Hub

```csharp
// Dans EvaluationService
public class NotificationHub : Hub
{
    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
    }

    public async Task NotifyEvaluationCreated(string userId, object evaluation)
    {
        await Clients.Group($"user_{userId}").SendAsync("EvaluationCreated", evaluation);
    }
}
```

### Client SignalR (Frontend)

```javascript
// Service SignalR
import { HubConnectionBuilder } from "@microsoft/signalr";

const connection = new HubConnectionBuilder()
  .withUrl(`${EVAL_SERVICE_URL}/notificationHub`)
  .build();

connection.on("EvaluationCreated", (evaluation) => {
  // Mettre à jour l'interface
  updateEvaluationList(evaluation);
});
```

## 🛠️ Développement local

### Prérequis

- .NET 6.0+
- Node.js 16+ (pour le frontend)
- SQL Server
- Visual Studio/VS Code

### Démarrage rapide

```bash
# 1. Démarrer UserService
cd UserService
dotnet run

# 2. Démarrer EvaluationService
cd EvaluationService
dotnet run

# 3. Démarrer Frontend
cd frontend
npm install
npm start
```

### URLs de développement

- UserService: https://localhost:5001
- EvaluationService: https://localhost:5002
- Frontend: http://localhost:3000
- Swagger UserService: https://localhost:5001/swagger
- Swagger EvaluationService: https://localhost:5002/swagger

## 📝 Tests

### Tests unitaires

```bash
# Backend
dotnet test UserService.Tests
dotnet test EvaluationService.Tests

# Frontend
npm test
```

### Tests d'intégration

- Tests des APIs avec Postman/Insomnia
- Tests de bout en bout avec Cypress/Playwright

## 🚦 Bonnes pratiques

### Backend

1. **Validation** : Toujours valider les inputs
2. **Logging** : Logger les actions importantes
3. **Gestion d'erreurs** : Réponses standardisées
4. **Async/Await** : Pour toutes les opérations I/O
5. **Dependency Injection** : Respecter les patterns

### Frontend

1. **State Management** : Utiliser Redux/Vuex pour l'état global
2. **Error Handling** : Gestion centralisée des erreurs
3. **Loading States** : Indicateurs de chargement
4. **Responsive Design** : Interface adaptative
5. **Security** : Validation côté client + serveur

## 📞 Monitoring et logs

### Logs structurés

- **Serilog** pour les services .NET
- **Winston** pour Node.js
- **Centralization** : ELK Stack ou Azure Application Insights

### Métriques

- Performance des APIs
- Utilisation des ressources
- Erreurs et exceptions
- Activité utilisateur

---

## 🔍 Troubleshooting

### Problèmes courants

1. **CORS** : Configurer les origines autorisées
2. **JWT expiration** : Implémenter le refresh token
3. **SignalR connection** : Vérifier les WebSockets
4. **Database migration** : Utiliser EF migrations

### Support

- Documentation Swagger pour les APIs
- Logs applicatifs pour le debugging
- Tests unitaires pour la validation

```

Ce README complet couvre l'ensemble de l'architecture microservices avec tous les composants : UserService, EvaluationService et Frontend, facilitant la compréhension et la maintenance pour les futurs développeurs.
```
