using System.Net;
using System.Net.Mail;
using System.Text.Json;
using CommonModels.DTOs;
using EvaluationService.Data;
using EvaluationService.DTOs;
using EvaluationService.Models;
using EvaluationService.Service;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace EvaluationService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EvaluationController : ControllerBase
    {
        private readonly AppdbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<EvaluationController> _logger;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ISendGridClient _sendGridClient;
        private readonly string _fromEmail;
        private readonly string _fromName;
        private readonly IAuditService _auditService;


        public EvaluationController(AppdbContext context, IHttpClientFactory httpClientFactory, ILogger<EvaluationController> logger, IHubContext<NotificationHub> hubContext, ISendGridClient sendGridClient, IConfiguration configuration, IAuditService auditService)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _hubContext = hubContext;
            _sendGridClient = sendGridClient;
            _auditService = auditService;
            _fromEmail = configuration["SendGrid:FromEmail"];
            _fromName = configuration["SendGrid:FromName"];
        }

        [HttpGet("{evalId}")]
        public async Task<ActionResult<Evaluation>> GetEvaluationById(int evalId)
        {
            var evaluation = await _context.Evaluations.FirstOrDefaultAsync(e => e.EvalId == evalId);
            if (evaluation == null)
            {
                return NotFound(new { Message = "Évaluation non trouvée." });
            }
            
            return Ok(evaluation);
        }

        private async Task<List<UserDto>> GetUsersByTypeAsync(string type)
        {
            var client = _httpClientFactory.CreateClient("UserService");
            var response = await client.GetAsync($"api/User/users-with-type?type={type}");

            if (!response.IsSuccessStatusCode)
            {
                throw new Exception("Erreur lors de la récupération des utilisateurs depuis le service utilisateur.");
            }

            var users = await response.Content.ReadFromJsonAsync<List<UserDto>>();
            return users ?? new List<UserDto>();
        }

        private async Task<UserDTO> GetManagerByUserIdAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID must be provided.");
            }
            var client = _httpClientFactory.CreateClient("UserService");
            var response = await client.GetAsync($"api/User/user/manager?userId={userId}");

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Error fetching manager: {response.ReasonPhrase}");
            }

            var manager = await response.Content.ReadFromJsonAsync<UserDTO>();

            if (manager == null)
            {
                throw new KeyNotFoundException("Manager not found.");
            }

            return manager;
        }

        private async Task<UserDTO> GetUserDetails(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("User ID must be provided.");
            }
            var client = _httpClientFactory.CreateClient("UserService");
            var response = await client.GetAsync($"api/User/user/{userId}");

            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Error fetching manager: {response.ReasonPhrase}");
            }

            var details = await response.Content.ReadFromJsonAsync<UserDTO>();

            if (details == null)
            {
                throw new KeyNotFoundException("Manager not found.");
            }

            return details;
        }

        // [HttpPut("start/{evalId}")]
        // public async Task<IActionResult> StartEvaluation(int evalId)
        // {
        //     // 1. Récupérer l'évaluation par son ID
        //     var evaluation = await _context.Evaluations.FirstOrDefaultAsync(e => e.EvalId == evalId);
        //     if (evaluation == null)
        //     {
        //         return NotFound(new { Success = false, Message = "Évaluation non trouvée." });
        //     }

        //     // 2. Mettre à jour l'état de l'évaluation à "En cours"
        //     evaluation.EtatId = 2;
        //     _context.Evaluations.Update(evaluation);
        //     await _context.SaveChangesAsync(); // Sauvegarde pour que l'état soit bien mis à jour avant la suite

        //     // 3. Récupérer les utilisateurs de type spécifique (par exemple, "Cadre" ou "Non-Cadre")
        //     var users = await GetUsersByTypeAsync(evaluation.Type); // Par exemple "Cadre" ou "Non-Cadre"

        //     // 4. Insérer les utilisateurs dans UserEvaluations s'ils ne sont pas déjà associés
        //     foreach (var user in users)
        //     {
        //         // Vérifier si l'utilisateur est déjà associé à cette évaluation
        //         bool alreadyAssigned = await _context.UserEvaluations.AnyAsync(ue => ue.EvalId == evalId && ue.UserId == user.Id);
        //         if (!alreadyAssigned)
        //         {
        //             var userEvaluation = new UserEvaluation
        //             {
        //                 EvalId = evalId,
        //                 UserId = user.Id
        //             };
        //             _context.UserEvaluations.Add(userEvaluation);
        //         }
        //     }

        //     await _context.SaveChangesAsync();

        //     return Ok(new { Success = true, Message = "Évaluation démarrée avec succès et utilisateurs ajoutés." });
        // }

        [HttpPut("start/{evalId}")]
        public async Task<IActionResult> StartEvaluation(int evalId)
        {
            // 1. Récupérer l'évaluation par son ID
            var evaluation = await _context.Evaluations
                                        .FirstOrDefaultAsync(e => e.EvalId == evalId);
            if (evaluation == null)
            {
                return NotFound(new
                {
                    Success = false,
                    Message = "Évaluation non trouvée."
                });
            }

            // 2. Récupérer le type de l'évaluation (par exemple, "Cadre" ou "NonCadre")
            var typeEvaluation = evaluation.Type; // Assurez-vous que 'Type' est bien la propriété représentant le type
            var evalAnnee = evaluation.EvalAnnee;

            // 3. Vérifier s'il existe déjà une évaluation en cours du même type (EtatId = 2)
            bool evaluationEnCoursMemeType = await _context.Evaluations
                .AnyAsync(e => e.EtatId == 2 && e.Type == typeEvaluation && e.EvalId != evalId);

            if (evaluationEnCoursMemeType)
            {
                return Conflict(new
                {
                    Success = false,
                    Message = $"Une évaluation pour les collaborateurs '{typeEvaluation}' est déjà en cours. Veuillez la clôturer avant d'en démarrer une nouvelle."
                });
            }

            // 4. Mettre à jour l'état de l'évaluation à "En cours" (EtatId = 2)
            evaluation.EtatId = 2;
            _context.Evaluations.Update(evaluation);
            await _context.SaveChangesAsync(); // Sauvegarde pour que l'état soit bien mis à jour avant la suite

            // 5. Récupérer les utilisateurs en fonction du type d’évaluation
            var users = await GetUsersByTypeAsync(typeEvaluation);
            // Ex: "Cadre" ou "Non-Cadre"

            // 6. Associer les utilisateurs à l'évaluation dans la table "UserEvaluations"
            foreach (var user in users)
            {
                bool alreadyAssigned = await _context.UserEvaluations
                                                    .AnyAsync(ue => ue.EvalId == evalId && ue.UserId == user.Id);
                if (!alreadyAssigned)
                {
                    var userEvaluation = new UserEvaluation
                    {
                        EvalId = evalId,
                        UserId = user.Id
                    };
                    _context.UserEvaluations.Add(userEvaluation);
                }

                var notification = new Notification
                {
                    UserId = user.Id,
                    SenderId = "RH", // ou l'ID de l'utilisateur qui déclenche l'action
                    SenderMatricule = "RH", // ou le matricule de l'utilisateur
                    Message = $"L'évaluation des performances pour l'année {evalAnnee} a officiellement commencé",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    EvalId = evalId
                };

                // Ajouter la notification à la base de données
                _context.Notifications.Add(notification);

                // Envoyer la notification en temps réel via SignalR
                NotificationService.Notify(user.Id, notification);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Success = true,
                Message = "Évaluation démarrée avec succès et utilisateurs ajoutés."
            });
        }

        private async Task<int?> GetUserEvalIdAsync(int evalId, string userId)
        {
            var userEvaluation = await _context.UserEvaluations
                .FirstOrDefaultAsync(ue => ue.EvalId == evalId && ue.UserId == userId);

            return userEvaluation?.UserEvalId;
        }

        [HttpGet("enCours/{type}")]
        public async Task<ActionResult<int?>> GetCurrentEvaluationIdByType(string type)
        {
            // Convertir la chaîne en FormType
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Utiliser le formType converti dans la requête
            var evaluation = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluation == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            return Ok(evaluation);
        }

        [HttpGet("userObjectif")]
        public async Task<ActionResult<List<UserObjectiveDto>>> GetUserObjectivesAsync(int evalId, string userId)
        {
            try
            {
                int? userEvalId = await GetUserEvalIdAsync(evalId, userId);

                if (userEvalId == null)
                {
                    return NotFound($"UserEvalId introuvable pour evalId '{evalId}' et userId '{userId}'.");
                }

                // Récupérer toutes les colonnes actives
                var allColumns = await _context.ObjectiveColumns
                    .Where(oc => oc.IsActive)
                    .ToListAsync();

                var objectives = await _context.UserObjectives
                    .Where(uo => uo.UserEvalId == userEvalId)
                    .Include(uo => uo.TemplateStrategicPriority)
                    .Include(uo => uo.ObjectiveColumnValues)
                        .ThenInclude(ocv => ocv.ObjectiveColumn)
                    .ToListAsync();

                // Mapper les UserObjectives vers UserObjectiveDto
                var objectiveDtos = objectives.Select(obj => new UserObjectiveDto
                {
                    ObjectiveId = obj.ObjectiveId,
                    Description = obj.Description,
                    Weighting = obj.Weighting,
                    ResultIndicator = obj.ResultIndicator,
                    CollaboratorResult = obj.CollaboratorResult,
                    ManagerResult = obj.ManagerResult,
                    ManagerComment = obj.ManagerComment,
                    Result = obj.ManagerResult ?? obj.CollaboratorResult ?? 0,
                    TemplateStrategicPriority = new TemplateStrategicPriorityDto
                    {
                        TemplatePriorityId = obj.TemplateStrategicPriority.TemplatePriorityId,
                        Name = obj.TemplateStrategicPriority.Name,
                        MaxObjectives = obj.TemplateStrategicPriority.MaxObjectives,
                    },
                    ObjectiveColumnValues = allColumns.Select(column => new ColumnValueDto
                    {
                        ColumnName = column.Name,
                        Value = obj.ObjectiveColumnValues
                                    .FirstOrDefault(ocv => ocv.ColumnId == column.ColumnId)?.Value
                                    ?? string.Empty
                    }).ToList()
                }).ToList();

                return Ok(objectiveDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur lors de la récupération des objectifs : {ex.Message}");
            }
        }

        [HttpPut("userObjectif")]
        public async Task<IActionResult> UpdateUserObjectivesAsync(int evalId, string userId, [FromBody] List<UserObjectiveDto> updatedObjectives)
        {
            try
            {
                int? userEvalId = await GetUserEvalIdAsync(evalId, userId);

                if (userEvalId == null)
                {
                    return NotFound($"UserEvalId introuvable pour evalId '{evalId}' et userId '{userId}'.");
                }

                // Récupérer toutes les colonnes actives
                var allColumns = await _context.ObjectiveColumns
                    .Where(oc => oc.IsActive)
                    .ToListAsync();

                // Récupérer les UserObjectives existants pour cet UserEvalId
                var existingObjectives = await _context.UserObjectives
                    .Where(uo => uo.UserEvalId == userEvalId)
                    .Include(uo => uo.ObjectiveColumnValues)
                    .ToListAsync();

                foreach (var updatedObjective in updatedObjectives)
                {
                    var existingObjective = existingObjectives.FirstOrDefault(obj => obj.ObjectiveId == updatedObjective.ObjectiveId);

                    if (existingObjective != null)
                    {
                        // Mettre à jour les propriétés de l'objectif existant
                        existingObjective.Description = updatedObjective.Description;
                        existingObjective.Weighting = updatedObjective.Weighting;
                        existingObjective.ResultIndicator = updatedObjective.ResultIndicator;
                        existingObjective.Result = updatedObjective.Result;
                        existingObjective.ManagerComment = updatedObjective.ManagerComment;


                        // Mettre à jour les ObjectiveColumnValues
                        foreach (var column in allColumns)
                        {
                            var updatedColumnValue = updatedObjective.ObjectiveColumnValues
                                .FirstOrDefault(cv => cv.ColumnName == column.Name);

                            var existingColumnValue = existingObjective.ObjectiveColumnValues
                                .FirstOrDefault(ocv => ocv.ColumnId == column.ColumnId);

                            if (updatedColumnValue != null && existingColumnValue != null)
                            {
                                // Mettre à jour la valeur existante
                                existingColumnValue.Value = updatedColumnValue.Value;
                            }
                        }
                    }
                }

                // Sauvegarder les modifications dans la base de données
                await _context.SaveChangesAsync();

                // Enregistrement des notifications
                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{triggeringUser.Name} a mis à jour ses objectifs pour la période de Fixation des objectifs";

                        var notification = new Notification
                        {
                            UserId = manager.Id,
                            SenderId = userId,
                            SenderMatricule = triggeringUser.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(manager.Id, notification);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }

                return NoContent(); // Réponse 204 pour signaler la réussite
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur lors de la mise à jour des objectifs : {ex.Message}");
            }
        }



        [HttpPost("validateUserObjectives")]
        public async Task<IActionResult> ValidateUserObjectives(string userId, string type, List<ObjectiveDto> objectives)
        {
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            var createdUserObjectives = new List<UserObjective>();
            var createdObjectiveColumnValues = new List<ObjectiveColumnValue>();

            foreach (var objective in objectives)
            {
                // Création d'un UserObjective
                var userObjective = new UserObjective
                {
                    UserEvalId = userEvalId.Value,
                    PriorityId = objective.PriorityId,
                    Description = objective.Description,
                    Weighting = objective.Weighting,
                    ResultIndicator = objective.ResultIndicator,
                    Result = objective.Result,
                    CreatedBy = userId,
                    CreatedAt = DateTime.Now
                };

                _context.UserObjectives.Add(userObjective);
                createdUserObjectives.Add(userObjective);

                // Sauvegarder pour obtenir l'ID de UserObjective
                await _context.SaveChangesAsync();

                // Ajout des valeurs dynamiques pour les colonnes existantes
                if (objective.DynamicColumns != null)
                {
                    foreach (var col in objective.DynamicColumns)
                    {
                        // Récupérer l'ID de la colonne existante
                        var existingColumn = await _context.ObjectiveColumns
                            .FirstOrDefaultAsync(c => c.Name == col.ColumnName);

                        if (existingColumn == null)
                        {
                            // Si la colonne n'existe pas, ignorer la valeur
                            Console.WriteLine($"Colonne dynamique inconnue : {col.ColumnName}");
                            continue;
                        }

                        // Ajouter la valeur dans ObjectiveColumnValue
                        var columnValue = new ObjectiveColumnValue
                        {
                            ObjectiveId = userObjective.ObjectiveId,
                            ColumnId = existingColumn.ColumnId,
                            Value = col.Value
                        };

                        _context.ObjectiveColumnValues.Add(columnValue);
                        createdObjectiveColumnValues.Add(columnValue);
                    }
                }
            }

            await _context.SaveChangesAsync();

            // Enregistrement des notifications
            try
            {
                var manager = await GetManagerByUserIdAsync(userId);
                var triggeringUser = await GetUserDetails(userId);

                if (manager != null && !string.IsNullOrEmpty(manager.Id))
                {
                    var message = $"{triggeringUser.Name} a validé ses objectifs pour la période de Fixation des objectifs";

                    var notification = new Notification
                    {
                        UserId = manager.Id,
                        SenderId = userId,
                        SenderMatricule = triggeringUser.Matricule,
                        Message = message,
                        IsRead = false,
                        CreatedAt = DateTime.Now
                    };

                    _context.Notifications.Add(notification);
                    await _context.SaveChangesAsync();

                    NotificationService.Notify(manager.Id, notification);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
            }

            return Ok(new
            {
                Message = "Objectifs validés et enregistrés.",
                UserObjectives = createdUserObjectives,
                ObjectiveColumnValues = createdObjectiveColumnValues
            });
        }


        [HttpPost("validateUserObjectivesHistory")]
        public async Task<IActionResult> ValidateUserObjectivesHistory(
            string validatorUserId,
            string userId,
            string type,
            [FromBody] List<ModifiedUserObjectiveDto> modifiedObjectives)
        {
            if (string.IsNullOrEmpty(validatorUserId))
            {
                return BadRequest(new { Message = "L'identifiant du validateur est requis." });
            }

            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { Message = "L'identifiant de l'utilisateur est requis." });
            }

            if (string.IsNullOrEmpty(type))
            {
                return BadRequest(new { Message = "Le type d'évaluation est requis." });
            }

            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            var userObjectives = await _context.UserObjectives
                .Include(uo => uo.ObjectiveColumnValues)
                .ThenInclude(ocv => ocv.ObjectiveColumn)
                .Include(uo => uo.TemplateStrategicPriority)
                .Where(uo => uo.UserEvalId == userEvalId.Value)
                .ToListAsync();


            if (userObjectives.Count == 0)
            {
                return NotFound(new { Message = $"Aucun UserObjective trouvé pour UserEvalId {userEvalId.Value}." });
            }

            var historyEntries = new List<HistoryCFo>();
            var historyColumnEntries = new List<HistoryObjectiveColumnValuesFo>();

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var userObjective in userObjectives)
                {
                    // Appliquer les modifications si elles existent
                    var modifiedObjective = modifiedObjectives?.FirstOrDefault(mo => mo.ObjectiveId == userObjective.ObjectiveId);
                    if (modifiedObjective != null)
                    {
                        // Mettre à jour les propriétés principales
                        userObjective.Description = modifiedObjective.Description ?? userObjective.Description;
                        userObjective.Weighting = modifiedObjective.Weighting ?? userObjective.Weighting;
                        userObjective.ResultIndicator = modifiedObjective.ResultIndicator ?? userObjective.ResultIndicator;
                        userObjective.Result = 0;
                        if (!string.IsNullOrWhiteSpace(modifiedObjective.ManagerComment))
                        {
                            userObjective.ManagerComment = modifiedObjective.ManagerComment;
                        }

                        // Mettre à jour les colonnes associées
                        foreach (var modifiedColumn in modifiedObjective.ObjectiveColumnValues)
                        {
                            var columnToUpdate = userObjective.ObjectiveColumnValues
                                .FirstOrDefault(c => c.ObjectiveColumn != null && c.ObjectiveColumn.Name == modifiedColumn.ColumnName);

                            if (columnToUpdate != null)
                            {
                                columnToUpdate.Value = modifiedColumn.Value; // Appliquer la valeur modifiée
                                _context.ObjectiveColumnValues.Update(columnToUpdate); // Marquer comme modifié
                            }
                        }


                        _context.UserObjectives.Update(userObjective);
                    }

                    // Crée une entrée d'historique pour l'objectif
                    var history = new HistoryCFo
                    {
                        UserEvalId = userObjective.UserEvalId,
                        PriorityName = userObjective.TemplateStrategicPriority.Name,
                        Description = userObjective.Description,
                        Weighting = userObjective.Weighting,
                        ResultIndicator = userObjective.ResultIndicator,
                        CreatedAt = DateTime.Now,
                        ValidatedBy = validatorUserId
                    };
                    _context.HistoryCFos.Add(history);
                    await _context.SaveChangesAsync();

                    historyEntries.Add(history);

                    foreach (var columnValue in userObjective.ObjectiveColumnValues)
                    {
                        var historyColumnValue = new HistoryObjectiveColumnValuesFo
                        {
                            HcfId = history.HcfId,
                            ColumnName = columnValue.ObjectiveColumn?.Name ?? "Nom de colonne inconnu",
                            Value = columnValue.Value,
                            ValidatedBy = validatorUserId,
                            CreatedAt = DateTime.Now
                        };
                        _context.HistoryObjectiveColumnValuesFos.Add(historyColumnValue);
                        historyColumnEntries.Add(historyColumnValue);
                    }
                }


                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId); // Utilisation de la méthode existante

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{manager.Name} a validé vos objectifs pour la période de Fixation des objectifs";

                        // Enregistrer la notification dans la base de données
                        var notification = new Notification
                        {
                            UserId = userId,
                            SenderId = manager.Id,
                            SenderMatricule = manager.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(userId, notification);

                        Console.WriteLine($"Notification envoyée et stockée pour le manager : {manager.Name}.");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }

                return Ok(new
                {
                    Message = "Validation effectuée et historique enregistré.",
                    HistoryCFos = historyEntries.Select(h => new
                    {
                        h.HcfId,
                        h.UserEvalId,
                        h.PriorityName,
                        h.Description,
                        h.Weighting,
                        h.ResultIndicator,
                        h.ValidatedBy,
                        h.CreatedAt
                    }).ToList(),
                    HistoryObjectiveColumnValuesFos = historyColumnEntries.Select(c => new
                    {
                        c.HcfId,
                        c.ColumnName,
                        c.Value,
                        c.CreatedAt
                    }).ToList()
                });
            }


            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Message = "Erreur lors de la validation des objectifs.", Details = ex.Message });
            }
        }

        [HttpGet("getUserObjectivesHistory")]
        public async Task<IActionResult> GetUserObjectivesHistory(string userId, string type)
        {
            // Validation des paramètres
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { Message = "L'identifiant de l'utilisateur est requis." });
            }

            if (string.IsNullOrEmpty(type))
            {
                return BadRequest(new { Message = "Le type d'évaluation est requis." });
            }

            // Conversion du type d'évaluation
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupération de l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupération de l'ID de l'évaluation utilisateur
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            // Récupération des entrées de l'historique
            var historyEntries = await _context.HistoryCFos
                .Where(h => h.UserEvalId == userEvalId.Value)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();

            // Vérification des résultats
            if (historyEntries.Count == 0)
            {
                return NotFound(new { Message = $"Aucun historique trouvé pour l'utilisateur {userId} et le type {type}." });
            }

            // Retour des données
            return Ok(new
            {
                Message = "Historique récupéré avec succès.",
                HistoryCFos = historyEntries.Select(h => new
                {
                    h.HcfId,
                    h.UserEvalId,
                    h.PriorityName,
                    h.Description,
                    h.Weighting,
                    h.ValidatedBy,
                    h.CreatedAt
                }).ToList()
            });
        }


        [HttpPost("validateMitermObjectif")]
        public async Task<IActionResult> ValidateMitermObjectif(
            string validatorUserId,
            string userId,
            string type,
            [FromBody] List<ModifiedUserObjectiveDto> objectives)
        {
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            try
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                foreach (var modifiedObjective in objectives)
                {
                    // Fetch the UserObjective by PriorityId
                    var userObjective = await _context.UserObjectives
                        .Include(uo => uo.ObjectiveColumnValues)
                        .ThenInclude(ocv => ocv.ObjectiveColumn)
                        .FirstOrDefaultAsync(uo => uo.UserEvalId == userEvalId.Value && uo.ObjectiveId == modifiedObjective.ObjectiveId);


                    if (userObjective == null)
                    {
                        return BadRequest(new { Message = $"L'objectif avec la priorité ID {modifiedObjective.ObjectiveId} n'existe pas pour cet utilisateur." });
                    }

                    // Update UserObjective fields
                    userObjective.Description = modifiedObjective.Description ?? userObjective.Description;
                    userObjective.Weighting = modifiedObjective.Weighting ?? userObjective.Weighting;
                    userObjective.ResultIndicator = modifiedObjective.ResultIndicator;
                    // manager validation => écrit dans ManagerResult + Result officiel
                    userObjective.ManagerResult = modifiedObjective.Result;
                    userObjective.Result = modifiedObjective.Result;
                    userObjective.ManagerComment = modifiedObjective.ManagerComment;


                    _context.UserObjectives.Update(userObjective);

                    // Update or insert ObjectiveColumnValues
                    foreach (var modifiedColumn in modifiedObjective.ObjectiveColumnValues ?? new List<ColumnValueDto>())
                    {
                        var columnToUpdate = userObjective.ObjectiveColumnValues
                            .FirstOrDefault(c => c.ObjectiveColumn != null && c.ObjectiveColumn.Name == modifiedColumn.ColumnName);


                        if (columnToUpdate != null)
                        {
                            // Update the existing column value
                            columnToUpdate.Value = modifiedColumn.Value;
                            _context.ObjectiveColumnValues.Update(columnToUpdate);
                        }
                        else
                        {
                            // Check if the column exists in the database
                            var column = await _context.ObjectiveColumns
                                .FirstOrDefaultAsync(c => c.Name == modifiedColumn.ColumnName);

                            if (column == null)
                            {
                                // Throw an error if the column doesn't exist
                                throw new InvalidOperationException($"The column '{modifiedColumn.ColumnName}' does not exist in the database.");
                            }

                            // If the column exists but is not linked to the current UserObjective, return an error
                            return BadRequest(new { Message = $"The column '{modifiedColumn.ColumnName}' is not linked to the current UserObjective." });
                        }
                    }

                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId); // Utilisation de la méthode existante

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{manager.Name} a validé vos résultats pour la période d'évaluation Mi-parcours";

                        // Enregistrer la notification dans la base de données
                        var notification = new Notification
                        {
                            UserId = userId,
                            SenderId = manager.Id,
                            SenderMatricule = manager.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(userId, notification);

                        Console.WriteLine($"Notification envoyée et stockée pour le manager : {manager.Name}.");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }

                return Ok(new { Message = "Objectifs mis à jour avec succès" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during transaction: {ex.Message}");
                return StatusCode(500, "Erreur lors de la mise à jour des objectifs et colonnes dynamiques.");
            }
        }


        // [HttpPost("validateMitermObjectifHistory")]
        // public async Task<IActionResult> ValidateMitermObjectifHistory(
        // string userId,
        // string type,
        // List<ObjectiveDto> objectives)
        // {
        //     if (!Enum.TryParse<FormType>(type, true, out var formType))
        //     {
        //         return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
        //     }

        //     var evaluationId = await _context.Evaluations
        //         .Where(e => e.EtatId == 2 && e.FormTemplate.Type == formType)
        //         .Select(e => e.EvalId)
        //         .FirstOrDefaultAsync();

        //     if (evaluationId == 0)
        //     {
        //         return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
        //     }

        //     var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
        //     if (userEvalId == null)
        //     {
        //         return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
        //     }

        //     try
        //     {
        //         using var transaction = await _context.Database.BeginTransactionAsync();

        //         foreach (var objective in objectives)
        //         {
        //             // Insérer dans HistoryCMp
        //             var historyMp = new HistoryCMp
        //             {
        //                 UserEvalId = userEvalId.Value,
        //                 PriorityName = objective.PriorityName,
        //                 Description = objective.Description,
        //                 Weighting = objective.Weighting,
        //                 ResultIndicator = objective.ResultIndicator,
        //                 Result = objective.Result,
        //                 UpdatedAt = DateTime.Now,
        //                 ValidatedBy = userId
        //             };
        //             _context.HistoryCMps.Add(historyMp);
        //             await _context.SaveChangesAsync();

        //             var hcmId = historyMp.HcmId;

        //             // Insérer dans HistoryObjectiveColumnValuesMp
        //             foreach (var columnValue in objective.DynamicColumns)
        //             {
        //                 var historyColumnValue = new HistoryObjectiveColumnValuesMp
        //                 {
        //                     HcmId = hcmId,
        //                     ColumnName = columnValue.ColumnName,
        //                     Value = columnValue.Value,
        //                     CreatedAt = DateTime.Now,
        //                     ValidatedBy = userId
        //                 };
        //                 _context.HistoryObjectiveColumnValuesMps.Add(historyColumnValue);
        //             }
        //         }

        //         await _context.SaveChangesAsync();
        //         await transaction.CommitAsync();

        //         try
        //         {
        //             var manager = await GetManagerByUserIdAsync(userId);
        //             var triggeringUser = await GetUserDetails(userId); // Utilisation de la méthode existante

        //             if (manager != null && !string.IsNullOrEmpty(manager.Id))
        //             {
        //                 var message = $"{triggeringUser.Name} a validé ses résultats pour la période d'évaluation Mi-parcours";

        //                 // Enregistrer la notification dans la base de données
        //                 var notification = new Notification
        //                 {
        //                     UserId = manager.Id,
        //                     SenderId = userId,
        //                     SenderMatricule = triggeringUser.Matricule,
        //                     Message = message,
        //                     IsRead = false,
        //                     CreatedAt = DateTime.Now
        //                 };

        //                 _context.Notifications.Add(notification);
        //                 await _context.SaveChangesAsync();

        //                 NotificationService.Notify(manager.Id, notification);

        //                 Console.WriteLine($"Notification envoyée et stockée pour le manager : {manager.Name}.");
        //             }
        //         }
        //         catch (Exception ex)
        //         {
        //             Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
        //         }

        //         return Ok(new { Message = "Validation effectuée et historique ajouté avec succès." });
        //     }
        //     catch (Exception ex)
        //     {
        //         Console.WriteLine("Error during transaction: " + ex.Message);
        //         return StatusCode(500, "Erreur lors de la validation et de l'insertion dans HistoryCMp.");
        //     }
        // }

        [HttpPost("validateMitermObjectifHistory")]
        public async Task<IActionResult> ValidateMitermObjectifHistory(
            string userId,
            string type,
            [FromBody] List<ObjectiveDto> objectives)
        {
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide." });
            }

            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = "Aucune évaluation en cours." });
            }

            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 🔥 1. RÉCUPÉRER LES OBJECTIFS ACTUELS
                var userObjectives = await _context.UserObjectives
                    .Where(uo => uo.UserEvalId == userEvalId.Value)
                    .ToListAsync();

                foreach (var objective in objectives)
                {
                    var userObjective = userObjectives
                        .FirstOrDefault(uo => uo.ObjectiveId == objective.ObjectiveId);

                    if (userObjective == null)
                        continue;

                    // ✅ 2. SAUVEGARDE RÉSULTAT MANAGER (SOURCE DE VÉRITÉ)
                    userObjective.ManagerResult = objective.Result;
                    userObjective.Result = objective.Result;

                    // ✅ 3. SAUVEGARDE COMMENTAIRE MANAGER (MODIFIABLE)
                    userObjective.ManagerComment = objective.ManagerComment;

                    _context.UserObjectives.Update(userObjective);

                    // ✅ 4. HISTORIQUE (TRACE UNIQUEMENT)
                    var historyMp = new HistoryCMp
                    {
                        UserEvalId = userEvalId.Value,
                        PriorityName = objective.PriorityName,
                        Description = objective.Description,
                        Weighting = objective.Weighting,
                        ResultIndicator = objective.ResultIndicator,
                        Result = objective.Result,
                        UpdatedAt = DateTime.Now,
                        ValidatedBy = userId
                    };

                    _context.HistoryCMps.Add(historyMp);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Validation mi-parcours effectuée avec succès." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Message = "Erreur lors de la validation mi-parcours.", Details = ex.Message });
            }
        }


        [HttpGet("getHistoryMidtermeByUser")]
        public async Task<IActionResult> GetHistoryCMps(string userId, string type)
        {
            // Vérification des paramètres
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { Message = "L'identifiant de l'utilisateur est requis." });
            }

            if (string.IsNullOrEmpty(type))
            {
                return BadRequest(new { Message = "Le type d'évaluation est requis." });
            }

            // Conversion du type d'évaluation
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupération de l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupération de l'ID de l'évaluation utilisateur
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            // Récupération des données de l'historique
            var history = await _context.HistoryCMps
                .Where(h => h.UserEvalId == userEvalId)
                .ToListAsync();

            if (history == null || !history.Any())
            {
                return NotFound(new { Message = "Aucun historique trouvé pour cet utilisateur." });
            }

            return Ok(history);
        }

        [HttpPost("validateFinale")]
public async Task<IActionResult> ValidateFinale(
    [FromBody] ValidateFinaleRequest request)
{
    // =========================
    // 1. VALIDATIONS DE BASE
    // =========================
    if (request == null)
    {
        return BadRequest(new { Message = "Requête invalide (body null)." });
    }

    if (string.IsNullOrWhiteSpace(request.UserId))
    {
        return BadRequest(new { Message = "UserId manquant." });
    }

    if (string.IsNullOrWhiteSpace(request.Type))
    {
        return BadRequest(new { Message = "Type d'évaluation manquant." });
    }

    if (request.Objectives == null || !request.Objectives.Any())
    {
        return BadRequest(new { Message = "Aucun objectif reçu pour la validation finale." });
    }

    // =========================
    // 2. VALIDATION DU TYPE
    // =========================
    if (!Enum.TryParse<FormType>(request.Type, true, out var formType))
    {
        return BadRequest(new { Message = $"Type d'évaluation invalide : {request.Type}" });
    }

    // =========================
    // 3. RÉCUPÉRER L'ÉVALUATION EN COURS
    // =========================
    var evaluationId = await _context.Evaluations
        .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
        .Select(e => e.EvalId)
        .FirstOrDefaultAsync();

    if (evaluationId == 0)
    {
        return NotFound(new { Message = "Aucune évaluation en cours pour ce type." });
    }

    // =========================
    // 4. RÉCUPÉRER USER EVAL
    // =========================
    var userEvalId = await GetUserEvalIdAsync(evaluationId, request.UserId);
    if (userEvalId == null)
    {
        return NotFound(new { Message = "UserEval introuvable pour cet utilisateur." });
    }

    // =========================
    // 5. TRANSACTION
    // =========================
    using var transaction = await _context.Database.BeginTransactionAsync();

    try
    {
        // Récupérer tous les objectifs existants
        var userObjectives = await _context.UserObjectives
            .Where(o => o.UserEvalId == userEvalId.Value)
            .ToListAsync();

        // =========================
        // 6. MISE À JOUR DES OBJECTIFS
        // =========================
        foreach (var dto in request.Objectives)
        {
            var objective = userObjectives
                .FirstOrDefault(o => o.ObjectiveId == dto.ObjectiveId);

           if (objective == null)
            {
                return BadRequest(new
                {
                    Message = $"Objectif introuvable : {dto.ObjectiveId}"
                });
            }


            //SÉCURITÉ ABSOLUE
            if (dto.Result == null)
            {
                return BadRequest(new
                {
                    Message = $"Résultat manager manquant pour l'objectif {dto.ObjectiveId}"
                });
            }


            //SOURCE DE VÉRITÉ
            objective.ManagerResult = dto.Result.Value;
            objective.Result = dto.Result.Value;

            // Commentaire manager (modifiable)
            if (!string.IsNullOrWhiteSpace(dto.ManagerComment))
            {
                objective.ManagerComment = dto.ManagerComment;
            }

            _context.UserObjectives.Update(objective);
        }

        // =========================
        // 7. SAVE & COMMIT
        // =========================
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            Message = "Validation finale réussie"
        });
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();

        //LOG SERVEUR CLAIR
        _logger.LogError(ex, "Erreur lors de la validation finale");

        return StatusCode(500, new
        {
            Message = "Erreur interne lors de la validation finale",
            Details = ex.Message
        });
    }
}


        [HttpPost("validateFinaleHistory")]
        public async Task<IActionResult> ValidateFinaleHistory(
            [FromBody] ValidateFinaleHistoryRequest request)
        {
            if (request == null || request.Objectives == null || !request.Objectives.Any())
            {
                return BadRequest(new { Message = "Données invalides pour la validation finale (history)." });
            }

            if (!Enum.TryParse<FormType>(request.Type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide." });
            }

            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null &&  e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {request.Type}." });
            }

            var userEvalId = await GetUserEvalIdAsync(evaluationId, request.UserId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                foreach (var objective in request.Objectives)
                {
                    var historyEntry = new HistoryCFi
                    {
                        UserEvalId = userEvalId.Value,
                        PriorityName = objective.PriorityName,
                        Description = objective.Description,
                        Weighting = objective.Weighting,
                        ResultIndicator = objective.ResultIndicator,
                        Result = objective.Result,
                        ValidatedBy = request.UserId,
                        UpdatedAt = DateTime.Now
                    };

                    _context.HistoryCFis.Add(historyEntry);
                    await _context.SaveChangesAsync();

                    foreach (var column in objective.DynamicColumns ?? new List<ColumnValueDto>())
                    {
                        _context.HistoryObjectiveColumnValuesFis.Add(
                            new HistoryObjectiveColumnValuesFi
                            {
                                HcfiId = historyEntry.HcfiId,
                                ColumnName = column.ColumnName,
                                Value = column.Value,
                                CreatedAt = DateTime.Now,
                                ValidatedBy = request.UserId
                            }
                        );
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Validation finale historique effectuée avec succès." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Message = "Erreur validation finale history", Details = ex.Message });
            }
        }


        [HttpGet("getHistoryFinale")]
        public async Task<IActionResult> GetHistoryCFi(string userId, string type)
        {
            // Vérification des paramètres
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { Message = "L'identifiant de l'utilisateur est requis." });
            }

            if (string.IsNullOrEmpty(type))
            {
                return BadRequest(new { Message = "Le type d'évaluation est requis." });
            }

            // Conversion du type d'évaluation
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupération de l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupération de l'ID de l'évaluation utilisateur
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            // Récupération des données de l'historique
            var history = await _context.HistoryCFis
                .Where(h => h.UserEvalId == userEvalId)
                .ToListAsync();

            if (history == null || !history.Any())
            {
                return NotFound(new { Message = "Aucun historique trouvé pour cet utilisateur." });
            }

            return Ok(history);
        }

        //-----------------------------NonCadre---------------------------------------------------------------------------------------------------



        [HttpGet("IndicatorValidateByUser")]
        public async Task<IActionResult> GetUserIndicatorsAsync(string userId, string type)
        {
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupération de l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupération de l'ID de l'évaluation utilisateur
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            // Récupération des indicateurs et de leurs résultats
            var userIndicators = await _context.UserIndicators
                .Where(ui => ui.UserEvalId == userEvalId)
                .Select(ui => new
                {
                    UserIndicatorId = ui.UserIndicatorId,
                    UserEvalId = ui.UserEvalId,
                    Name = ui.Name,
                    IndicatorId = ui.Indicator.IndicatorId,
                    IndicatorLabel = ui.Indicator.label,
                    MaxResults = ui.Indicator.MaxResults,
                    TemplateId = ui.Indicator.TemplateId,
                    Results = ui.UserIndicatorResults.Select(uir => new
                    {
                        ResultId = uir.ResultId,
                        ResultText = uir.ResultText,
                        Result = uir.Result
                    }).ToList()
                })
                .ToListAsync();

            if (userIndicators == null || !userIndicators.Any())
            {
                return NotFound(new { Message = "Aucun indicateur trouvé pour l'utilisateur spécifié." });
            }

            // Retourne les résultats
            return Ok(userIndicators);
        }

        [HttpPut("UpdateIndicator")]
        public async Task<IActionResult> UpdateUserIndicatorsAsync(string userId, string type, [FromBody] List<UserIndicatorDto> updatedIndicators)
        {
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupération de l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupération de l'ID de l'évaluation utilisateur
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            // Récupération des indicateurs utilisateur existants à mettre à jour
            var existingIndicators = await _context.UserIndicators
                .Where(ui => ui.UserEvalId == userEvalId && updatedIndicators.Select(u => u.UserIndicatorId).Contains(ui.UserIndicatorId))
                .Include(ui => ui.UserIndicatorResults)
                .ToListAsync();

            if (existingIndicators == null || !existingIndicators.Any())
            {
                return NotFound(new { Message = "Aucun indicateur trouvé pour l'utilisateur spécifié." });
            }

            // Parcours des indicateurs mis à jour
            foreach (var updatedIndicator in updatedIndicators)
            {
                var existingIndicator = existingIndicators.FirstOrDefault(ui => ui.UserIndicatorId == updatedIndicator.UserIndicatorId);
                if (existingIndicator != null)
                {
                    // Mise à jour des propriétés de l'indicateur
                    existingIndicator.Name = updatedIndicator.Name;
                    // Ajoutez d'autres propriétés de UserIndicator à mettre à jour si nécessaire

                    // Parcours des résultats de l'indicateur
                    foreach (var updatedResult in updatedIndicator.UserIndicatorResults)
                    {
                        var existingResult = existingIndicator.UserIndicatorResults
                            .FirstOrDefault(uir => uir.ResultId == updatedResult.ResultId);

                        if (existingResult != null)
                        {
                            // Mise à jour des propriétés du résultat
                            existingResult.ResultText = updatedResult.ResultText;
                            existingResult.Result = updatedResult.Result;
                        }
                        else
                        {
                            // Si le résultat n'existe pas, l'ajouter
                            existingIndicator.UserIndicatorResults.Add(new UserIndicatorResult
                            {
                                ResultText = updatedResult.ResultText,
                                Result = updatedResult.Result
                            });
                        }
                    }
                }
            }

            // Sauvegarde des modifications dans la base de données
            try
            {
                await _context.SaveChangesAsync();

                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{triggeringUser.Name} a mis a jour ses objectifs pour la période de Fixation des objectifs";

                        var notification = new Notification
                        {
                            UserId = manager.Id,
                            SenderId = userId,
                            SenderMatricule = triggeringUser.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(manager.Id, notification);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }
            }
            catch (DbUpdateException ex)
            {
                // Gérer les erreurs de mise à jour
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = "Erreur lors de la mise à jour des indicateurs utilisateur.", Details = ex.Message });
            }

            return Ok(new { Message = "Indicateurs utilisateur mis à jour avec succès." });
        }


        [HttpPost("ValidateIndicator")]
        public async Task<IActionResult> InsertIndicatorObjectif(
            string userId,
            string type,
            [FromBody] List<IndicatorDto> indicators)
        {
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupère l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupère l'ID de l'évaluation utilisateur pour l'utilisateur spécifié
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            try
            {
                foreach (var indicator in indicators)
                {
                    // Insérer dans UserIndicator
                    var userIndicator = new UserIndicator
                    {
                        UserEvalId = userEvalId.Value,
                        IndicatorId = indicator.IndicatorId,
                        Name = indicator.IndicatorName
                    };
                    _context.UserIndicators.Add(userIndicator);
                    await _context.SaveChangesAsync(); // Sauvegarde pour générer l'ID

                    // Insérer les résultats associés dans UserIndicatorResult
                    if (indicator.Results != null)
                    {
                        foreach (var result in indicator.Results)
                        {
                            var userIndicatorResult = new UserIndicatorResult
                            {
                                UserIndicatorId = userIndicator.UserIndicatorId,
                                ResultText = result.ResultText,
                                Result = result.Result,
                            };
                            _context.UserIndicatorResults.Add(userIndicatorResult);
                        }
                    }
                }

                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{triggeringUser.Name} a validé ses objectifs pour la période de Fixation des objectifs";

                        var notification = new Notification
                        {
                            UserId = manager.Id,
                            SenderId = userId,
                            SenderMatricule = triggeringUser.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(manager.Id, notification);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }

                await _context.SaveChangesAsync();
                return Ok(new { Message = "Validation réussie" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = $"An error occurred: {ex.Message}" });
            }
        }

        [HttpPost("ValidateIndicatorHistory")]
        public async Task<IActionResult> InsertIndicatorObjectifHistory(
            string userId,
            string validateUserId,
            string type,
            [FromBody] List<IndicatorDto> indicators)
        {
            // 1. Valider le type d'évaluation
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // 2. Récupérer l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // 3. Récupérer l'ID de l'évaluation utilisateur pour l'utilisateur spécifié
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            try
            {
                // 4. Récupérer tous les UserIndicators pour cet utilisateur et cette évaluation
                var existingIndicators = await _context.UserIndicators
                    .Where(ui => ui.UserEvalId == userEvalId.Value)
                    .ToListAsync();

                if (!existingIndicators.Any())
                {
                    return NotFound(new { Message = "Aucun UserIndicator trouvé pour cet utilisateur et cette évaluation." });
                }

                // Liste pour stocker les nouvelles entrées d'historique
                var historyEntries = new List<HistoryUserIndicatorFO>();

                // 5. Parcourir les indicateurs reçus pour mise à jour
                foreach (var indicatorDto in indicators)
                {
                    // Trouver l'indicateur existant correspondant
                    var existingIndicator = existingIndicators
                        .FirstOrDefault(ei => ei.IndicatorId == indicatorDto.IndicatorId);

                    if (existingIndicator == null)
                    {
                        // Indicateur non trouvé, passer au suivant
                        continue;
                    }

                    // Mettre à jour le nom de l'indicateur si nécessaire
                    if (existingIndicator.Name != indicatorDto.IndicatorName)
                    {
                        existingIndicator.Name = indicatorDto.IndicatorName;
                        _context.UserIndicators.Update(existingIndicator);
                    }

                    // Récupérer les UserIndicatorResults existants pour cet indicateur, ordonnés par ID
                    var existingResults = await _context.UserIndicatorResults
                        .Where(uir => uir.UserIndicatorId == existingIndicator.UserIndicatorId)
                        .OrderBy(uir => uir.ResultId)
                        .ToListAsync();

                    // Vérifier que le nombre de résultats reçus correspond au nombre existant
                    if (indicatorDto.Results.Count != existingResults.Count)
                    {
                        return BadRequest(new { Message = $"Le nombre de résultats pour l'indicateur ID {indicatorDto.IndicatorId} ne correspond pas au nombre de résultats existants." });
                    }

                    // Mettre à jour chaque résultat
                    for (int i = 0; i < indicatorDto.Results.Count; i++)
                    {
                        var updatedResult = indicatorDto.Results[i];
                        var existingResult = existingResults[i];

                        // Mettre à jour les propriétés du résultat existant
                        existingResult.ResultText = updatedResult.ResultText;
                        existingResult.Result = updatedResult.Result;
                        _context.UserIndicatorResults.Update(existingResult);

                        // Créer une entrée dans l'historique
                        var historyEntry = new HistoryUserIndicatorFO
                        {
                            UserEvalId = userEvalId.Value,
                            Name = existingIndicator.Name,
                            ResultText = updatedResult.ResultText ?? string.Empty, // Assurer que ResultText n'est pas null
                            Result = updatedResult.Result,
                            ValidatedBy = validateUserId,
                            CreatedAt = DateTime.UtcNow
                        };

                        historyEntries.Add(historyEntry);
                    }
                }

                // 6. Ajouter toutes les entrées d'historique
                if (historyEntries.Any())
                {
                    _context.HistoryUserIndicatorFOs.AddRange(historyEntries);
                }

                await _context.SaveChangesAsync();

                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{manager.Name} a validé vos objectifs pour la période de Fixation des objectifs";

                        var notification = new Notification
                        {
                            UserId = userId,
                            SenderId = manager.Id,
                            SenderMatricule = manager.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(userId, notification);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }

                return Ok(new { Message = "Validation réussie" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = $"Une erreur est survenue : {ex.Message}" });
            }
        }


        [HttpGet("GetHistoryUserIndicatorFo")]
        public async Task<IActionResult> GetHistoryUserIndicatorFo(string userId, string type)
        {
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupérer l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupérer l'ID de l'évaluation utilisateur pour l'utilisateur spécifié
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            try
            {
                // Récupérer les enregistrements de la table HistoryUserIndicatorFo pour le userEvalId
                var historyRecords = await _context.HistoryUserIndicatorFOs
                    .Where(history => history.UserEvalId == userEvalId.Value)
                    .Select(history => new
                    {
                        history.HistoryUserIndicatorFOId,
                        history.UserEvalId,
                        history.Name,
                        history.ResultText,
                        history.Result,
                        history.ValidatedBy,
                        history.CreatedAt
                    })
                    .ToListAsync();

                if (!historyRecords.Any())
                {
                    return NotFound(new { Message = $"Aucun enregistrement trouvé pour cet utilisateur et cette évaluation. {userEvalId.Value}" });
                }

                // Retourner les données récupérées
                return Ok(historyRecords);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = $"Une erreur est survenue : {ex.Message}" });
            }
        }



        [HttpGet("{evalId}/competences/{userId}")]
        public async Task<IActionResult> GetUserCompetencesAsync(int evalId, string userId)
        {
            int? userEvalId = await GetUserEvalIdAsync(evalId, userId);

            if (userEvalId == null)
            {
                return NotFound($"UserEvalId introuvable pour evalId '{evalId}' et userId '{userId}'.");
            }

            var competences = await _context.UserCompetences
                .Where(c => c.UserEvalId == userEvalId)
                .Join(
                    _context.Competences, // Jointure avec la table Competences
                    userCompetence => userCompetence.CompetenceId,
                    competence => competence.CompetenceId,
                    (userCompetence, competence) => new UserCompetenceDto
                    {
                        UserCompetenceId = userCompetence.UserCompetenceId,
                        UserEvalId = userCompetence.UserEvalId,
                        CompetenceId = userCompetence.CompetenceId,
                        Performance = userCompetence.Performance,
                        CompetenceName = competence.Name // Ajout du nom de la compétence
                    }
                )
                .ToListAsync();

            if (competences == null || competences.Count == 0)
            {
                return NotFound($"Aucune compétence trouvée pour userEvalId '{userEvalId}'.");
            }

            return Ok(competences);
        }

        [HttpGet("{evalId}/indicators/{userId}")]
        public async Task<IActionResult> GetUserIndicatorsAsync(int evalId, string userId)
        {
            // Récupère l'ID de l'évaluation utilisateur pour l'utilisateur spécifié
            int? userEvalId = await GetUserEvalIdAsync(evalId, userId);

            if (userEvalId == null)
            {
                return NotFound(new { Message = $"UserEvalId introuvable pour evalId '{evalId}' et userId '{userId}'." });
            }

            // Récupère les indicateurs avec leurs résultats associés
            var indicators = await _context.UserIndicators
                .Include(i => i.UserIndicatorResults) // Inclut les résultats associés
                .Where(i => i.UserEvalId == userEvalId)
                .Select(i => new IndicatorDto
                {
                    IndicatorId = i.IndicatorId,
                    IndicatorName = i.Name,
                    Results = i.UserIndicatorResults.Select(r => new ResultDto
                    {
                        ResultText = r.ResultText,
                        Result = r.Result
                    }).ToList()
                })
                .ToListAsync();

            if (indicators == null || indicators.Count == 0)
            {
                return NotFound(new { Message = $"Aucun indicateur trouvé pour userEvalId '{userEvalId}'." });
            }

            return Ok(indicators);
        }

        [HttpPost("ValidateResultManager")]
        public async Task<IActionResult> ValidateResultManager(string userId, string type, [FromBody] MiParcoursDataDto miParcoursData)
        {
            // Validation du type d'évaluation
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupère l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            // Vérifie si une évaluation en cours a été trouvée
            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupère l'ID de l'évaluation utilisateur pour l'utilisateur spécifié
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            try
            {
                // Insertion dans UserCompetence
                foreach (var competence in miParcoursData.Competences)
                {
                    var userCompetence = new UserCompetence
                    {
                        UserEvalId = userEvalId.Value,
                        CompetenceId = competence.CompetenceId,
                        Performance = competence.Performance
                    };
                    _context.UserCompetences.Add(userCompetence);
                }

                // Mise à jour de UserIndicator et insertion des UserIndicatorResult
                foreach (var indicator in miParcoursData.Indicators)
                {
                    var userIndicator = await _context.UserIndicators
                        .FirstOrDefaultAsync(ui => ui.UserEvalId == userEvalId.Value && ui.IndicatorId == indicator.IndicatorId);

                    if (userIndicator == null)
                    {
                        return NotFound(new { Message = $"Indicateur utilisateur non trouvé pour IndicatorId {indicator.IndicatorId}." });
                    }

                    // Mise à jour du nom de l'indicateur
                    userIndicator.Name = indicator.IndicatorName;
                    _context.UserIndicators.Update(userIndicator);

                    // Supprimer les anciens résultats pour éviter les doublons
                    var existingResults = await _context.UserIndicatorResults
                        .Where(r => r.UserIndicatorId == userIndicator.UserIndicatorId)
                        .ToListAsync();

                    if (existingResults.Any())
                    {
                        _context.UserIndicatorResults.RemoveRange(existingResults);
                    }

                    // Insertion des nouveaux résultats
                    foreach (var result in indicator.Results)
                    {
                        var userIndicatorResult = new UserIndicatorResult
                        {
                            UserIndicatorId = userIndicator.UserIndicatorId,
                            ResultText = result.ResultText,
                            Result = result.Result
                        };
                        _context.UserIndicatorResults.Add(userIndicatorResult);
                    }
                }

                // Sauvegarde des modifications dans la base de données
                await _context.SaveChangesAsync();

                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{manager.Name} a validé vos résultats pour la période mi-parcours";

                        var notification = new Notification
                        {
                            UserId = userId,
                            SenderId = manager.Id,
                            SenderMatricule = manager.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(userId, notification);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }

                return Ok("Validation réussie");
            }
            catch (Exception ex)
            {
                // Gestion des erreurs
                return BadRequest($"An error occurred: {ex.Message}");
            }
        }

        [HttpPut("UpdateMidtermObjectifNoncadre")]
        public async Task<IActionResult> UpdateUserEvaluation(string userId, string type, [FromBody] MiParcoursDataDto miParcoursData)
        {
            // Validation du type d'évaluation
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupère l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            // Vérifie si une évaluation en cours a été trouvée
            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupère l'ID de l'évaluation utilisateur pour l'utilisateur spécifié
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // Mise à jour de UserCompetence
                    foreach (var competence in miParcoursData.Competences)
                    {
                        var existingUserCompetence = await _context.UserCompetences
                            .FirstOrDefaultAsync(uc => uc.UserEvalId == userEvalId.Value && uc.CompetenceId == competence.CompetenceId);

                        if (existingUserCompetence != null)
                        {
                            // Mise à jour de la performance
                            existingUserCompetence.Performance = competence.Performance;
                            _context.UserCompetences.Update(existingUserCompetence);
                        }
                        else
                        {
                            // Si la compétence n'existe pas, retournez une erreur ou gérez-la autrement
                            return BadRequest(new { Message = $"UserCompetence non trouvée pour CompetenceId {competence.CompetenceId}." });
                        }
                    }

                    // Mise à jour de UserIndicator et UserIndicatorResult
                    foreach (var indicator in miParcoursData.Indicators)
                    {
                        var userIndicator = await _context.UserIndicators
                            .FirstOrDefaultAsync(ui => ui.UserEvalId == userEvalId.Value && ui.IndicatorId == indicator.IndicatorId);

                        if (userIndicator == null)
                        {
                            return NotFound(new { Message = $"UserIndicator non trouvée pour IndicatorId {indicator.IndicatorId}." });
                        }

                        // Mise à jour du nom de l'indicateur
                        userIndicator.Name = indicator.IndicatorName;
                        _context.UserIndicators.Update(userIndicator);

                        // Supprimer les anciens résultats pour cet indicateur
                        var existingResults = await _context.UserIndicatorResults
                            .Where(r => r.UserIndicatorId == userIndicator.UserIndicatorId)
                            .ToListAsync();

                        if (existingResults.Any())
                        {
                            _context.UserIndicatorResults.RemoveRange(existingResults);
                        }

                        // Insertion des nouveaux résultats
                        foreach (var result in indicator.Results)
                        {
                            var newResult = new UserIndicatorResult
                            {
                                UserIndicatorId = userIndicator.UserIndicatorId,
                                ResultText = result.ResultText,
                                Result = result.Result
                            };
                            _context.UserIndicatorResults.Add(newResult);
                        }
                    }

                    // Sauvegarde des modifications dans la base de données
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    try
                    {
                        var manager = await GetManagerByUserIdAsync(userId);
                        var triggeringUser = await GetUserDetails(userId);

                        if (manager != null && !string.IsNullOrEmpty(manager.Id))
                        {
                            var message = $"{manager.Name} a mis a jour vos objectifs pour la période mi-parcours";

                            var notification = new Notification
                            {
                                UserId = userId,
                                SenderId = manager.Id,
                                SenderMatricule = manager.Matricule,
                                Message = message,
                                IsRead = false,
                                CreatedAt = DateTime.Now
                            };

                            _context.Notifications.Add(notification);
                            await _context.SaveChangesAsync();

                            NotificationService.Notify(userId, notification);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                    }

                    return Ok(new { Message = "Données mises à jour avec succès." });
                }
                catch (Exception ex)
                {
                    // Rollback de la transaction en cas d'erreur
                    await transaction.RollbackAsync();
                    return BadRequest(new { Message = $"Une erreur s'est produite : {ex.Message}" });
                }
            }
        }


        [HttpGet("IsResultValidateByManager")]
        public async Task<IActionResult> VerifyEvaluationDataAsync(string userId, string type)
        {
            // Vérifie si le type fourni correspond à une énumération valide
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // Récupère l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupère l'ID de l'évaluation utilisateur
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            // Récupère les compétences de l'utilisateur
            var competences = await _context.UserCompetences
                .Where(uc => uc.UserEvalId == userEvalId)
                .ToListAsync();

            // Récupère les résultats des indicateurs avec les détails de UserIndicator
            var indicatorResults = await _context.UserIndicatorResults
                .Join(_context.UserIndicators,
                    uir => uir.UserIndicatorId,
                    ui => ui.UserIndicatorId,
                    (uir, ui) => new { uir, ui })
                .Where(joined => joined.ui.UserEvalId == userEvalId)
                .Select(joined => new
                {
                    joined.uir.ResultId,
                    joined.uir.UserIndicatorId,
                    joined.uir.ResultText,
                    joined.uir.Result,
                    IndicatorId = joined.ui.IndicatorId,
                    userIndicator = new
                    {
                        joined.ui.Name
                    }
                })
                .ToListAsync();

            // Retourne les données trouvées ou null si aucune donnée n'est disponible
            return Ok(new
            {
                competences = competences.Any() ? competences : null, // camelCase
                indicatorResults = indicatorResults.Any() ? indicatorResults : null // camelCase
            });
        }



        [HttpPost("ArchiveMiParcoursData")]
        public async Task<IActionResult> ArchiveMiParcoursData(
            string userId,
            string type,
            [FromBody] MiParcoursDataDto data)
        {
            // 1. Valider le paramètre type
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // 2. Récupérer l'ID de l'évaluation actuelle basée sur le type et EtatId
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // 3. Récupérer l'ID d'évaluation utilisateur pour l'utilisateur donné et l'évaluation
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            try
            {
                // 4. Préparer les Compétences
                if (data.Competences != null && data.Competences.Any())
                {
                    // Récupérer les noms des compétences en une seule requête pour optimiser les performances
                    var competenceIds = data.Competences.Select(c => c.CompetenceId).Distinct().ToList();
                    var competencesFromDb = await _context.Competences
                        .Where(c => competenceIds.Contains(c.CompetenceId))
                        .ToDictionaryAsync(c => c.CompetenceId, c => c.Name);

                    foreach (var competenceDto in data.Competences)
                    {
                        if (!competencesFromDb.TryGetValue(competenceDto.CompetenceId, out var competenceName))
                        {
                            return BadRequest(new { Message = $"Compétence avec l'ID {competenceDto.CompetenceId} non trouvée." });
                        }

                        var historyCompetence = new HistoryUserCompetenceMP
                        {
                            UserEvalId = userEvalId.Value,
                            CompetenceName = competenceName,
                            Performance = competenceDto.Performance
                        };
                        _context.HistoryUserCompetenceMPs.Add(historyCompetence);
                    }
                }

                // 5. Préparer les Indicateurs
                if (data.Indicators != null && data.Indicators.Any())
                {
                    foreach (var indicatorDto in data.Indicators)
                    {
                        // Vérifier si des résultats sont fournis
                        if (indicatorDto.Results != null && indicatorDto.Results.Any())
                        {
                            foreach (var resultDto in indicatorDto.Results)
                            {
                                var historyIndicator = new HistoryUserIndicatorMP
                                {
                                    UserEvalId = userEvalId.Value,
                                    Name = indicatorDto.IndicatorName,
                                    ResultText = resultDto.ResultText,
                                    Result = resultDto.Result
                                };
                                _context.HistoryUserIndicatorMPs.Add(historyIndicator);
                            }
                        }
                        else
                        {
                            // Si aucun résultat n'est fourni pour un indicateur, archiver avec des valeurs par défaut
                            var historyIndicator = new HistoryUserIndicatorMP
                            {
                                UserEvalId = userEvalId.Value,
                                Name = indicatorDto.IndicatorName,
                                ResultText = "Aucun résultat disponible.",
                                Result = 0 // Valeur par défaut
                            };
                            _context.HistoryUserIndicatorMPs.Add(historyIndicator);
                        }
                    }
                }

                // 6. Enregistrer les modifications dans la base de données
                await _context.SaveChangesAsync();

                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{triggeringUser.Name} a validé ses résultats pour la période mi-parcours";

                        var notification = new Notification
                        {
                            UserId = manager.Id,
                            SenderId = userId,
                            SenderMatricule = triggeringUser.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(manager.Id, notification);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }

                return Ok("Données archivées avec succès.");
            }
            catch (Exception ex)
            {
                // Journaliser l'exception (vous pouvez utiliser un framework de logging ici)
                Console.Error.WriteLine($"Erreur lors de l'archivage des données Mi-Parcours: {ex.Message}");
                return BadRequest(new { Message = $"Une erreur est survenue lors de l'archivage: {ex.Message}" });
            }
        }

        [HttpGet("GetArchivedDataMp")]
        public async Task<IActionResult> GetArchivedData([FromQuery] string userId, [FromQuery] string type)
        {
            // 1. Valider le paramètre type
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // 2. Récupérer l'ID de l'évaluation actuelle basée sur le type et EtatId
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // 3. Récupérer l'ID d'évaluation utilisateur pour l'utilisateur donné et l'évaluation
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            try
            {
                // 4. Récupérer les données archivées des Compétences
                var archivedCompetences = await _context.HistoryUserCompetenceMPs
                    .Where(hc => hc.UserEvalId == userEvalId.Value)
                    .Select(hc => new HistoryUserCompetenceMPDto
                    {
                        HistoryUserCompetenceId = hc.HistoryUserCompetenceId,
                        UserEvalId = hc.UserEvalId,
                        CompetenceName = hc.CompetenceName,
                        Performance = hc.Performance
                    })
                    .ToListAsync();

                // 5. Récupérer les données archivées des Indicateurs
                var archivedIndicators = await _context.HistoryUserIndicatorMPs
                    .Where(hi => hi.UserEvalId == userEvalId.Value)
                    .Select(hi => new HistoryUserIndicatorMPDto
                    {
                        HistoryUserIndicatorMPId = hi.HistoryUserIndicatorMPId,
                        UserEvalId = hi.UserEvalId,
                        Name = hi.Name,
                        ResultText = hi.ResultText,
                        Result = hi.Result
                    })
                    .ToListAsync();

                // 6. Préparer la réponse
                var result = new ArchivedDataDto
                {
                    Competences = archivedCompetences,
                    Indicators = archivedIndicators
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                // Journaliser l'exception (vous pouvez utiliser un framework de logging ici)
                Console.Error.WriteLine($"Erreur lors de la récupération des données archivées: {ex.Message}");
                return StatusCode(500, new { Message = "Une erreur interne est survenue." });
            }
        }

        [HttpGet("IsResultValidateByUser")]

        public async Task<IActionResult> IsResultValidateByUser(string userId, string type)
        {
            // 1. Validate the type parameter
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
            }

            // 2. Retrieve the current evaluation ID based on type and EtatId
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // 3. Retrieve the user evaluation ID for the given user and evaluation
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            // 4. Fetch data from HistoryUserCompetenceMPs
            var competences = await _context.HistoryUserCompetenceMPs
                .Where(c => c.UserEvalId == userEvalId)
                .ToListAsync();

            // 5. Fetch data from HistoryUserIndicatorMPs
            var indicators = await _context.HistoryUserIndicatorMPs
                .Where(i => i.UserEvalId == userEvalId)
                .ToListAsync();

            // 6. Return the combined result
            return Ok(new
            {
                UserEvalId = userEvalId,
                Competences = competences,
                Indicators = indicators
            });
        }

        [HttpPost("UpdateUserIndicatorResults")]
        public async Task<IActionResult> UpdateUserIndicatorResults(
            string userId,
            int userIndicatorId,
            [FromBody] List<UserIndicatorResultDto> updatedResults)
        {
            if (updatedResults == null || !updatedResults.Any())
            {
                return BadRequest(new { Message = "La liste des résultats est vide ou invalide." });
            }

            try
            {
                // Récupérer les résultats existants pour le UserIndicatorId spécifié
                var existingResults = await _context.UserIndicatorResults
                    .Where(uir => uir.UserIndicatorId == userIndicatorId)
                    .ToListAsync();

                if (!existingResults.Any())
                {
                    return NotFound(new { Message = "Aucun résultat trouvé pour le UserIndicator spécifié." });
                }

                // Mettre à jour les résultats existants
                foreach (var resultDto in updatedResults)
                {
                    var existingResult = existingResults
                        .FirstOrDefault(uir => uir.ResultId == resultDto.ResultId);

                    if (existingResult == null)
                    {
                        return NotFound(new { Message = $"Résultat introuvable pour ResultId {resultDto.ResultId}." });
                    }

                    // Mise à jour des valeurs
                    existingResult.ResultText = resultDto.ResultText ?? existingResult.ResultText;
                    existingResult.Result = resultDto.Result;
                    _context.UserIndicatorResults.Update(existingResult);
                }

                // Sauvegarder les modifications
                await _context.SaveChangesAsync();

                // Enregistrement des notifications
                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{manager.Name} a mis a jour vos objectifs pour la période d'évaluation finale";

                        var notification = new Notification
                        {
                            UserId = userId,
                            SenderId = manager.Id,
                            SenderMatricule = manager.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(userId, notification);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }

                return Ok(new { Message = "Résultats mis à jour avec succès." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = $"Une erreur est survenue : {ex.Message}" });
            }
        }


        [HttpPost("InsertHelpContents")]
        public async Task<IActionResult> InsertHelpContents([FromBody] List<UserHelpContentRequest> helpContents)
        {
            if (helpContents == null || !helpContents.Any())
            {
                return BadRequest(new { Message = "Aucun contenu à traiter." });
            }

            try
            {
                foreach (var helpContentRequest in helpContents)
                {
                    // 1. Valider le type d'évaluation
                    if (!Enum.TryParse<FormType>(helpContentRequest.Type, true, out var formType))
                    {
                        return BadRequest(new { Message = $"Type d'évaluation invalide pour l'élément {helpContentRequest.HelpId}. Utilisez 'Cadre' ou 'NonCadre'." });
                    }

                    // 2. Récupérer l'évaluation actuelle basée sur le type et l'état
                    var evaluationId = await _context.Evaluations
                        .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                        .Select(e => e.EvalId)
                        .FirstOrDefaultAsync();

                    if (evaluationId == 0)
                    {
                        return NotFound(new { Message = $"Aucune évaluation en cours pour le type {helpContentRequest.Type}." });
                    }

                    // 3. Récupérer le UserEvalId pour le userId et l'évaluation
                    var userEvalId = await GetUserEvalIdAsync(evaluationId, helpContentRequest.UserId);
                    if (userEvalId == null)
                    {
                        return NotFound(new { Message = $"Évaluation utilisateur non trouvée pour l'utilisateur {helpContentRequest.UserId}." });
                    }

                    // 4. Récupérer le contenu existant ou le créer si inexistant
                    var userHelpContent = await _context.UserHelpContents
                        .FirstOrDefaultAsync(uhc => uhc.UserEvalId == userEvalId.Value && uhc.HelpId == helpContentRequest.HelpId);

                    if (userHelpContent == null)
                    {
                        // Créer un nouveau contenu d'aide
                        userHelpContent = new UserHelpContent
                        {
                            UserEvalId = userEvalId.Value,
                            HelpId = helpContentRequest.HelpId,
                            WriterUserId = helpContentRequest.WriterUserId,
                            Content = helpContentRequest.Content
                        };
                        _context.UserHelpContents.Add(userHelpContent);
                    }
                    else
                    {
                        // Mettre à jour le contenu existant
                        userHelpContent.WriterUserId = helpContentRequest.WriterUserId;
                        userHelpContent.Content = helpContentRequest.Content;
                        _context.UserHelpContents.Update(userHelpContent);
                    }

                    // 5. (Suppression de l'archivage dans HistoryUserHelpContent)
                    // Cette partie est supprimée puisque nous ne voulons plus archiver les contenus.
                }

                // Sauvegarder les modifications dans la base de données
                await _context.SaveChangesAsync();

                return Ok("Contenus ajoutés ou mis à jour avec succès.");
            }
            catch (Exception ex)
            {
                // Gestion des erreurs
                Console.Error.WriteLine($"Erreur lors de l'insertion ou de la mise à jour des contenus : {ex.Message}");
                return BadRequest(new { Message = $"Une erreur est survenue : {ex.Message}" });
            }
        }

        [HttpGet("GetUserHelpContents")]
        public async Task<IActionResult> GetUserHelpContents(string userId, string type, string writerUserId)
        {
            // Validation du type d'évaluation
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Fi' ou un type valide." });
            }

            // Récupérer l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupérer l'ID de l'évaluation utilisateur pour l'utilisateur spécifié
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            // Récupérer les contenus d'aide pour cet utilisateur et cette évaluation, filtrés par WriterUserId
            var userHelpContents = await _context.UserHelpContents
                .Where(uhc => uhc.UserEvalId == userEvalId.Value && uhc.WriterUserId == writerUserId)
                .Select(uhc => new
                {
                    uhc.HelpId,
                    uhc.Help.Name,
                    uhc.Content
                })
                .ToListAsync();

            return Ok(userHelpContents);
        }



        [HttpGet("CheckWriterValidation")]
        public async Task<IActionResult> CheckWriterValidation(int evalId, string userId, int helpId, string writerUserId)
        {
            try
            {
                // Récupérer le UserEvalId à partir de l'évaluation et de l'utilisateur
                var userEvalId = await GetUserEvalIdAsync(evalId, userId);
                if (userEvalId == null)
                {
                    return NotFound(new { Message = $"Aucune évaluation utilisateur trouvée pour l'utilisateur {userId} et l'évaluation {evalId}." });
                }

                // Vérifier si le HelpId est actif pour cette évaluation
                var isHelpActiveForEval = await _context.Helps
                    .Where(h => h.HelpId == helpId) // Vérifier le HelpId donné
                    .Join(
                        _context.Evaluations,
                        help => help.TemplateId,       // Clé étrangère TemplateId dans Helps
                        eval => eval.TemplateId,      // Clé TemplateId dans Evaluations
                        (help, eval) => new { help, eval } // Associer Helps et Evaluations
                    )
                    .AnyAsync(he => he.eval.EvalId == evalId && he.help.IsActive);

                if (!isHelpActiveForEval)
                {
                    return NotFound(new { Message = $"Le contenu HelpId {helpId} n'est pas actif pour l'évaluation {evalId}." });
                }

                // Vérifier si le WriterUserId a validé ce contenu
                var isValidated = await _context.UserHelpContents
                    .AnyAsync(uhc => uhc.UserEvalId == userEvalId.Value
                                    && uhc.HelpId == helpId
                                    && uhc.WriterUserId == writerUserId);

                // Retourner le résultat
                if (isValidated)
                {
                    return Ok(new { Message = $"L'utilisateur WriterUserId {writerUserId} a déjà validé ce contenu.", IsValidated = true });
                }
                else
                {
                    return Ok(new { Message = $"L'utilisateur WriterUserId {writerUserId} n'a pas encore validé ce contenu.", IsValidated = false });
                }
            }
            catch (Exception ex)
            {
                // Gestion des erreurs
                Console.Error.WriteLine($"Erreur lors de la vérification de validation : {ex.Message}");
                return BadRequest(new { Message = $"Une erreur est survenue : {ex.Message}" });
            }
        }

        [HttpPost("ValidateIndicatorFiHistory")]
        public async Task<IActionResult> InsertHistoryUserindicatorFi(
            string userId,
            string validateUserId,
            string type,
            [FromBody] List<IndicatorDto> indicators)
        {
            // Validation du type d'évaluation
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Fi' ou un type valide." });
            }

            // Récupérer l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupérer l'ID de l'évaluation utilisateur pour l'utilisateur spécifié
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            try
            {
                // Récupérer tous les UserIndicators pour cet utilisateur et cette évaluation
                var existingIndicators = await _context.UserIndicators
                    .Where(ui => ui.UserEvalId == userEvalId.Value)
                    .ToListAsync();

                if (!existingIndicators.Any())
                {
                    return NotFound(new { Message = "Aucun UserIndicator trouvé pour cet utilisateur et cette évaluation." });
                }

                // Parcourir les indicateurs existants pour mise à jour et ajout des résultats à l'historique FI
                foreach (var existingIndicator in existingIndicators)
                {
                    // Vérifier si l'indicateur est présent dans les données fournies
                    var updatedIndicator = indicators.FirstOrDefault(ind => ind.IndicatorId == existingIndicator.IndicatorId);

                    // Mise à jour du nom de l'indicateur si nécessaire
                    if (updatedIndicator != null && existingIndicator.Name != updatedIndicator.IndicatorName)
                    {
                        existingIndicator.Name = updatedIndicator.IndicatorName;
                        _context.UserIndicators.Update(existingIndicator);
                    }

                    // Parcourir les résultats associés à cet indicateur et les insérer dans l'historique FI
                    if (updatedIndicator?.Results != null)
                    {
                        foreach (var result in updatedIndicator.Results)
                        {
                            var historyUserindicatorFi = new HistoryUserindicatorFi
                            {
                                UserEvalId = userEvalId.Value,
                                Name = existingIndicator.Name,
                                ResultText = result.ResultText ?? "N/A",
                                Result = result.Result,
                                ValidatedBy = validateUserId,
                                CreatedAt = DateTime.UtcNow
                            };

                            _context.HistoryUserindicatorFis.Add(historyUserindicatorFi);
                        }
                    }
                }

                // Sauvegarder les modifications et les ajouts dans l'historique FI
                await _context.SaveChangesAsync();

                try
                {
                    var manager = await GetManagerByUserIdAsync(userId);
                    var triggeringUser = await GetUserDetails(userId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{triggeringUser.Name} a validé ses résultats pour la période d'évaluation finale";

                        var notification = new Notification
                        {
                            UserId = manager.Id,
                            SenderId = userId,
                            SenderMatricule = triggeringUser.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(manager.Id, notification);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erreur lors de la notification du manager : {ex.Message}");
                }

                return Ok(new { Message = "Tous les indicateurs et leurs résultats ont été ajoutés dans l'historique FI avec succès." });
            }
            catch (Exception ex)
            {
                // Loggez l'exception ici si nécessaire (par exemple, avec ILogger)
                return BadRequest(new { Message = $"Une erreur est survenue : {ex.Message}" });
            }
        }

        [HttpGet("GetHistoryUserindicatorFi")]
        public async Task<IActionResult> GetHistoryUserindicatorFi(
            string userId,
            string type)
        {
            // Validation du type d'évaluation
            if (!Enum.TryParse<FormType>(type, true, out var formType))
            {
                return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Fi' ou un type valide." });
            }

            // Récupérer l'ID de l'évaluation en cours pour le type spécifié
            var evaluationId = await _context.Evaluations
                .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                .Select(e => e.EvalId)
                .FirstOrDefaultAsync();

            if (evaluationId == 0)
            {
                return NotFound(new { Message = $"Aucune évaluation en cours pour le type {type}." });
            }

            // Récupérer l'ID de l'évaluation utilisateur pour l'utilisateur spécifié
            var userEvalId = await GetUserEvalIdAsync(evaluationId, userId);
            if (userEvalId == null)
            {
                return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
            }

            try
            {
                // Récupérer les historiques des indicateurs FI pour cet utilisateur et cette évaluation
                var historyData = await _context.HistoryUserindicatorFis
                    .Where(h => h.UserEvalId == userEvalId.Value)
                    .OrderByDescending(h => h.CreatedAt)
                    .Select(h => new HistoryUserindicatorFiDto
                    {
                        Id = h.HistoryUserindicatorFiId,
                        UserEvalId = h.UserEvalId,
                        Name = h.Name,
                        ResultText = h.ResultText,
                        Result = h.Result,
                        ValidatedBy = h.ValidatedBy,
                        CreatedAt = h.CreatedAt
                    })
                    .ToListAsync();

                if (!historyData.Any())
                {
                    return NotFound(new { Message = "Aucun historique trouvé pour les critères spécifiés." });
                }

                return Ok(historyData);
            }
            catch (Exception ex)
            {
                // Loggez l'exception ici si nécessaire (par exemple, avec ILogger)
                return BadRequest(new { Message = $"Une erreur est survenue : {ex.Message}" });
            }
        }

        [HttpPost("updateResults")]
        public async Task<IActionResult> UpdateResults([FromBody] UpdateResultsRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest(new { Message = "Les données de mise à jour sont requises." });
                }

                if (!Enum.TryParse<FormType>(request.Type, true, out var formType))
                {
                    return BadRequest(new { Message = "Type d'évaluation invalide. Utilisez 'Cadre' ou 'NonCadre'." });
                }

                // Récupérer l'ID de l'évaluation en cours pour le type spécifié
                var evaluationId = await _context.Evaluations
                    .Where(e => e.EtatId == 2 && e.FormTemplate != null && e.FormTemplate.Type == formType)
                    .Select(e => e.EvalId)
                    .FirstOrDefaultAsync();

                if (evaluationId == 0)
                {
                    return NotFound(new { Message = $"Aucune évaluation en cours pour le type {request.Type}." });
                }

                // Récupérer l'ID de l'évaluation utilisateur
                var userEvalId = await GetUserEvalIdAsync(evaluationId, request.UserId);
                if (userEvalId == null)
                {
                    return NotFound(new { Message = "Évaluation utilisateur non trouvée." });
                }

                // Selon le type d'évaluation, traiter les données différemment
                if (formType == FormType.Cadre)
                {
                    // Traitement pour les cadres - mise à jour des objectifs
                    return await UpdateCadreResults(userEvalId.Value, request);
                }
                else if (formType == FormType.NonCadre)
                {
                    // Traitement pour les non-cadres - mise à jour des indicateurs
                    return await UpdateNonCadreResults(userEvalId.Value, request);
                }
                else
                {
                    return BadRequest(new { Message = "Type d'évaluation non supporté." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la mise à jour des résultats");
                return StatusCode(500, new { Message = "Une erreur est survenue lors de la mise à jour des résultats.", Details = ex.Message });
            }
        }

        private async Task<IActionResult> UpdateCadreResults(int userEvalId, UpdateResultsRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                if (request.Objectives == null || !request.Objectives.Any())
                {
                    return BadRequest(new { Message = "Aucun objectif fourni pour la mise à jour." });
                }

                // Récupérer tous les objectifs existants pour cet utilisateur
                var existingObjectives = await _context.UserObjectives
                    .Where(uo => uo.UserEvalId == userEvalId)
                    .Include(uo => uo.ObjectiveColumnValues)
                    .ToListAsync();

                // Mettre à jour chaque objectif
                foreach (var objectiveRequest in request.Objectives)
                {
                    var existingObjective = existingObjectives.FirstOrDefault(o => o.ObjectiveId == objectiveRequest.ObjectiveId);
                    
                    if (existingObjective != null)
                    {
                        // Mettre à jour les propriétés de base
                        if (!string.IsNullOrEmpty(objectiveRequest.Description))
                            existingObjective.Description = objectiveRequest.Description;
                        
                        if (objectiveRequest.Weighting.HasValue)
                            existingObjective.Weighting = objectiveRequest.Weighting.Value;
                        
                        if (!string.IsNullOrEmpty(objectiveRequest.ResultIndicator))
                            existingObjective.ResultIndicator = objectiveRequest.ResultIndicator;
                        
                        if (!string.IsNullOrEmpty(objectiveRequest.ManagerComment))
                        {
                            existingObjective.ManagerComment = objectiveRequest.ManagerComment;
                        }

                        
                        var updatedBy = (request.UpdatedBy ?? "").ToUpper();
                        var isManager = updatedBy == "MANAGER";

                        if (objectiveRequest.Result.HasValue)
                        {
                            if (isManager)
                            {
                                existingObjective.ManagerResult = objectiveRequest.Result.Value;
                                existingObjective.Result = objectiveRequest.Result.Value; // valeur officielle
                            }
                            else
                            {
                                existingObjective.CollaboratorResult = objectiveRequest.Result.Value;

                                // optionnel : si manager pas encore saisi, Result suit l’auto-éval
                                if (existingObjective.ManagerResult == null)
                                    existingObjective.Result = objectiveRequest.Result.Value;
                            }
                        }

                        if (isManager && !string.IsNullOrWhiteSpace(objectiveRequest.ManagerComment))
                        {
                            existingObjective.ManagerComment = objectiveRequest.ManagerComment;
                        }


                        // CORRECTION: Utiliser DynamicColumns au lieu de ColumnValues
                        // Mettre à jour les colonnes dynamiques
                        if (objectiveRequest.DynamicColumns != null && objectiveRequest.DynamicColumns.Any())
                        {
                            foreach (var column in objectiveRequest.DynamicColumns)
                            {
                                var existingColumnValue = existingObjective.ObjectiveColumnValues
                                    .FirstOrDefault(cv => cv.ObjectiveColumn.Name == column.ColumnName);
                                
                                if (existingColumnValue != null)
                                {
                                    existingColumnValue.Value = column.Value;
                                }
                                else
                                {
                                    // Chercher la colonne dans la base de données
                                    var columnEntity = await _context.ObjectiveColumns
                                        .FirstOrDefaultAsync(c => c.Name == column.ColumnName);
                                    
                                    if (columnEntity != null)
                                    {
                                        var newColumnValue = new ObjectiveColumnValue
                                        {
                                            ObjectiveId = existingObjective.ObjectiveId,
                                            ColumnId = columnEntity.ColumnId,
                                            Value = column.Value
                                        };
                                        _context.ObjectiveColumnValues.Add(newColumnValue);
                                    }
                                }
                            }
                        }

                        _context.UserObjectives.Update(existingObjective);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Notifier le manager si nécessaire
                try
                {
                    var manager = await GetManagerByUserIdAsync(request.UserId);
                    var user = await GetUserDetails(request.UserId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{user.Name} a mis à jour ses résultats d'évaluation";

                        var notification = new Notification
                        {
                            UserId = manager.Id,
                            SenderId = request.UserId,
                            SenderMatricule = user.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(manager.Id, notification);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Erreur lors de la notification du manager");
                }

                return Ok(new { Message = "Résultats mis à jour avec succès." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Erreur lors de la mise à jour des résultats cadre");
                throw;
            }
        }

        private async Task<IActionResult> UpdateNonCadreResults(int userEvalId, UpdateResultsRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                if (request.Indicators == null || !request.Indicators.Any())
                {
                    return BadRequest(new { Message = "Aucun indicateur fourni pour la mise à jour." });
                }

                // Récupérer tous les indicateurs existants pour cet utilisateur
                var existingIndicators = await _context.UserIndicators
                    .Where(ui => ui.UserEvalId == userEvalId)
                    .Include(ui => ui.UserIndicatorResults)
                    .ToListAsync();

                // Mettre à jour chaque indicateur
                foreach (var indicatorRequest in request.Indicators)
                {
                    var existingIndicator = existingIndicators.FirstOrDefault(i => i.IndicatorId == indicatorRequest.IndicatorId);
                    
                    if (existingIndicator != null)
                    {
                        // Mettre à jour le nom de l'indicateur
                        if (!string.IsNullOrEmpty(indicatorRequest.Name))
                            existingIndicator.Name = indicatorRequest.Name;

                        // Mettre à jour les résultats
                        if (indicatorRequest.Results != null && indicatorRequest.Results.Any())
                        {
                            // Supprimer les anciens résultats
                            var oldResults = existingIndicator.UserIndicatorResults.ToList();
                            if (oldResults.Any())
                            {
                                _context.UserIndicatorResults.RemoveRange(oldResults);
                            }

                            // Ajouter les nouveaux résultats
                            foreach (var result in indicatorRequest.Results)
                            {
                                var newResult = new UserIndicatorResult
                                {
                                    UserIndicatorId = existingIndicator.UserIndicatorId,
                                    ResultText = result.ResultText,
                                    Result = result.Result
                                };
                                _context.UserIndicatorResults.Add(newResult);
                            }
                        }

                        _context.UserIndicators.Update(existingIndicator);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Notifier le manager si nécessaire
                try
                {
                    var manager = await GetManagerByUserIdAsync(request.UserId);
                    var user = await GetUserDetails(request.UserId);

                    if (manager != null && !string.IsNullOrEmpty(manager.Id))
                    {
                        var message = $"{user.Name} a mis à jour ses résultats d'évaluation";

                        var notification = new Notification
                        {
                            UserId = manager.Id,
                            SenderId = request.UserId,
                            SenderMatricule = user.Matricule,
                            Message = message,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                        _context.Notifications.Add(notification);
                        await _context.SaveChangesAsync();

                        NotificationService.Notify(manager.Id, notification);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Erreur lors de la notification du manager");
                }

                return Ok(new { Message = "Résultats mis à jour avec succès." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Erreur lors de la mise à jour des résultats non-cadre");
                throw;
            }
        }

        public class UpdateResultsRequest
        {
            public string UserId { get; set; }
            public string Type { get; set; } // "Cadre" ou "NonCadre"
            public string UpdatedBy { get; set; } // "COLLABORATOR" ou "MANAGER"


            
            // Pour les cadres
            public List<ObjectiveUpdateDto> Objectives { get; set; }
            
            // Pour les non-cadres
            public List<IndicatorUpdateDto> Indicators { get; set; }
        }

        public class ObjectiveUpdateDto
        {
            public int ObjectiveId { get; set; }
            public string Description { get; set; }
            public decimal? Weighting { get; set; }
            public string ResultIndicator { get; set; }
            public decimal? Result { get; set; }
            public string? ManagerComment { get; set; }
            
            // Propriété principale
            public List<ColumnValueUpdateDto> DynamicColumns { get; set; }
            
            // Alias pour compatibilité
            public List<ColumnValueUpdateDto> ColumnValues 
            { 
                get => DynamicColumns; 
                set => DynamicColumns = value; 
            }
        }

        public class IndicatorUpdateDto
        {
            public int IndicatorId { get; set; }
            public string Name { get; set; }
            public List<ResultUpdateDto> Results { get; set; }
        }

        public class ResultUpdateDto
        {
            public string ResultText { get; set; }
            public decimal Result { get; set; }
        }

        public class ColumnValueUpdateDto  
        {
            public string ColumnName { get; set; }
            public string Value { get; set; }
        }
        public class MiParcoursDataDto
        {
            public List<CompetenceDto> Competences { get; set; }
            public List<IndicatorDto> Indicators { get; set; }
        }

        public class CompetenceDto
        {
            public int CompetenceId { get; set; }
            public decimal Performance { get; set; }
        }

        public class IndicatorDto
        {
            public int IndicatorId { get; set; }
            public string IndicatorName { get; set; }
            public List<ResultDto> Results { get; set; }
        }

        public class ResultDto
        {
            public string ResultText { get; set; }
            public decimal Result { get; set; }
        }

        public class UserIndicatorDto
        {
            public int UserIndicatorId { get; set; }
            public string Name { get; set; }
            public List<UserResultDto> UserIndicatorResults { get; set; }
        }

        public class UserResultDto
        {
            public int ResultId { get; set; }
            public string ResultText { get; set; }
            public decimal Result { get; set; }
        }

        public class ModifiedUserObjectiveDto
        {
            public int ObjectiveId { get; set; }
            public string? Description { get; set; }
            public decimal? Weighting { get; set; }
            public string? ResultIndicator { get; set; }
            public decimal? Result { get; set; }
            public string? ManagerComment { get; set; }
            public List<ColumnValueDto>? ObjectiveColumnValues { get; set; }
        }


        public class UserHelpContentRequest
        {
            public string UserId { get; set; }
            public string WriterUserId { get; set; }
            public string Type { get; set; } // "Cadre" ou "NonCadre"
            public int HelpId { get; set; }
            public string Content { get; set; }
        }

        public class UserIndicatorResultDto
        {
            public int ResultId { get; set; } // ID du résultat à mettre à jour
            public string? ResultText { get; set; } // Nouveau texte du résultat
            public decimal Result { get; set; } // Nouvelle valeur du résultat
        }

        public class HistoryUserCompetenceMPDto
        {
            public int HistoryUserCompetenceId { get; set; }
            public int UserEvalId { get; set; }
            public string CompetenceName { get; set; }
            public decimal Performance { get; set; }
        }

        public class HistoryUserIndicatorMPDto
        {
            public int HistoryUserIndicatorMPId { get; set; }
            public int UserEvalId { get; set; }
            public string Name { get; set; }
            public string ResultText { get; set; }
            public decimal Result { get; set; }
        }

        public class ArchivedDataDto
        {
            public List<HistoryUserCompetenceMPDto> Competences { get; set; }
            public List<HistoryUserIndicatorMPDto> Indicators { get; set; }
        }

        public class HistoryUserindicatorFiDto
        {
            public int Id { get; set; }
            public int UserEvalId { get; set; }
            public string Name { get; set; }
            public string ResultText { get; set; }
            public decimal? Result { get; set; }
            public string ValidatedBy { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        public class ValidateFinaleRequest
        {
            
            public string UserId { get; set; }
            public string Type { get; set; }
            public List<ModifiedUserObjectiveDto> Objectives { get; set; }
        }

        public class ValidateFinaleHistoryRequest
        {
            public string UserId { get; set; }
            public string Type { get; set; }
            public List<ObjectiveDto> Objectives { get; set; }
        }



    }
}