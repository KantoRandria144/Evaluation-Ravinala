# Evaluation Ravinala

Une application web moderne pour la gestion des évaluations, développée avec une architecture microservices utilisant .NET Core et React.

## 🏗️ Architecture

Le projet suit une architecture microservices avec :

- **Frontend**: React avec Vite pour une expérience utilisateur rapide et moderne
- **Backend**: Deux microservices .NET Core distincts
  - **UserService**: Gestion de l'authentification et des utilisateurs
  - **EvaluationService**: Gestion des formulaires et évaluations
- **Base de données**: SQL Server Express
- **Communication**: API REST avec authentification JWT

## 🚀 Démarrage rapide

### Prérequis

- Node.js (version 16 ou supérieure)
- .NET 8.0 SDK
- SQL Server Express
- Git

### Installation

1. **Cloner le Projet ou Recuperer le Dossier**
   ```bash
   attente du gitlab

   cd Evaluation-Ravinala
   ```

2. **Configuration de la base de données**
   - Assurez-vous que SQL Server Express est installé et en fonctionnement
   - La base de données `evaluation` sera créée automatiquement lors du premier démarrage

3. **Configuration du backend**

   **UserService** (Port: 5094)
   ```bash
   cd UserService
   # Créer le fichier appsettings.json avec la configuration fournie
   dotnet restore
   dotnet run
   ```

   **EvaluationService** (Port: 5231)
   ```bash
   cd EvaluationService
   # Créer le fichier appsettings.json avec la configuration fournie
   dotnet restore
   dotnet run
   ```

4. **Configuration du frontend**
   ```bash
   cd front-evaluation/vite
   npm install
   # Créer le fichier src/axiosConfig.js avec la configuration fournie
   npm start
   ```

## ⚙️ Configuration

### Configuration réseau

L'application est configurée pour fonctionner sur l'adresse IP `10.0.104.215`. Modifiez les fichiers de configuration suivants si nécessaire :

- `front-evaluation/vite/src/axiosConfig.js` - Configuration des endpoints API
- `UserService/appsettings.json` - Configuration JWT et base de données
- `EvaluationService/appsettings.json` - Configuration services et email

### Fichiers de configuration requis

#### 1. `front-evaluation/vite/src/axiosConfig.js`
```javascript
import axios from 'axios';

// Instance pour l'authentification
const authInstance = axios.create({
  baseURL: 'http://10.0.104.215:5094/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Instance pour la gestion des formulaires
const formulaireInstance = axios.create({
  baseURL: 'http://10.0.104.215:5231/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export { authInstance, formulaireInstance };
```

#### 2. `UserService/appsettings.json`
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=evaluation;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Secret": "c@hristina1234567890@!!c@hristina",
    "Issuer": "http://10.0.104.215:5094",
    "Audience": "http://10.0.104.215:5094"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

#### 3. `EvaluationService/appsettings.json`
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=evaluation;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "UserService": {
    "BaseUrl": "http://10.0.104.215:5094"
  },
  "SendGrid": {
    "ApiKey": "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",
    "FromEmail": "rasu.christina@gmail.com",
    "FromName": "Ravinala Airports"
  }
}
```

## 🌟 Fonctionnalités

- **Authentification sécurisée** avec JWT
- **Gestion des utilisateurs** et des rôles
- **Création et gestion de formulaires** d'évaluation
- **Interface utilisateur moderne** et responsive
- **Notifications par email** via SendGrid
- **Architecture scalable** avec microservices

## 🛠️ Technologies utilisées

### Frontend
- React 18
- Vite
- Axios pour les appels API
- CSS moderne

### Backend
- .NET 8.0
- Entity Framework Core
- JWT Authentication
- SendGrid pour les emails

### Base de données
- SQL Server Express

## 📁 Structure du projet

```
Evaluation-Ravinala/
├── front-evaluation/vite/          # Application React
│   ├── src/
│   │   ├── axiosConfig.js          # Configuration des instances Axios
│   │   └── ...
├── UserService/                     # Microservice d'authentification
│   ├── appsettings.json            # Configuration du service utilisateur
│   └── ...
├── EvaluationService/              # Microservice d'évaluation
│   ├── appsettings.json            # Configuration du service d'évaluation
│   └── ...
└── README.md
```

## 🚦 Ports utilisés

- **Frontend**: Port par défaut de Vite (généralement 5173)
- **UserService**: Port 5094
- **EvaluationService**: Port 5231


## 📝 Notes importantes

- Assurez-vous que les ports 5094 et 5231 sont disponibles avant de démarrer les services
- La clé API SendGrid dans la configuration est à des fins de démonstration uniquement
- Modifiez le secret JWT en production pour des raisons de sécurité
- Vérifiez que SQL Server Express est correctement configuré et accessible

## 📧 Contact

Pour toute question ou support, contactez l'équipe de développement.

---

**Ravinala Airports** - Système d'évaluation moderne et efficace