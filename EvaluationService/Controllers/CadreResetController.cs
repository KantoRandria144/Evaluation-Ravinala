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
    [Route("api/[controller]")]
    [ApiController]
    public class CadreResetController : ControllerBase
    {
        private readonly AppdbContext _context;
        private readonly ILogger<CadreResetController> _logger;

        public CadreResetController(AppdbContext context, ILogger<CadreResetController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("reset-cadre")]
        public async Task<IActionResult> ResetCadre([FromBody] ResetCadreRequest request)
        {
            if (request == null)
            {
                return BadRequest(new ControllerErrorResponse
                {
                    ErrorMessage = "La requête est invalide."
                });
            }

            if (!request.Evaluation && !request.Fixation && !request.MiParcours && !request.Finale)
            {
                return BadRequest(new ControllerErrorResponse
                {
                    ErrorMessage = "Veuillez sélectionner au moins un cadre à réinitialiser."
                });
            }

            if (request.Annee < 1900 || request.Annee > 2100)
            {
                return BadRequest(new ControllerErrorResponse
                {
                    ErrorMessage = "L'année doit être comprise entre 1900 et 2100."
                });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var evaluation = await _context.Evaluations
                    .FirstOrDefaultAsync(e => e.EvalAnnee == request.Annee && e.Type == "Cadre");

                if (evaluation == null)
                {
                    return NotFound(new ControllerErrorResponse
                    {
                        ErrorMessage = $"Aucune évaluation Cadre trouvée pour l'année {request.Annee}."
                    });
                }

                var userEvalIds = await _context.UserEvaluations
                    .Where(ue => ue.EvalId == evaluation.EvalId)
                    .Select(ue => ue.UserEvalId)
                    .ToListAsync();

                _logger.LogInformation($"Found {userEvalIds.Count} user evaluations for year {request.Annee}");

                if (userEvalIds.Any())
                {
                    // Delete dependent records in the correct order to avoid FK violations
                    if (request.Finale)
                    {
                        await DeleteDependentRecordsAsync(userEvalIds, "HistoryCFis");
                    }

                    if (request.MiParcours)
                    {
                        await DeleteDependentRecordsAsync(userEvalIds, "HistoryUserIndicatorMPs");
                    }

                    if (request.Fixation)
                    {
                        await DeleteDependentRecordsAsync(userEvalIds, "HistoryCFos");
                    }

                    // Delete UserObjectives (critical to avoid FK_UserObjectives_UserEvaluations_UserEvalId)
                    _logger.LogInformation($"Attempting to delete UserObjectives for year {request.Annee}.");
                    await DeleteDependentRecordsAsync(userEvalIds, "UserObjectives");

                    // Delete other dependent tables if they exist
                    var dependentTables = new[] { "UserIndicators", "UserCompetencies" }; // Add more as needed
                    foreach (var tableName in dependentTables)
                    {
                        if (_context.Model.GetEntityTypes().Any(e => e.ClrType.Name == tableName))
                        {
                            await DeleteDependentRecordsAsync(userEvalIds, tableName);
                        }
                    }

                    // Delete UserEvaluations if requested
                    if (request.Evaluation)
                    {
                        var deletedUserEvalCount = await _context.UserEvaluations
                            .Where(ue => ue.EvalId == evaluation.EvalId)
                            .ExecuteDeleteAsync();
                        _logger.LogInformation($"Deleted {deletedUserEvalCount} UserEvaluation records for year {request.Annee}.");
                    }
                }

                // Delete the main Evaluation record last if requested
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
                _logger.LogError(ex, $"Error resetting cadre data for year {request.Annee}.");
                string errorMessage = "Une erreur est survenue lors de la réinitialisation.";
                string details = null;

                if (IsForeignKeyConstraintViolation(ex))
                {
                    errorMessage = "Cette entité que vous essayez d'effacer est reliée avec plusieurs entités.";
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

        [HttpGet("reset-status")]
        public async Task<IActionResult> GetResetStatus([FromQuery] int annee)
        {
            var evaluation = await _context.Evaluations.FirstOrDefaultAsync(e => e.EvalAnnee == annee && e.Type == "Cadre");

            if (evaluation == null)
            {
                return Ok(new
                {
                    Evaluation = false,
                    Fixation = false,
                    MiParcours = false,
                    Finale = false
                });
            }

            var userEvalIds = await _context.UserEvaluations
                .Where(ue => ue.EvalId == evaluation.EvalId)
                .Select(ue => ue.UserEvalId)
                .ToListAsync();

            bool hasFixation = await _context.HistoryCFos.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasMiParcours = await _context.HistoryCMps.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasFinale = await _context.HistoryCFis.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));

            return Ok(new
            {
                Evaluation = true,
                Fixation = hasFixation,
                MiParcours = hasMiParcours,
                Finale = hasFinale
            });
        }

        // Helper method to detect foreign key constraint violations
        private bool IsForeignKeyConstraintViolation(Exception ex)
        {
            var innerException = ex;
            while (innerException != null)
            {
                var message = innerException.Message.ToLowerInvariant();
                if (message.Contains("foreign key") && message.Contains("constraint") && message.Contains("violation"))
                {
                    return true;
                }
                innerException = innerException.InnerException;
            }
            return false;
        }

        // Helper method to delete records from dependent tables
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

    public class ResetCadreRequest
    {
        public int Annee { get; set; }
        public bool Evaluation { get; set; }
        public bool Fixation { get; set; }
        public bool MiParcours { get; set; }
        public bool Finale { get; set; }
    }
}