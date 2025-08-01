// Controllers/NonCadreImportController.cs
using CommonModels.DTOs;
using CsvHelper;
using CsvHelper.Configuration;
using EvaluationService.Data;
using EvaluationService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using Newtonsoft.Json;
using Microsoft.Extensions.Logging;

namespace EvaluationService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NonCadreImportController : ControllerBase
    {
        private readonly AppdbContext _context;
        private readonly HttpClient _httpClient;
        private readonly ILogger<NonCadreImportController> _logger;

        public NonCadreImportController(AppdbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<NonCadreImportController> logger)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.BaseAddress = new Uri(configuration["UserService:BaseUrl"]);
            _logger = logger;
        }

        private async Task<List<UserDTO>> GetUsersFromExternalService()
        {
            var response = await _httpClient.GetAsync("/api/User/user");

            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Failed to fetch users: {response.StatusCode}");
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject<List<UserDTO>>(content);
        }

        // [HttpPost("import-non-cadre-evaluation")]
        // public async Task<IActionResult> ImportNonCadreEvaluation([FromForm] ImportNonCadreEvaluationRequest request)
        // {
        //     // Vérifiez la présence des cinq premiers fichiers uniquement
        //     if (request.EvaluationFile == null || request.FixationFile == null ||
        //         request.MiParcoursIndicatorsFile == null || request.MiParcoursCompetenceFile == null ||
        //         request.FinaleFile == null)
        //     {
        //         _logger.LogWarning("Tentative d'importation avec des fichiers manquants.");
        //         return BadRequest(new ControllerErrorResponse
        //         {
        //             ErrorMessage = "Les fichiers Evaluation, Fixation, MiParcoursIndicators, MiParcoursCompetence et Finale sont requis."
        //         });
        //     }

        //     using var transaction = await _context.Database.BeginTransactionAsync();

        //     try
        //     {
        //         _logger.LogInformation("Début de l'importation des données Non-Cadre.");

        //         // Étape 1 : Récupérer les utilisateurs via l'API externe
        //         var users = await GetUsersFromExternalService();

        //         // Étape 2 : Importer l'évaluation
        //         var evaluation = await ImportEvaluationData(request.EvaluationFile);
        //         if (evaluation.Type != "NonCadre")
        //         {
        //             throw new Exception("Le type d'évaluation doit être NonCadre.");
        //         }

        //         _context.Evaluations.Add(evaluation);
        //         await _context.SaveChangesAsync();

        //         // Étape 3 : Importer les périodes
        //         var fixationData = await ImportPeriodData<IndicateurFo>(request.FixationFile);
        //         var miParcoursIndicatorsData = await ImportPeriodData<IndicateurMp>(request.MiParcoursIndicatorsFile);
        //         var miParcoursCompetenceData = await ImportPeriodData<CompetenceMp>(request.MiParcoursCompetenceFile);
        //         var finaleData = await ImportPeriodData<IndicateurFi>(request.FinaleFile);

        //         // Étape 4 : Préparer les ajouts des données historiques
        //         var userEvaluations = new List<UserEvaluation>();
        //         var historyFoList = new List<HistoryUserIndicatorFO>();
        //         var historyMpList = new List<HistoryUserIndicatorMP>();
        //         var historyCompetenceMpList = new List<HistoryUserCompetenceMP>();
        //         var historyFiList = new List<HistoryUserindicatorFi>();

        //         foreach (var userMatricule in fixationData.Select(d => d.Matricule).Distinct())
        //         {
        //             var user = users.FirstOrDefault(u => u.Matricule == userMatricule);
        //             if (user == null || user.TypeUser != "NonCadre")
        //             {
        //                 // Ignore this iteration if the user is not found or is not "NonCadre"
        //                 continue;
        //             }

        //             var userEvaluation = new UserEvaluation
        //             {
        //                 EvalId = evaluation.EvalId,
        //                 UserId = user.Id
        //             };

        //             userEvaluations.Add(userEvaluation);
        //         }


        //         _context.UserEvaluations.AddRange(userEvaluations);
        //         await _context.SaveChangesAsync();

        //         foreach (var userEval in userEvaluations)
        //         {
        //             var matricule = users.First(u => u.Id == userEval.UserId).Matricule;

        //             // Fixation Objectif
        //             foreach (var data in fixationData.Where(d => d.Matricule == matricule))
        //             {
        //                 var historyFo = new HistoryUserIndicatorFO
        //                 {
        //                     UserEvalId = userEval.UserEvalId,
        //                     Name = data.Name,
        //                     ResultText = data.ResultText,
        //                     Result = data.Result,
        //                     CreatedAt = DateTime.Now
        //                 };
        //                 historyFoList.Add(historyFo);
        //             }

        //             // Mi-Parcours - Indicateurs
        //             foreach (var data in miParcoursIndicatorsData.Where(d => d.Matricule == matricule))
        //             {
        //                 var historyMp = new HistoryUserIndicatorMP
        //                 {
        //                     UserEvalId = userEval.UserEvalId,
        //                     Name = data.Name,
        //                     ResultText = data.ResultText,
        //                     Result = data.Result
        //                 };
        //                 historyMpList.Add(historyMp);
        //             }

        //             // Mi-Parcours - Compétences
        //             foreach (var data in miParcoursCompetenceData.Where(d => d.Matricule == matricule))
        //             {
        //                 var historyCompetenceMp = new HistoryUserCompetenceMP
        //                 {
        //                     UserEvalId = userEval.UserEvalId,
        //                     CompetenceName = data.CompetenceName,
        //                     Performance = data.Performance
        //                 };
        //                 historyCompetenceMpList.Add(historyCompetenceMp);
        //             }

        //             // Finale
        //             foreach (var data in finaleData.Where(d => d.Matricule == matricule))
        //             {
        //                 var historyFi = new HistoryUserindicatorFi
        //                 {
        //                     UserEvalId = userEval.UserEvalId,
        //                     Name = data.Name,
        //                     ResultText = data.ResultText,
        //                     Result = data.Result,
        //                     CreatedAt = DateTime.Now
        //                 };
        //                 historyFiList.Add(historyFi);
        //             }
        //         }

        //         // Ajout en masse des données historiques
        //         _context.HistoryUserIndicatorFOs.AddRange(historyFoList);
        //         _context.HistoryUserIndicatorMPs.AddRange(historyMpList);
        //         _context.HistoryUserCompetenceMPs.AddRange(historyCompetenceMpList);
        //         _context.HistoryUserindicatorFis.AddRange(historyFiList);

        //         // Sauvegarder toutes les modifications
        //         await _context.SaveChangesAsync();

        //         // Étape 5 : Importer les données Help si le fichier est présent
        //         List<Help> helpData = new();
        //         if (request.HelpFile != null)
        //         {
        //             helpData = await ImportHelpData(request.HelpFile);
        //             _context.Helps.AddRange(helpData);
        //             await _context.SaveChangesAsync();
        //         }

        //         // Étape 6 : Importer les données UserHelpContent si le fichier est présent
        //         if (request.UserHelpContentFile != null)
        //         {
        //             if (helpData == null || !helpData.Any())
        //             {
        //                 throw new Exception("Les données Help doivent être importées avant d'importer UserHelpContent.");
        //             }

        //             var userHelpContentData = await ImportUserHelpContentData(request.UserHelpContentFile, helpData, users, evaluation);
        //             _context.UserHelpContents.AddRange(userHelpContentData);
        //             await _context.SaveChangesAsync();

        //             // Optionnel : Ajouter des enregistrements dans HistoryUserHelpContent
        //             var historyUserHelpContentData = userHelpContentData.Select(uhc => new HistoryUserHelpContent
        //             {
        //                 HelpId = uhc.HelpId,
        //                 HelpName = helpData.First(h => h.HelpId == uhc.HelpId).Name,
        //                 ContentId = uhc.ContentId,
        //                 UserEvalId = uhc.UserEvalId,
        //                 WriterUserId = uhc.WriterUserId,
        //                 Content = uhc.Content,
        //                 ArchivedAt = DateTime.UtcNow
        //             }).ToList();

        //             _context.HistoryUserHelpContents.AddRange(historyUserHelpContentData);
        //             await _context.SaveChangesAsync();
        //         }

        //         // Étape 7 : Commit de la transaction
        //         await transaction.CommitAsync();
        //         _logger.LogInformation("Importation des données Non-Cadre réussie.");
        //         return Ok(new { Message = "Données Non-Cadre importées avec succès." });
        //     }
        //     catch (CsvParsingException csvEx)
        //     {
        //         _logger.LogError(csvEx, "Erreur lors de l'importation des données Non-Cadre.");
        //         await transaction.RollbackAsync();

        //         var controllerErrorResponse = new ControllerErrorResponse
        //         {
        //             FileName = csvEx.FileName,
        //             LineNumber = csvEx.LineNumber,
        //             ErrorMessage = csvEx.Message,
        //             Details = csvEx.InnerException?.Message
        //         };

        //         return BadRequest(controllerErrorResponse);
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Erreur lors de l'importation des données Non-Cadre.");
        //         await transaction.RollbackAsync();

        //         var controllerErrorResponse = new ControllerErrorResponse
        //         {
        //             ErrorMessage = ex.Message,
        //             Details = ex.InnerException?.Message
        //         };

        //         return StatusCode(500, controllerErrorResponse);
        //     }
        // }

        // [HttpPost("import-non-cadre-evaluation")]
        // public async Task<IActionResult> ImportNonCadreEvaluation([FromForm] ImportNonCadreEvaluationRequest request)
        // {
        //     if (request.EvaluationFile == null && request.FixationFile == null &&
        //         request.MiParcoursIndicatorsFile == null && request.MiParcoursCompetenceFile == null &&
        //         request.FinaleFile == null)
        //     {
        //         return BadRequest("Au moins un fichier doit être fourni.");
        //     }

        //     int annee = request.Annee;
        //     if (annee == 0)
        //         return BadRequest("L'année doit être spécifiée.");

        //     // Vérification cohérence année fichier évaluation
        //     if (request.EvaluationFile != null)
        //     {
        //         using var reader = new StreamReader(request.EvaluationFile.OpenReadStream());
        //         using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        //         var evalData = csv.GetRecords<EvaluationData>().FirstOrDefault();
        //         if (evalData == null)
        //             return BadRequest("Le fichier d'évaluation est invalide.");
        //         if (evalData.EvalAnnee != annee)
        //             return BadRequest("L'année dans le fichier d'évaluation ne correspond pas à l'année sélectionnée.");
        //     }

        //     var evaluationExists = await _context.Evaluations.AnyAsync(e => e.EvalAnnee == annee && e.Type == "NonCadre");
        //     if (request.FixationFile != null && !evaluationExists)
        //         return BadRequest("Importer d'abord la période d'évaluation avant la fixation des objectifs");

        //     var eval = evaluationExists
        //         ? await _context.Evaluations.FirstAsync(e => e.EvalAnnee == annee && e.Type == "NonCadre")
        //         : null;

        //     var userEvalIds = eval != null
        //         ? await _context.UserEvaluations.Where(u => u.EvalId == eval.EvalId).Select(u => u.UserEvalId).ToListAsync()
        //         : new List<int>();

        //     var fixationExists = userEvalIds.Any() &&
        //                          await _context.HistoryUserIndicatorFOs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
        //     if ((request.MiParcoursIndicatorsFile != null || request.MiParcoursCompetenceFile != null) &&
        //         (!evaluationExists || !fixationExists))
        //         return BadRequest("Importer d'abord la période d'évaluation avant le mi-parcours.");

        //     var miParcoursExists = userEvalIds.Any() &&
        //         (await _context.HistoryUserIndicatorMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId)) ||
        //          await _context.HistoryUserCompetenceMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId)));

        //     if (request.FinaleFile != null &&
        //         (!evaluationExists || !fixationExists || !miParcoursExists))
        //         return BadRequest("Importer d'abord la période d'évaluation avant l'évaluation finale.");

        //     using var transaction = await _context.Database.BeginTransactionAsync();
        //     try
        //     {
        //         var users = new List<UserDTO>();
        //         Evaluation evaluation = null;

        //         // Import EvaluationFile
        //         if (request.EvaluationFile != null)
        //         {
        //             evaluation = await ImportEvaluationData(request.EvaluationFile);
        //             if (evaluation.Type != "NonCadre")
        //                 throw new Exception("Le type d'évaluation doit être NonCadre.");

        //             _context.Evaluations.Add(evaluation);
        //             await _context.SaveChangesAsync();

        //             users = await GetUsersFromExternalService();
        //         }
        //         else if (evaluationExists)
        //         {
        //             evaluation = eval;
        //             users = await GetUsersFromExternalService();
        //         }
        //         else
        //         {
        //             // Si aucun EvaluationFile fourni et pas d'évaluation existante, on ne peut pas importer les autres fichiers
        //             users = new List<UserDTO>();
        //         }

        //         // Import FixationFile
        //         var fixationData = request.FixationFile != null
        //             ? await ImportPeriodData<IndicateurFo>(request.FixationFile)
        //             : new List<IndicateurFo>();

        //         // Import MiParcours Indicators & Competences
        //         var miParcoursIndicatorsData = request.MiParcoursIndicatorsFile != null
        //             ? await ImportPeriodData<IndicateurMp>(request.MiParcoursIndicatorsFile)
        //             : new List<IndicateurMp>();

        //         var miParcoursCompetenceData = request.MiParcoursCompetenceFile != null
        //             ? await ImportPeriodData<CompetenceMp>(request.MiParcoursCompetenceFile)
        //             : new List<CompetenceMp>();

        //         // Import FinaleFile
        //         var finaleData = request.FinaleFile != null
        //             ? await ImportPeriodData<IndicateurFi>(request.FinaleFile)
        //             : new List<IndicateurFi>();

        //         if (evaluation != null)
        //         {
        //             var allMatricules = fixationData.Select(d => d.Matricule)
        //                 .Concat(miParcoursIndicatorsData.Select(d => d.Matricule))
        //                 .Concat(miParcoursCompetenceData.Select(d => d.Matricule))
        //                 .Concat(finaleData.Select(d => d.Matricule))
        //                 .Distinct();

        //             var userEvaluations = new List<UserEvaluation>();

        //             foreach (var matricule in allMatricules)
        //             {
        //                 var user = users.FirstOrDefault(u => u.Matricule == matricule && u.TypeUser == "NonCadre");
        //                 if (user == null) continue;

        //                 var userEvaluation = await _context.UserEvaluations
        //                     .FirstOrDefaultAsync(ue => ue.EvalId == evaluation.EvalId && ue.UserId == user.Id);

        //                 if (userEvaluation == null)
        //                 {
        //                     userEvaluation = new UserEvaluation
        //                     {
        //                         EvalId = evaluation.EvalId,
        //                         UserId = user.Id
        //                     };
        //                     _context.UserEvaluations.Add(userEvaluation);
        //                     await _context.SaveChangesAsync();
        //                 }
        //                 userEvaluations.Add(userEvaluation);
        //             }

        //             var historyFoList = new List<HistoryUserIndicatorFO>();
        //             var historyMpList = new List<HistoryUserIndicatorMP>();
        //             var historyCompetenceMpList = new List<HistoryUserCompetenceMP>();
        //             var historyFiList = new List<HistoryUserindicatorFi>();

        //             foreach (var userEval in userEvaluations)
        //             {
        //                 var matricule = users.First(u => u.Id == userEval.UserId).Matricule;

        //                 foreach (var data in fixationData.Where(d => d.Matricule == matricule))
        //                 {
        //                     historyFoList.Add(new HistoryUserIndicatorFO
        //                     {
        //                         UserEvalId = userEval.UserEvalId,
        //                         Name = data.Name,
        //                         ResultText = data.ResultText,
        //                         Result = data.Result,
        //                         CreatedAt = DateTime.Now
        //                     });
        //                 }

        //                 foreach (var data in miParcoursIndicatorsData.Where(d => d.Matricule == matricule))
        //                 {
        //                     historyMpList.Add(new HistoryUserIndicatorMP
        //                     {
        //                         UserEvalId = userEval.UserEvalId,
        //                         Name = data.Name,
        //                         ResultText = data.ResultText,
        //                         Result = data.Result
        //                     });
        //                 }

        //                 foreach (var data in miParcoursCompetenceData.Where(d => d.Matricule == matricule))
        //                 {
        //                     historyCompetenceMpList.Add(new HistoryUserCompetenceMP
        //                     {
        //                         UserEvalId = userEval.UserEvalId,
        //                         CompetenceName = data.CompetenceName,
        //                         Performance = data.Performance
        //                     });
        //                 }

        //                 foreach (var data in finaleData.Where(d => d.Matricule == matricule))
        //                 {
        //                     historyFiList.Add(new HistoryUserindicatorFi
        //                     {
        //                         UserEvalId = userEval.UserEvalId,
        //                         Name = data.Name,
        //                         ResultText = data.ResultText,
        //                         Result = data.Result,
        //                         CreatedAt = DateTime.Now
        //                     });
        //                 }
        //             }

        //             _context.HistoryUserIndicatorFOs.AddRange(historyFoList);
        //             _context.HistoryUserIndicatorMPs.AddRange(historyMpList);
        //             _context.HistoryUserCompetenceMPs.AddRange(historyCompetenceMpList);
        //             _context.HistoryUserindicatorFis.AddRange(historyFiList);

        //             await _context.SaveChangesAsync();
        //         }

        //         await transaction.CommitAsync();
        //         return Ok(new { Message = "Importation Non-Cadre réussie." });
        //     }
        //     catch (CsvParsingException csvEx)
        //     {
        //         await transaction.RollbackAsync();

        //         return BadRequest(new ControllerErrorResponse
        //         {
        //             FileName = csvEx.FileName,
        //             LineNumber = csvEx.LineNumber,
        //             ErrorMessage = csvEx.Message,
        //             Details = csvEx.InnerException?.Message
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         await transaction.RollbackAsync();

        //         return StatusCode(500, new ControllerErrorResponse
        //         {
        //             ErrorMessage = ex.Message,
        //             Details = ex.InnerException?.Message
        //         });
        //     }
        // }

        [HttpPost("import-non-cadre-evaluation")]
        public async Task<IActionResult> ImportNonCadreEvaluation([FromForm] ImportNonCadreEvaluationRequest request)
        {
            if (request.EvaluationFile == null && request.FixationFile == null &&
                request.MiParcoursIndicatorsFile == null && request.MiParcoursCompetenceFile == null &&
                request.FinaleFile == null)
            {
                return BadRequest("Au moins un fichier doit être fourni.");
            }

            int annee = request.Annee;
            if (annee == 0)
                return BadRequest("L'année doit être spécifiée.");

            // Vérification cohérence année fichier évaluation
            if (request.EvaluationFile != null)
            {
                try
                {
                    using var reader = new StreamReader(request.EvaluationFile.OpenReadStream());
                    using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
                    var evalData = csv.GetRecords<EvaluationData>().FirstOrDefault();
                    if (evalData == null)
                        return BadRequest("Le fichier d'évaluation est invalide.");
                    if (evalData.EvalAnnee != annee)
                        return BadRequest("L'année dans le fichier d'évaluation ne correspond pas à l'année sélectionnée.");
                }
                catch (HeaderValidationException)
                {
                    return BadRequest("Les colonnes du fichier d'évaluation ne correspondent pas au format attendu.");
                }
                catch (Exception)
                {
                    return BadRequest("Erreur lors de la lecture du fichier d'évaluation.");
                }
            }

            var evaluationExists = await _context.Evaluations.AnyAsync(e => e.EvalAnnee == annee && e.Type == "NonCadre");
            if (request.FixationFile != null && !evaluationExists)
                return BadRequest("Importer d'abord la période d'évaluation avant la fixation des objectifs");

            var eval = evaluationExists
                ? await _context.Evaluations.FirstAsync(e => e.EvalAnnee == annee && e.Type == "NonCadre")
                : null;

            var userEvalIds = eval != null
                ? await _context.UserEvaluations.Where(u => u.EvalId == eval.EvalId).Select(u => u.UserEvalId).ToListAsync()
                : new List<int>();

            var fixationExists = userEvalIds.Any() &&
                                 await _context.HistoryUserIndicatorFOs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            if ((request.MiParcoursIndicatorsFile != null || request.MiParcoursCompetenceFile != null) &&
                (!evaluationExists || !fixationExists))
                return BadRequest("Importer d'abord la période d'évaluation avant le mi-parcours.");

            var miParcoursExists = userEvalIds.Any() &&
                (await _context.HistoryUserIndicatorMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId)) ||
                 await _context.HistoryUserCompetenceMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId)));

            if (request.FinaleFile != null &&
                (!evaluationExists || !fixationExists || !miParcoursExists))
                return BadRequest("Importer d'abord la période d'évaluation avant l'évaluation finale.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var users = new List<UserDTO>();
                Evaluation evaluation = null;

                // Import EvaluationFile
                if (request.EvaluationFile != null)
                {
                    evaluation = await ImportEvaluationData(request.EvaluationFile);
                    if (evaluation.Type != "NonCadre")
                        throw new Exception("Le type d'évaluation doit être NonCadre.");

                    _context.Evaluations.Add(evaluation);
                    await _context.SaveChangesAsync();

                    users = await GetUsersFromExternalService();
                }
                else if (evaluationExists)
                {
                    evaluation = eval;
                    users = await GetUsersFromExternalService();
                }
                else
                {
                    users = new List<UserDTO>();
                }

                // Import FixationFile
                List<IndicateurFo> fixationData = new();
                if (request.FixationFile != null)
                {
                    try
                    {
                        fixationData = await ImportPeriodData<IndicateurFo>(request.FixationFile);
                    }
                    catch (HeaderValidationException)
                    {
                        return BadRequest("Les colonnes du fichier de fixation ne correspondent pas au format attendu.");
                    }
                    catch (Exception)
                    {
                        return BadRequest("Erreur lors de la lecture du fichier de fixation.");
                    }
                }

                // Mi-Parcours
                List<IndicateurMp> miParcoursIndicatorsData = new();
                if (request.MiParcoursIndicatorsFile != null)
                {
                    try
                    {
                        miParcoursIndicatorsData = await ImportPeriodData<IndicateurMp>(request.MiParcoursIndicatorsFile);
                    }
                    catch (HeaderValidationException)
                    {
                        return BadRequest("Les colonnes du fichier d’indicateurs mi-parcours ne correspondent pas au format attendu.");
                    }
                    catch (Exception)
                    {
                        return BadRequest("Erreur lors de la lecture du fichier d’indicateurs mi-parcours.");
                    }
                }

                List<CompetenceMp> miParcoursCompetenceData = new();
                if (request.MiParcoursCompetenceFile != null)
                {
                    try
                    {
                        miParcoursCompetenceData = await ImportPeriodData<CompetenceMp>(request.MiParcoursCompetenceFile);
                    }
                    catch (HeaderValidationException)
                    {
                        return BadRequest("Les colonnes du fichier de compétences mi-parcours ne correspondent pas au format attendu.");
                    }
                    catch (Exception)
                    {
                        return BadRequest("Erreur lors de la lecture du fichier de compétences mi-parcours.");
                    }
                }

                // Finale
                List<IndicateurFi> finaleData = new();
                if (request.FinaleFile != null)
                {
                    try
                    {
                        finaleData = await ImportPeriodData<IndicateurFi>(request.FinaleFile);
                    }
                    catch (HeaderValidationException)
                    {
                        return BadRequest("Les colonnes du fichier d’évaluation finale ne correspondent pas au format attendu.");
                    }
                    catch (Exception)
                    {
                        return BadRequest("Erreur lors de la lecture du fichier d’évaluation finale.");
                    }
                }

                if (evaluation != null)
                {
                    var allMatricules = fixationData.Select(d => d.Matricule)
                        .Concat(miParcoursIndicatorsData.Select(d => d.Matricule))
                        .Concat(miParcoursCompetenceData.Select(d => d.Matricule))
                        .Concat(finaleData.Select(d => d.Matricule))
                        .Distinct();

                    var userEvaluations = new List<UserEvaluation>();

                    foreach (var matricule in allMatricules)
                    {
                        var user = users.FirstOrDefault(u => u.Matricule == matricule && u.TypeUser == "NonCadre");
                        if (user == null) continue;

                        var userEvaluation = await _context.UserEvaluations
                            .FirstOrDefaultAsync(ue => ue.EvalId == evaluation.EvalId && ue.UserId == user.Id);

                        if (userEvaluation == null)
                        {
                            userEvaluation = new UserEvaluation
                            {
                                EvalId = evaluation.EvalId,
                                UserId = user.Id
                            };
                            _context.UserEvaluations.Add(userEvaluation);
                            await _context.SaveChangesAsync();
                        }
                        userEvaluations.Add(userEvaluation);
                    }

                    var historyFoList = new List<HistoryUserIndicatorFO>();
                    var historyMpList = new List<HistoryUserIndicatorMP>();
                    var historyCompetenceMpList = new List<HistoryUserCompetenceMP>();
                    var historyFiList = new List<HistoryUserindicatorFi>();

                    foreach (var userEval in userEvaluations)
                    {
                        var matricule = users.First(u => u.Id == userEval.UserId).Matricule;

                        foreach (var data in fixationData.Where(d => d.Matricule == matricule))
                        {
                            historyFoList.Add(new HistoryUserIndicatorFO
                            {
                                UserEvalId = userEval.UserEvalId,
                                Name = data.Name,
                                ResultText = data.ResultText,
                                Result = data.Result,
                                CreatedAt = DateTime.Now
                            });
                        }

                        foreach (var data in miParcoursIndicatorsData.Where(d => d.Matricule == matricule))
                        {
                            historyMpList.Add(new HistoryUserIndicatorMP
                            {
                                UserEvalId = userEval.UserEvalId,
                                Name = data.Name,
                                ResultText = data.ResultText,
                                Result = data.Result
                            });
                        }

                        foreach (var data in miParcoursCompetenceData.Where(d => d.Matricule == matricule))
                        {
                            historyCompetenceMpList.Add(new HistoryUserCompetenceMP
                            {
                                UserEvalId = userEval.UserEvalId,
                                CompetenceName = data.CompetenceName,
                                Performance = data.Performance
                            });
                        }

                        foreach (var data in finaleData.Where(d => d.Matricule == matricule))
                        {
                            historyFiList.Add(new HistoryUserindicatorFi
                            {
                                UserEvalId = userEval.UserEvalId,
                                Name = data.Name,
                                ResultText = data.ResultText,
                                Result = data.Result,
                                CreatedAt = DateTime.Now
                            });
                        }
                    }

                    _context.HistoryUserIndicatorFOs.AddRange(historyFoList);
                    _context.HistoryUserIndicatorMPs.AddRange(historyMpList);
                    _context.HistoryUserCompetenceMPs.AddRange(historyCompetenceMpList);
                    _context.HistoryUserindicatorFis.AddRange(historyFiList);

                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();
                return Ok(new { Message = "Importation Non-Cadre réussie." });
            }
            catch (CsvParsingException csvEx)
            {
                await transaction.RollbackAsync();

                return BadRequest(new ControllerErrorResponse
                {
                    FileName = csvEx.FileName,
                    LineNumber = csvEx.LineNumber,
                    ErrorMessage = csvEx.Message,
                    Details = csvEx.InnerException?.Message
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

                return StatusCode(500, new ControllerErrorResponse
                {
                    ErrorMessage = ex.Message,
                    Details = ex.InnerException?.Message
                });
            }
        }



        private async Task<Evaluation> ImportEvaluationData(IFormFile evaluationFile)
        {
            using var reader = new StreamReader(evaluationFile.OpenReadStream());
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            var evaluationData = csv.GetRecords<EvaluationData>().FirstOrDefault();
            if (evaluationData == null)
                throw new CsvParsingException(evaluationFile.FileName, null, "Aucune donnée d'évaluation trouvée.");

            var userEvaluationWeight = await _context.UserEvaluationWeights
                .FirstOrDefaultAsync(uwe => uwe.TemplateId == evaluationData.TemplateId);

            if (userEvaluationWeight == null)
                throw new Exception($"Aucun poids trouvé pour le TemplateId : {evaluationData.TemplateId}");

            return new Evaluation
            {
                EvalAnnee = evaluationData.EvalAnnee,
                FixationObjectif = evaluationData.FixationObjectif,
                MiParcours = evaluationData.MiParcours,
                Final = evaluationData.Finale,
                EtatId = evaluationData.EtatId,
                TemplateId = evaluationData.TemplateId,
                Titre = evaluationData.Titre,
                Type = evaluationData.Type,
                CompetenceWeightTotal = userEvaluationWeight.CompetenceWeightTotal,
                IndicatorWeightTotal = userEvaluationWeight.IndicatorWeightTotal
            };
        }

        private async Task<List<T>> ImportPeriodData<T>(IFormFile file) where T : class
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null, // Ignore les en-têtes manquants
                MissingFieldFound = null // Ignore les champs manquants
            };
            using var csv = new CsvReader(reader, config);

            // Appliquer le mapping personnalisé si défini
            if (typeof(T) == typeof(CompetenceMp))
            {
                csv.Context.RegisterClassMap<CompetenceMpMap>();
            }
            else if (typeof(T) == typeof(IndicateurFo))
            {
                csv.Context.RegisterClassMap<IndicateurFoMap>();
            }
            else if (typeof(T) == typeof(IndicateurMp))
            {
                csv.Context.RegisterClassMap<IndicateurMpMap>();
            }
            else if (typeof(T) == typeof(IndicateurFi))
            {
                csv.Context.RegisterClassMap<IndicateurFiMap>();
            }
            // Ajoutez d'autres mappings si nécessaire

            var records = new List<T>();
            int lineNumber = 1;

            while (await csv.ReadAsync())
            {
                var rawRecord = csv.Parser.Record;
                if (rawRecord == null || rawRecord.All(string.IsNullOrWhiteSpace))
                {
                    _logger.LogWarning($"Skipping empty record at line {lineNumber} in file {file.FileName}.");
                    lineNumber++;
                    continue;
                }

                try
                {
                    var record = csv.GetRecord<T>();
                    records.Add(record);
                }
                catch (Exception ex)
                {
                    throw new CsvParsingException(file.FileName, lineNumber, $"Erreur lors de l'analyse de l'enregistrement : {ex.Message}");
                }

                lineNumber++;
            }

            return records;
        }

        private async Task<List<Help>> ImportHelpData(IFormFile helpFile)
        {
            using var reader = new StreamReader(helpFile.OpenReadStream());
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            var records = new List<Help>();
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null
            };
            csv.Context.RegisterClassMap<HelpMap>();

            int lineNumber = 1;

            try
            {
                while (await csv.ReadAsync())
                {
                    try
                    {
                        var record = csv.GetRecord<Help>();
                        records.Add(record);
                    }
                    catch (Exception ex)
                    {
                        throw new CsvParsingException(helpFile.FileName, lineNumber, $"Erreur lors de l'analyse de l'enregistrement dans le fichier Help : {ex.Message}");
                    }
                    lineNumber++;
                }
            }
            catch (CsvParsingException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new CsvParsingException(helpFile.FileName, lineNumber, $"Erreur lors de l'analyse du fichier Help : {ex.Message}");
            }

            // Validation ou transformation supplémentaire si nécessaire

            return records;
        }

        private async Task<List<UserHelpContent>> ImportUserHelpContentData(IFormFile userHelpContentFile, List<Help> helpData, List<UserDTO> users, Evaluation evaluation)
        {
            using var reader = new StreamReader(userHelpContentFile.OpenReadStream());
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            var records = new List<UserHelpContent>();
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null
            };
            csv.Context.RegisterClassMap<UserHelpContentMap>();

            int lineNumber = 1;

            try
            {
                while (await csv.ReadAsync())
                {
                    try
                    {
                        var raw = csv.GetRecord<UserHelpContentCsv>();

                        // Trouver l'utilisateur basé sur le Matricule
                        var user = users.FirstOrDefault(u => u.Matricule == raw.Matricule);
                        if (user == null)
                            throw new CsvParsingException(userHelpContentFile.FileName, lineNumber, $"Utilisateur non trouvé pour le matricule : {raw.Matricule}");

                        // Trouver l'évaluation correspondante
                        var userEval = await _context.UserEvaluations
                            .Include(ue => ue.Evaluation) // Inclure l'évaluation pour accéder à EvalAnnee
                            .FirstOrDefaultAsync(ue => ue.UserId == user.Id && ue.Evaluation.EvalAnnee == raw.Année);
                        if (userEval == null)
                            throw new CsvParsingException(userHelpContentFile.FileName, lineNumber, $"Évaluation non trouvée pour l'utilisateur : {raw.Matricule} et l'année : {raw.Année}");

                        // Trouver le HelpId basé sur le nom
                        var help = helpData.FirstOrDefault(h => h.Name.Equals(raw.Help, StringComparison.OrdinalIgnoreCase));
                        if (help == null)
                            throw new CsvParsingException(userHelpContentFile.FileName, lineNumber, $"Help non trouvé pour le nom : {raw.Help}");

                        var userHelpContent = new UserHelpContent
                        {
                            UserEvalId = userEval.UserEvalId,
                            HelpId = help.HelpId,
                            WriterUserId = raw.Writer,
                            Content = raw.Content
                        };

                        records.Add(userHelpContent);
                    }
                    catch (CsvParsingException)
                    {
                        throw;
                    }
                    catch (Exception ex)
                    {
                        throw new CsvParsingException(userHelpContentFile.FileName, lineNumber, $"Erreur lors de l'analyse de l'enregistrement dans le fichier UserHelpContent : {ex.Message}");
                    }

                    lineNumber++;
                }
            }
            catch (CsvParsingException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new CsvParsingException(userHelpContentFile.FileName, lineNumber, $"Erreur lors de l'analyse du fichier UserHelpContent : {ex.Message}");
            }

            return records;
        }

        [HttpGet("import-status")]
        public async Task<IActionResult> GetImportStatus([FromQuery] int annee)
        {
            var evaluation = await _context.Evaluations.FirstOrDefaultAsync(e => e.EvalAnnee == annee && e.Type == "NonCadre");

            if (evaluation == null)
            {
                return Ok(new
                {
                    Evaluation = false,
                    Fixation = false,
                    MiParcoursIndicators = false,
                    MiParcoursCompetence = false,
                    Finale = false
                });
            }

            var userEvalIds = await _context.UserEvaluations
                .Where(ue => ue.EvalId == evaluation.EvalId)
                .Select(ue => ue.UserEvalId)
                .ToListAsync();

            bool hasFixation = await _context.HistoryUserIndicatorFOs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasMiParcoursIndicators = await _context.HistoryUserIndicatorMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasMiParcoursCompetence = await _context.HistoryUserCompetenceMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasFinale = await _context.HistoryUserindicatorFis.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));

            return Ok(new
            {
                Evaluation = true,
                Fixation = hasFixation,
                MiParcoursIndicators = hasMiParcoursIndicators,
                MiParcoursCompetence = hasMiParcoursCompetence,
                Finale = hasFinale
            });
        }


        // Classes de mapping pour CsvHelper
        public class CompetenceMpMap : ClassMap<CompetenceMp>
        {
            public CompetenceMpMap()
            {
                Map(m => m.Matricule).Name("Matricule");
                Map(m => m.Année).Name("Année");
                Map(m => m.CompetenceName).Name("CompetenceName");
                Map(m => m.Performance).Name("Performance");
            }
        }

        public class IndicateurFoMap : ClassMap<IndicateurFo>
        {
            public IndicateurFoMap()
            {
                Map(m => m.Matricule).Name("Matricule");
                Map(m => m.Année).Name("Année");
                Map(m => m.Name).Name("Name");
                Map(m => m.ResultText).Name("ResultText");
                Map(m => m.Result).Name("Result");
            }
        }

        public class IndicateurMpMap : ClassMap<IndicateurMp>
        {
            public IndicateurMpMap()
            {
                Map(m => m.Matricule).Name("Matricule");
                Map(m => m.Année).Name("Année");
                Map(m => m.Name).Name("Name");
                Map(m => m.ResultText).Name("ResultText");
                Map(m => m.Result).Name("Result");
            }
        }

        public class IndicateurFiMap : ClassMap<IndicateurFi>
        {
            public IndicateurFiMap()
            {
                Map(m => m.Matricule).Name("Matricule");
                Map(m => m.Année).Name("Année");
                Map(m => m.Name).Name("Name");
                Map(m => m.ResultText).Name("ResultText");
                Map(m => m.Result).Name("Result");
            }
        }

        public class HelpMap : ClassMap<Help>
        {
            public HelpMap()
            {
                Map(m => m.Name).Name("Name");
                Map(m => m.TemplateId).Name("TemplateId");
                Map(m => m.IsActive).Name("IsActive");
                Map(m => m.AllowedUserLevel).Name("AllowedUserLevel");
            }
        }

        public class UserHelpContentCsv
        {
            public string Matricule { get; set; }
            public int Année { get; set; }
            public string Help { get; set; }
            public string Writer { get; set; }
            public string Content { get; set; }
        }

        public class UserHelpContentMap : ClassMap<UserHelpContentCsv>
        {
            public UserHelpContentMap()
            {
                Map(m => m.Matricule).Name("Matricule");
                Map(m => m.Année).Name("Année");
                Map(m => m.Help).Name("Help");
                Map(m => m.Writer).Name("Writer");
                Map(m => m.Content).Name("Content");
            }
        }

        // Classe de requête d'importation
        public class ImportNonCadreEvaluationRequest
        {
            public int Annee { get; set; }
            public IFormFile? EvaluationFile { get; set; }
            public IFormFile? FixationFile { get; set; }
            public IFormFile? MiParcoursIndicatorsFile { get; set; }
            public IFormFile? MiParcoursCompetenceFile { get; set; }
            public IFormFile? FinaleFile { get; set; }

            // Rendre les fichiers Help et UserHelpContent optionnels
            public IFormFile? HelpFile { get; set; }
            public IFormFile? UserHelpContentFile { get; set; }
        }

        // Classes de données
        public class PeriodDataNonCadre
        {
            public string Matricule { get; set; }
            public int Année { get; set; }
            public string Name { get; set; }
            public string ResultText { get; set; }
            public decimal Result { get; set; }
        }

        public class IndicateurFo : PeriodDataNonCadre { }
        public class IndicateurMp : PeriodDataNonCadre { }
        public class IndicateurFi : PeriodDataNonCadre { }

        public class CompetenceMp
        {
            public string Matricule { get; set; }
            public int Année { get; set; }
            public string CompetenceName { get; set; }
            public decimal Performance { get; set; }
        }
    }

    // Classe de réponse d'erreur
    public class ControllerErrorResponse
    {
        public string? FileName { get; set; }
        public int? LineNumber { get; set; }
        public string? ErrorMessage { get; set; }
        public string? Details { get; set; }
    }

    // Exception personnalisée pour les erreurs de parsing CSV
    public class CsvParsingException : Exception
    {
        public string FileName { get; }
        public int? LineNumber { get; }

        public CsvParsingException(string fileName, int? lineNumber, string message)
            : base(message)
        {
            FileName = fileName;
            LineNumber = lineNumber;
        }
    }
}

