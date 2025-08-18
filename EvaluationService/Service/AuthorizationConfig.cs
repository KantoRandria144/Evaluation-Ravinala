public static class AuthorizationConfig
{
   public static readonly Dictionary<int, List<int>> FunctionHabilitationAdminMap = new Dictionary<int, List<int>>
   {
       // Gestion des habilitations
         { 1, new List<int> { 1 } }, // Consulter les habilitations *
         { 2, new List<int> { 2 } }, // Ajouter une habilitation *
         { 3, new List<int> { 3 } }, // Modifier une habilitation *
         { 4, new List<int> { 4 } }, // Supprimer une habilitation -
         { 5, new List<int> { 5 } }, // Assigner des habilitations à un utilisateur et aussi supprimer *

      // Gestion des utilisateurs
         { 6, new List<int> { 6 } }, // Consulter la liste des utilisateurs *
         { 7, new List<int> { 7 } }, // Mettre à jour les informations des utilisateurs *
         { 8, new List<int> { 8 } }, // Classifier les utilisateurs *

      // Gestion des formulaires d'évaluation
         { 9, new List<int> { 9 } }, // Consulter les formulaires vierges d'évaluation *
         { 10, new List<int> { 10 } }, // Modifier les formulaires d'évaluation existants *

      // Gestion des périodes d'évaluation
         { 11, new List<int> { 11 } }, // Consulter les périodes d'évaluation *
         { 12, new List<int> { 12 } }, // Créer une nouvelle période d'évaluation *
         { 13, new List<int> { 13 } }, // Modifier une période d'évaluation *

      // Gestion des évaluations
         { 14, new List<int> { 14 } }, // Consulter les subordonnés *

         // Gestion des évaluations - cadre
         { 15, new List<int> { 15 } }, // Remplir ses formulaires d'évaluation pour un cadre *
         { 16, new List<int> { 16 } }, // Remplir les formulaires d'évaluation pour ses subordonnés cadres *
         { 17, new List<int> { 17 } }, // Consulter les formulaires en cours des collaborateurs cadres 
         { 18, new List<int> { 18 } }, // Consulter les formulaires en cours des subordonnés cadres 

         // Gestion des évaluations - non-cadre
         { 19, new List<int> { 19 } }, // Remplir ses formulaires d'évaluation pour un non-cadre *
         { 20, new List<int> { 20 } }, // Remplir les formulaires d'évaluation pour ses subordonnés non-cadres *
         { 21, new List<int> { 21 } }, // Consulter les formulaires en cours des collaborateurs non-cadres 
         { 22, new List<int> { 22 } }, // Consulter les formulaires en cours des subordonnés non-cadres 

      // Gestion des archives
         { 23, new List<int> { 23 } }, // Consulter ses archives personnelles *
         { 24, new List<int> { 24 } }, // Consulter les archives de tous les collaborateurs *
         { 25, new List<int> { 25 } }, // Modifier les fiches archivées de tous les collaborateurs 
         { 26, new List<int> { 26 } }, // Consulter les archives des subordonnés *

      // Import
         { 27, new List<int> { 27 } }, // Importer les évaluations 
       
      //Export
         { 28, new List<int> { 28 } }, // er les évaluations

      //Gestion des notifications
         { 29, new List<int> { 29 } }, // Recevoir une notification au début et à la clôture d'une évaluation.
         { 30, new List<int> { 30 } }, // RRecevoir des notifications de validation pendant l'évaluation..
   };
}