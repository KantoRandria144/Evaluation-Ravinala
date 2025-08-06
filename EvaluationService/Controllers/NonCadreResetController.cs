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
    public class NonCadreResetController : ControllerBase
    {
        private readonly AppdbContext _context;
        private readonly ILogger<NonCadreResetController> _logger;

        public NonCadreResetController(AppdbContext context, ILogger<NonCadreResetController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("reset-non-cadre")]
        public async Task<IActionResult> ResetNonCadre([FromBody] ResetNonCadreRequest request)
        {
            if (request == null)
            {
                return BadRequest(new ControllerErrorResponse
                {
                    ErrorMessage = "La requête est invalide."
                });
            }

            if (!request.Evaluation && !request.Fixation && !request.MiParcoursIndicators &&
                !request.MiParcoursCompetence && !request.Finale && !request.Help &&
                !request.UserHelpContent)
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
                    .FirstOrDefaultAsync(e => e.EvalAnnee == request.Annee && e.Type == "NonCadre");

                if (evaluation == null && (request.Evaluation || request.Fixation || request.MiParcoursIndicators ||
                                          request.MiParcoursCompetence || request.Finale || request.UserHelpContent))
                {
                    return BadRequest(new ControllerErrorResponse
                    {
                        ErrorMessage = "Aucune période d'évaluation trouvée pour l'année spécifiée."
                    });
                }

                var userEvalIds = evaluation != null
                    ? await _context.UserEvaluations
                        .Where(ue => ue.EvalId == evaluation.EvalId)
                        .Select(ue => ue.UserEvalId)
                        .ToListAsync()
                    : new List<int>();

                if (request.UserHelpContent && userEvalIds.Any())
                {
                    await _context.UserHelpContents
                        .Where(uhc => userEvalIds.Contains(uhc.UserEvalId))
                        .ExecuteDeleteAsync();
                    _logger.LogInformation($"Deleted UserHelpContent for year {request.Annee}.");
                }

                if (request.Help)
                {
                    await _context.Helps
                        .Where(h => h.TemplateId == evaluation.TemplateId)
                        .ExecuteDeleteAsync();
                    _logger.LogInformation($"Deleted Help data for year {request.Annee}.");
                }

                if (request.Finale && userEvalIds.Any())
                {
                    await _context.HistoryUserindicatorFis
                        .Where(h => userEvalIds.Contains(h.UserEvalId))
                        .ExecuteDeleteAsync();
                    _logger.LogInformation($"Deleted Finale data for year {request.Annee}.");
                }

                if (request.MiParcoursCompetence && userEvalIds.Any())
                {
                    await _context.HistoryUserCompetenceMPs
                        .Where(h => userEvalIds.Contains(h.UserEvalId))
                        .ExecuteDeleteAsync();
                    _logger.LogInformation($"Deleted MiParcoursCompetence data for year {request.Annee}.");
                }

                if (request.MiParcoursIndicators && userEvalIds.Any())
                {
                    await _context.HistoryUserIndicatorMPs
                        .Where(h => userEvalIds.Contains(h.UserEvalId))
                        .ExecuteDeleteAsync();
                    _logger.LogInformation($"Deleted MiParcoursIndicators data for year {request.Annee}.");
                }

                if (request.Fixation && userEvalIds.Any())
                {
                    await _context.HistoryUserIndicatorFOs
                        .Where(h => userEvalIds.Contains(h.UserEvalId))
                        .ExecuteDeleteAsync();
                    _logger.LogInformation($"Deleted Fixation data for year {request.Annee}.");
                }

                if (request.Evaluation && evaluation != null)
                {
                    await _context.UserEvaluations
                        .Where(ue => ue.EvalId == evaluation.EvalId)
                        .ExecuteDeleteAsync();
                    await _context.Evaluations
                        .Where(e => e.EvalId == evaluation.EvalId)
                        .ExecuteDeleteAsync();
                    _logger.LogInformation($"Deleted Evaluation data for year {request.Annee}.");
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Cadres réinitialisés avec succès." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, $"Error resetting non-cadre data for year {request.Annee}.");
                return StatusCode(500, new ControllerErrorResponse
                {
                    ErrorMessage = "Une erreur est survenue lors de la réinitialisation.",
                    Details = ex.Message
                });
            }
        }

        [HttpGet("reset-status")]
        public async Task<IActionResult> GetResetStatus([FromQuery] int annee)
        {
            var evaluation = await _context.Evaluations
                .FirstOrDefaultAsync(e => e.EvalAnnee == annee && e.Type == "NonCadre");

            if (evaluation == null)
            {
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

            var userEvalIds = await _context.UserEvaluations
                .Where(ue => ue.EvalId == evaluation.EvalId)
                .Select(ue => ue.UserEvalId)
                .ToListAsync();

            bool hasFixation = await _context.HistoryUserIndicatorFOs
                .AnyAsync(h => userEvalIds.Contains(h.UserEvalId));

            bool hasMiParcoursIndicators = await _context.HistoryUserIndicatorMPs
                .AnyAsync(h => userEvalIds.Contains(h.UserEvalId));

            bool hasMiParcoursCompetence = await _context.HistoryUserCompetenceMPs
                .AnyAsync(h => userEvalIds.Contains(h.UserEvalId));

            bool hasFinale = await _context.HistoryUserindicatorFis
                .AnyAsync(h => userEvalIds.Contains(h.UserEvalId));

            bool hasHelp = await _context.Helps
                .AnyAsync(h => h.TemplateId == evaluation.TemplateId);

            bool hasUserHelpContent = await _context.UserHelpContents
                .AnyAsync(h => userEvalIds.Contains(h.UserEvalId));

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
    }

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
