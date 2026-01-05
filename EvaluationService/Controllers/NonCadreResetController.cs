using EvaluationService.Data;
using EvaluationService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace EvaluationService.Controllers
{
    // Définit la route de base pour ce contrôleur d'API
    [Route("api/[controller]")]
    [ApiController]
    public class NonCadreResetController : ControllerBase
    {
        private readonly AppdbContext _context;
        private readonly ILogger<NonCadreResetController> _logger;

        // Injection des dépendances : contexte BDD et logger
        public NonCadreResetController(AppdbContext context, ILogger<NonCadreResetController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Endpoint POST pour réinitialiser les données NonCadre selon les options du client
        [HttpPost("reset-non-cadre")]
        public async Task<IActionResult> ResetNonCadre([FromBody] ResetNonCadreRequest request)
        {
            // Vérifie la validité de la requête
            if (request == null)
            {
                return BadRequest(new ControllerErrorResponse
                {
                    ErrorMessage = "La requête est invalide."
                });
            }

            // Vérifie qu'au moins une case est cochée
            if (!request.Evaluation && !request.Fixation && !request.MiParcoursIndicators &&
                !request.MiParcoursCompetence && !request.Finale && !request.Help &&
                !request.UserHelpContent)
            {
                return BadRequest(new ControllerErrorResponse
                {
                    ErrorMessage = "Veuillez sélectionner au moins un cadre à réinitialiser."
                });
            }

            // Vérifie la validité de l'année
            if (request.Annee < 1900 || request.Annee > 2100)
            {
                return BadRequest(new ControllerErrorResponse
                {
                    ErrorMessage = "L'année doit être comprise entre 1900 et 2100."
                });
            }

            // Démarre une transaction pour garantir la cohérence des suppressions
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Recherche l'évaluation NonCadre pour l'année donnée
                var evaluation = await _context.Evaluations
                    .FirstOrDefaultAsync(e => e.EvalAnnee == request.Annee && e.Type == "NonCadre");

                if (evaluation == null)
                {
                    return NotFound(new ControllerErrorResponse
                    {
                        ErrorMessage = $"Aucune évaluation NonCadre trouvée pour l'année {request.Annee}."
                    });
                }

                // Récupère les IDs des UserEvaluations liés à cette évaluation
                var userEvalIds = await _context.UserEvaluations
                    .Where(ue => ue.EvalId == evaluation.EvalId)
                    .Select(ue => ue.UserEvalId)
                    .ToListAsync();

                _logger.LogInformation($"Found {userEvalIds.Count} user evaluations for year {request.Annee}");

                if (userEvalIds.Any())
                {
                    // Suppression des tables dépendantes dans l'ordre pour éviter les violations de clés étrangères
                    if (request.Finale)
                    {
                        await DeleteDependentRecordsAsync(userEvalIds, "HistoryCFis");
                    }

                    if (request.MiParcoursCompetence)
                    {
                        await DeleteDependentRecordsAsync(userEvalIds, "HistoryCMps");
                    }

                    if (request.MiParcoursIndicators)
                    {
                        await DeleteDependentRecordsAsync(userEvalIds, "HistoryUserIndicatorMPs");
                    }

                    if (request.Fixation)
                    {
                        await DeleteDependentRecordsAsync(userEvalIds, "HistoryCFos");
                    }

                    // Suppression critique pour éviter les violations de FK avec UserHelpContents
                    _logger.LogInformation($"Attempting to delete UserHelpContents for year {request.Annee}.");
                    await DeleteDependentRecordsAsync(userEvalIds, "UserHelpContents");

                    // Suppression des objectifs pour éviter les violations de FK
                    _logger.LogInformation($"Attempting to delete UserObjectives for year {request.Annee}.");
                    await DeleteDependentRecordsAsync(userEvalIds, "UserObjectives");

                    // Suppression d'autres tables dépendantes si elles existent
                    var dependentTables = new[] { "UserIndicators", "UserCompetencies" }; // Ajouter d'autres tables si besoin
                    foreach (var tableName in dependentTables)
                    {
                        if (_context.Model.GetEntityTypes().Any(e => e.ClrType.Name == tableName))
                        {
                            await DeleteDependentRecordsAsync(userEvalIds, tableName);
                        }
                    }

                    // Suppression des UserEvaluations si demandé
                    if (request.Evaluation)
                    {
                        var deletedUserEvalCount = await _context.UserEvaluations
                            .Where(ue => ue.EvalId == evaluation.EvalId)
                            .ExecuteDeleteAsync();
                        _logger.LogInformation($"Deleted {deletedUserEvalCount} UserEvaluation records for year {request.Annee}.");
                    }
                }

                // Suppression des aides si demandé
                if (request.Help && evaluation.TemplateId != null)
                {
                    var deletedHelpCount = await _context.Helps
                        .Where(h => h.TemplateId == evaluation.TemplateId)
                        .ExecuteDeleteAsync();
                    _logger.LogInformation($"Deleted {deletedHelpCount} Help records for year {request.Annee}.");
                }

                // Suppression de l'évaluation principale si demandé
                if (request.Evaluation)
                {
                    var deletedEvalCount = await _context.Evaluations
                        .Where(e => e.EvalId == evaluation.EvalId)
                        .ExecuteDeleteAsync();
                    _logger.LogInformation($"Deleted {deletedEvalCount} Evaluation record for year {request.Annee}.");
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Cadres réinitialisés avec succès." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, $"Error resetting non-cadre data for year {request.Annee}.");
                string errorMessage = "Une erreur est survenue lors de la réinitialisation des données.";
                string details = null;

                if (IsForeignKeyConstraintViolation(ex))
                {
                    if (ex.Message.Contains("FK_UserHelpContents_UserEvaluations_UserEvalId"))
                    {
                        errorMessage = "Impossible de supprimer les évaluations car elles sont liées à des contenus d'aide utilisateur.";
                    }
                    else
                    {
                        errorMessage = "Impossible de supprimer les données car elles sont liées à d'autres enregistrements.";
                    }
                }
                else
                {
                    details = ex.Message;
                }

                return StatusCode(500, new ControllerErrorResponse
                {
                    ErrorMessage = errorMessage,
                    Details = details
                });
            }
        }

        // Endpoint GET pour vérifier l'état de présence des données pour une année donnée
        [HttpGet("reset-status")]
        public async Task<IActionResult> GetResetStatus([FromQuery] int annee)
        {
            _logger.LogInformation("Checking reset status for year {Year}.", annee);
            var evaluation = await _context.Evaluations.FirstOrDefaultAsync(e => e.EvalAnnee == annee && e.Type == "NonCadre");

            if (evaluation == null)
            {
                _logger.LogInformation("No evaluation found for year {Year}.", annee);
                return Ok(new
                {
                    Evaluation = false,
                    Fixation = false,
                    MiParcoursIndicators = false,
                    MiParcoursCompetence = false,
                    Finale = false,
                    Help = false,
                    UserHelpContent = false
                });
            }

            // Vérifie la présence de données dans chaque table liée
            var userEvalIds = await _context.UserEvaluations
                .Where(ue => ue.EvalId == evaluation.EvalId)
                .Select(ue => ue.UserEvalId)
                .ToListAsync();

            bool hasFixation = await _context.HistoryCFos.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasMiParcoursIndicators = await _context.HistoryUserIndicatorMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasMiParcoursCompetence = await _context.HistoryCMps.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasFinale = await _context.HistoryCFis.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasHelp = await _context.Helps.AnyAsync(h => h.TemplateId == evaluation.TemplateId);
            bool hasUserHelpContent = await _context.UserHelpContents.AnyAsync(uhc => userEvalIds.Contains(uhc.UserEvalId));

            _logger.LogInformation("Reset status for year {Year}: Evaluation={Evaluation}, Fixation={Fixation}, MiParcoursIndicators={MiParcoursIndicators}, MiParcoursCompetence={MiParcoursCompetence}, Finale={Finale}, Help={Help}, UserHelpContent={UserHelpContent}.",
                annee, true, hasFixation, hasMiParcoursIndicators, hasMiParcoursCompetence, hasFinale, hasHelp, hasUserHelpContent);

            return Ok(new
            {
                Evaluation = true,
                Fixation = hasFixation,
                MiParcoursIndicators = hasMiParcoursIndicators,
                MiParcoursCompetence = hasMiParcoursCompetence,
                Finale = hasFinale,
                Help = hasHelp,
                UserHelpContent = hasUserHelpContent
            });
        }

        // Helper method to detect foreign key constraint violations
        private bool IsForeignKeyConstraintViolation(Exception ex)
        {
            var innerException = ex;
            while (innerException != null)
            {
                var message = innerException.Message.ToLowerInvariant();
                if (message.Contains("foreign key") && message.Contains("constraint"))
                {
                    return true;
                }
                innerException = innerException.InnerException;
            }
            return false;
        }

        // Méthode utilitaire pour supprimer les enregistrements dépendants d'une table donnée
        private async Task<int> DeleteDependentRecordsAsync(List<int> userEvalIds, string tableName, string foreignKeyColumn = "UserEvalId")
        {
            try
            {
                var sql = $"DELETE FROM {tableName} WHERE {foreignKeyColumn} IN ({string.Join(",", userEvalIds)})";
                var deletedCount = await _context.Database.ExecuteSqlRawAsync(sql);
                _logger.LogInformation($"Deleted {deletedCount} records from {tableName} for year {userEvalIds.Count}.");
                return deletedCount;
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Could not delete from {tableName}: {ex.Message}");
                return 0;
            }
        }
    }

    // Modèle de la requête pour la réinitialisation
    public class ResetNonCadreRequest
    {
        public int Annee { get; set; }
        public bool Evaluation { get; set; }
        public bool Fixation { get; set; }
        public bool MiParcoursIndicators { get; set; }
        public bool MiParcoursCompetence { get; set; }
        public bool Finale { get; set; }
        public bool Help { get; set; }
        public bool UserHelpContent { get; set; }
    }
}