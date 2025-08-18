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
            _logger.LogInformation("Fetching users from external service.");
            var response = await _httpClient.GetAsync("/api/User/user");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to fetch users: StatusCode={StatusCode}", response.StatusCode);
                throw new Exception($"Failed to fetch users: {response.StatusCode}");
            }

            var content = await response.Content.ReadAsStringAsync();
            var users = JsonConvert.DeserializeObject<List<UserDTO>>(content);
            _logger.LogInformation("Successfully fetched {UserCount} users from external service.", users?.Count ?? 0);
            return users;
        }
        
        [HttpPost("import-non-cadre-evaluation")]
        public async Task<IActionResult> ImportNonCadreEvaluation([FromForm] ImportNonCadreEvaluationRequest request)
        {
            _logger.LogInformation("Starting import of non-cadre evaluation for year {Year}.", request.Annee);

            if (request.EvaluationFile == null && request.FixationFile == null &&
                request.MiParcoursIndicatorsFile == null && request.MiParcoursCompetenceFile == null &&
                request.FinaleFile == null && request.HelpFile == null && request.UserHelpContentFile == null)
            {
                _logger.LogWarning("No files provided for import.");
                return BadRequest("Au moins un fichier doit être fourni.");
            }

            int annee = request.Annee;
            if (annee == 0)
            {
                _logger.LogWarning("Year not specified.");
                return BadRequest("L'année doit être spécifiée.");
            }

            // Vérification cohérence année fichier évaluation
            if (request.EvaluationFile != null)
            {
                _logger.LogInformation("Validating evaluation file for year {Year}.", annee);
                try
                {
                    using var reader = new StreamReader(request.EvaluationFile.OpenReadStream());
                    using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
                    var evalData = csv.GetRecords<EvaluationData>().FirstOrDefault();
                    if (evalData == null)
                    {
                        _logger.LogError("Evaluation file is invalid or empty.");
                        return BadRequest("Le fichier d'évaluation est invalide.");
                    }
                    if (evalData.EvalAnnee != annee)
                    {
                        _logger.LogError("Year in evaluation file ({FileYear}) does not match selected year ({SelectedYear}).", evalData.EvalAnnee, annee);
                        return BadRequest("L'année dans le fichier d'évaluation ne correspond pas à l'année sélectionnée.");
                    }
                }
                catch (HeaderValidationException ex)
                {
                    _logger.LogError(ex, "Invalid columns in evaluation file.");
                    return BadRequest("Les colonnes du fichier d'évaluation ne correspondent pas au format attendu.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error reading evaluation file.");
                    return BadRequest("Erreur lors de la lecture du fichier d'évaluation.");
                }
            }

            var evaluationExists = await _context.Evaluations.AnyAsync(e => e.EvalAnnee == annee && e.Type == "NonCadre");
            _logger.LogInformation("Evaluation exists for year {Year} and type NonCadre: {Exists}.", annee, evaluationExists);
            if (request.FixationFile != null && !evaluationExists)
            {
                _logger.LogWarning("Attempted to import fixation file without existing evaluation for year {Year}.", annee);
                return BadRequest("Importer d'abord la période d'évaluation avant la fixation des objectifs");
            }

            var eval = evaluationExists
                ? await _context.Evaluations.FirstAsync(e => e.EvalAnnee == annee && e.Type == "NonCadre")
                : null;

            var userEvalIds = eval != null
                ? await _context.UserEvaluations.Where(u => u.EvalId == eval.EvalId).Select(u => u.UserEvalId).ToListAsync()
                : new List<int>();
            _logger.LogInformation("Found {UserEvalCount} user evaluations for evaluation ID {EvalId}.", userEvalIds.Count, eval?.EvalId);

            var fixationExists = userEvalIds.Any() &&
                                await _context.HistoryUserIndicatorFOs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            _logger.LogInformation("Fixation exists for user evaluations: {Exists}.", fixationExists);
            if ((request.MiParcoursIndicatorsFile != null || request.MiParcoursCompetenceFile != null) &&
                (!evaluationExists || !fixationExists))
            {
                _logger.LogWarning("Attempted to import mi-parcours file without evaluation or fixation for year {Year}.", annee);
                return BadRequest("Importer d'abord la période d'évaluation et fixation avant le mi-parcours.");
            }

            var miParcoursExists = userEvalIds.Any() &&
                (await _context.HistoryUserIndicatorMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId)) ||
                await _context.HistoryUserCompetenceMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId)));
            _logger.LogInformation("Mi-parcours exists for user evaluations: {Exists}.", miParcoursExists);

            if (request.FinaleFile != null &&
                (!evaluationExists || !fixationExists || !miParcoursExists))
            {
                _logger.LogWarning("Attempted to import finale file without evaluation, fixation, or mi-parcours for year {Year}.", annee);
                return BadRequest("Importer d'abord la période d'évaluation avant l'évaluation finale.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var users = new List<UserDTO>();
                Evaluation evaluation = null;

                // Import EvaluationFile
                if (request.EvaluationFile != null)
                {
                    _logger.LogInformation("Importing evaluation file.");
                    evaluation = await ImportEvaluationData(request.EvaluationFile);
                    if (evaluation.Type != "NonCadre")
                    {
                        _logger.LogError("Evaluation type is not NonCadre: {Type}.", evaluation.Type);
                        throw new Exception("Le type d'évaluation doit être NonCadre.");
                    }

                    _context.Evaluations.Add(evaluation);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Evaluation saved with ID {EvalId}.", evaluation.EvalId);
                    users = await GetUsersFromExternalService();
                }
                else if (evaluationExists)
                {
                    evaluation = eval;
                    users = await GetUsersFromExternalService();
                    _logger.LogInformation("Using existing evaluation with ID {EvalId}.", evaluation.EvalId);
                }
                else
                {
                    users = new List<UserDTO>();
                    _logger.LogWarning("No evaluation file provided and no existing evaluation found.");
                }

                // Import HelpFile  //MODIF HENINTSOA
                List<Help> helpData = new();
                if (request.HelpFile != null)
                {
                    _logger.LogInformation("Importing help file: {FileName}.", request.HelpFile.FileName);
                    try
                    {
                        helpData = await ImportHelpData(request.HelpFile);
                        _logger.LogInformation("Successfully imported {RecordCount} help records.", helpData.Count);
                        
                        // Save help data to database
                        _context.Helps.AddRange(helpData);
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Successfully saved {RecordCount} help records to database.", helpData.Count);
                    }
                    catch (HeaderValidationException ex)
                    {
                        _logger.LogError(ex, "Invalid columns in help file: {FileName}.", request.HelpFile.FileName);
                        return BadRequest("Les colonnes du fichier d'aide ne correspondent pas au format attendu.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error reading help file: {FileName}.", request.HelpFile.FileName);
                        return BadRequest("Erreur lors de la lecture du fichier d'aide.");
                    }
                }
                else
                {
                    _logger.LogInformation("No help file provided.");
                }

                // Import UserHelpContentFile  //MODIF HENINTSOA
                List<UserHelpContent> userHelpContentData = new();
                if (request.UserHelpContentFile != null)
                {
                    if (evaluation == null)
                    {
                        _logger.LogError("Cannot import user help content without evaluation.");
                        return BadRequest("Une évaluation doit exister pour importer le contenu d'aide utilisateur.");
                    }

                    if (users == null || !users.Any())
                    {
                        users = await GetUsersFromExternalService();
                    }

                    _logger.LogInformation("Importing user help content file: {FileName}.", request.UserHelpContentFile.FileName);
                    try
                    {
                        userHelpContentData = await ImportUserHelpContentData(request.UserHelpContentFile, helpData, users, evaluation);
                        _logger.LogInformation("Successfully imported {RecordCount} user help content records.", userHelpContentData.Count);
                        
                        // Save user help content data to database
                        _context.UserHelpContents.AddRange(userHelpContentData);
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Successfully saved {RecordCount} user help content records to database.", userHelpContentData.Count);
                    }
                    catch (HeaderValidationException ex)
                    {
                        _logger.LogError(ex, "Invalid columns in user help content file: {FileName}.", request.UserHelpContentFile.FileName);
                        return BadRequest("Les colonnes du fichier de contenu d'aide utilisateur ne correspondent pas au format attendu.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error reading user help content file: {FileName}.", request.UserHelpContentFile.FileName);
                        return BadRequest("Erreur lors de la lecture du fichier de contenu d'aide utilisateur.");
                    }
                }
                else
                {
                    _logger.LogInformation("No user help content file provided.");
                }

                // Import FixationFile
                List<IndicateurFo> fixationData = new();
                if (request.FixationFile != null)
                {
                    _logger.LogInformation("Importing fixation file: {FileName}.", request.FixationFile.FileName);
                    try
                    {
                        fixationData = await ImportPeriodData<IndicateurFo>(request.FixationFile);
                        _logger.LogInformation("Successfully imported {RecordCount} fixation records.", fixationData.Count);
                    }
                    catch (HeaderValidationException ex)
                    {
                        _logger.LogError(ex, "Invalid columns in fixation file: {FileName}.", request.FixationFile.FileName);
                        return BadRequest("Les colonnes du fichier de fixation ne correspondent pas au format attendu.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error reading fixation file: {FileName}.", request.FixationFile.FileName);
                        return BadRequest("Erreur lors de la lecture du fichier de fixation.");
                    }
                }
                else
                {
                    _logger.LogInformation("No fixation file provided.");
                }

                // Mi-Parcours
                List<IndicateurMp> miParcoursIndicatorsData = new();
                if (request.MiParcoursIndicatorsFile != null)
                {
                    _logger.LogInformation("Importing mi-parcours indicators file: {FileName}.", request.MiParcoursIndicatorsFile.FileName);
                    try
                    {
                        miParcoursIndicatorsData = await ImportPeriodData<IndicateurMp>(request.MiParcoursIndicatorsFile);
                        _logger.LogInformation("Successfully imported {RecordCount} mi-parcours indicators records.", miParcoursIndicatorsData.Count);
                    }
                    catch (HeaderValidationException ex)
                    {
                        _logger.LogError(ex, "Invalid columns in mi-parcours indicators file: {FileName}.", request.MiParcoursIndicatorsFile.FileName);
                        return BadRequest("Les colonnes du fichier d'indicateurs mi-parcours ne correspondent pas au format attendu.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error reading mi-parcours indicators file: {FileName}.", request.MiParcoursIndicatorsFile.FileName);
                        return BadRequest("Erreur lors de la lecture du fichier d'indicateurs mi-parcours.");
                    }
                }

                List<CompetenceMp> miParcoursCompetenceData = new();
                if (request.MiParcoursCompetenceFile != null)
                {
                    _logger.LogInformation("Importing mi-parcours competence file: {FileName}.", request.MiParcoursCompetenceFile.FileName);
                    try
                    {
                        miParcoursCompetenceData = await ImportPeriodData<CompetenceMp>(request.MiParcoursCompetenceFile);
                        _logger.LogInformation("Successfully imported {RecordCount} mi-parcours competence records.", miParcoursCompetenceData.Count);
                    }
                    catch (HeaderValidationException ex)
                    {
                        _logger.LogError(ex, "Invalid columns in mi-parcours competence file: {FileName}.", request.MiParcoursCompetenceFile.FileName);
                        return BadRequest("Les colonnes du fichier de compétences mi-parcours ne correspondent pas au format attendu.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error reading mi-parcours competence file: {FileName}.", request.MiParcoursCompetenceFile.FileName);
                        return BadRequest("Erreur lors de la lecture du fichier de compétences mi-parcours.");
                    }
                }

                // Finale
                List<IndicateurFi> finaleData = new();
                if (request.FinaleFile != null)
                {
                    _logger.LogInformation("Importing finale file: {FileName}.", request.FinaleFile.FileName);
                    try
                    {
                        finaleData = await ImportPeriodData<IndicateurFi>(request.FinaleFile);
                        _logger.LogInformation("Successfully imported {RecordCount} finale records.", finaleData.Count);
                    }
                    catch (HeaderValidationException ex)
                    {
                        _logger.LogError(ex, "Invalid columns in finale file: {FileName}.", request.FinaleFile.FileName);
                        return BadRequest("Les colonnes du fichier d'évaluation finale ne correspondent pas au format attendu.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error reading finale file: {FileName}.", request.FinaleFile.FileName);
                        return BadRequest("Erreur lors de la lecture du fichier d'évaluation finale.");
                    }
                }

                if (evaluation != null)
                {
                    var allMatricules = fixationData.Select(d => d.Matricule)
                        .Concat(miParcoursIndicatorsData.Select(d => d.Matricule))
                        .Concat(miParcoursCompetenceData.Select(d => d.Matricule))
                        .Concat(finaleData.Select(d => d.Matricule))
                        .Distinct()
                        .ToList();
                    _logger.LogInformation("Processing {MatriculeCount} unique matricules.", allMatricules.Count);

                    var userEvaluations = new List<UserEvaluation>();
                    var invalidMatricules = new List<string>();

                    foreach (var matricule in allMatricules)
                    {
                        //MODIF HENINTSOA
                        var user = users.FirstOrDefault(u => u.Matricule == matricule && (u.TypeUser == "NonCadre" || u.TypeUser == "Aucun"));
                        if (user == null)
                        {
                            _logger.LogWarning("User with matricule {Matricule} and type NonCadre not found.", matricule);
                            invalidMatricules.Add(matricule);
                            continue;
                        }

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
                            _logger.LogInformation("Created new user evaluation for user ID {UserId} and evaluation ID {EvalId}.", user.Id, evaluation.EvalId);
                        }
                        userEvaluations.Add(userEvaluation);
                    }

                    if (fixationData.Any() && userEvaluations.Count == 0)
                    {
                        _logger.LogError("No valid users found for fixation data. Invalid matricules: {InvalidMatricules}", string.Join(", ", invalidMatricules));
                        throw new Exception($"Aucun utilisateur valide trouvé pour les matricules fournis : {string.Join(", ", invalidMatricules)}");
                    }

                    var historyFoList = new List<HistoryUserIndicatorFO>();
                    var historyMpList = new List<HistoryUserIndicatorMP>();
                    var historyCompetenceMpList = new List<HistoryUserCompetenceMP>();
                    var historyFiList = new List<HistoryUserindicatorFi>();

                    foreach (var userEval in userEvaluations)
                    {
                        var matricule = users.First(u => u.Id == userEval.UserId).Matricule;
                        _logger.LogDebug("Processing user evaluation for matricule {Matricule}.", matricule);

                        var fixationRecords = fixationData.Where(d => d.Matricule == matricule).ToList();
                        _logger.LogInformation("Found {RecordCount} fixation records for matricule {Matricule}.", fixationRecords.Count, matricule);
                        foreach (var data in fixationRecords)
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

                    _logger.LogInformation("Saving {FoCount} fixation records, {MpCount} mi-parcours indicators, {CompCount} mi-parcours competences, and {FiCount} finale records.", 
                        historyFoList.Count, historyMpList.Count, historyCompetenceMpList.Count, historyFiList.Count);
                    _context.HistoryUserIndicatorFOs.AddRange(historyFoList);
                    _context.HistoryUserIndicatorMPs.AddRange(historyMpList);
                    _context.HistoryUserCompetenceMPs.AddRange(historyCompetenceMpList);
                    _context.HistoryUserindicatorFis.AddRange(historyFiList);

                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Successfully saved all records to database.");
                }

                await transaction.CommitAsync();
                _logger.LogInformation("Non-cadre import completed successfully for year {Year}.", annee);
                return Ok(new { Message = "Importation Non-Cadre réussie." });
            }
            catch (CsvParsingException csvEx)
            {
                await transaction.RollbackAsync();
                _logger.LogError(csvEx, "CSV parsing error in file {FileName} at line {LineNumber}.", csvEx.FileName, csvEx.LineNumber);
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
                _logger.LogError(ex, "Unexpected error during import for year {Year}.", annee);
                return StatusCode(500, new ControllerErrorResponse
                {
                    ErrorMessage = ex.Message,
                    Details = ex.InnerException?.Message
                });
            }
        }

        private async Task<Evaluation> ImportEvaluationData(IFormFile evaluationFile)
        {
            _logger.LogInformation("Importing evaluation data from file: {FileName}.", evaluationFile.FileName);
            using var reader = new StreamReader(evaluationFile.OpenReadStream());
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            var evaluationData = csv.GetRecords<EvaluationData>().FirstOrDefault();
            if (evaluationData == null)
            {
                _logger.LogError("No evaluation data found in file: {FileName}.", evaluationFile.FileName);
                throw new CsvParsingException(evaluationFile.FileName, null, "Aucune donnée d'évaluation trouvée.");
            }

            var userEvaluationWeight = await _context.UserEvaluationWeights
                .FirstOrDefaultAsync(uwe => uwe.TemplateId == evaluationData.TemplateId);

            if (userEvaluationWeight == null)
            {
                _logger.LogError("No weight found for TemplateId: {TemplateId}.", evaluationData.TemplateId);
                throw new Exception($"Aucun poids trouvé pour le TemplateId : {evaluationData.TemplateId}");
            }

            var evaluation = new Evaluation
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
            _logger.LogInformation("Evaluation data prepared for TemplateId: {TemplateId}.", evaluationData.TemplateId);
            return evaluation;
        }

        private async Task<List<T>> ImportPeriodData<T>(IFormFile file) where T : class
        {
            _logger.LogInformation("Importing period data from file: {FileName}.", file.FileName);
            using var reader = new StreamReader(file.OpenReadStream());
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null
            };
            using var csv = new CsvReader(reader, config);

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

            var records = new List<T>();
            int lineNumber = 1;

            while (await csv.ReadAsync())
            {
                var rawRecord = csv.Parser.Record;
                if (rawRecord == null || rawRecord.All(string.IsNullOrWhiteSpace))
                {
                    _logger.LogWarning("Skipping empty record at line {LineNumber} in file {FileName}.", lineNumber, file.FileName);
                    lineNumber++;
                    continue;
                }

                try
                {
                    var record = csv.GetRecord<T>();
                    records.Add(record);
                    _logger.LogDebug("Parsed record at line {LineNumber} in file {FileName}.", lineNumber, file.FileName);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error parsing record at line {LineNumber} in file {FileName}.", lineNumber, file.FileName);
                    throw new CsvParsingException(file.FileName, lineNumber, $"Erreur lors de l'analyse de l'enregistrement : {ex.Message}");
                }

                lineNumber++;
            }

            _logger.LogInformation("Imported {RecordCount} records from file {FileName}.", records.Count, file.FileName);
            return records;
        }

        private async Task<List<Help>> ImportHelpData(IFormFile helpFile)
        {
            _logger.LogInformation("Importing help data from file: {FileName}.", helpFile.FileName);
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
                        _logger.LogDebug("Parsed help record at line {LineNumber}.", lineNumber);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error parsing help record at line {LineNumber} in file {FileName}.", lineNumber, helpFile.FileName);
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
                _logger.LogError(ex, "Error parsing help file {FileName}.", helpFile.FileName);
                throw new CsvParsingException(helpFile.FileName, lineNumber, $"Erreur lors de l'analyse du fichier Help : {ex.Message}");
            }

            _logger.LogInformation("Imported {RecordCount} help records from file {FileName}.", records.Count, helpFile.FileName);
            return records;
        }

        private async Task<List<UserHelpContent>> ImportUserHelpContentData(IFormFile userHelpContentFile, List<Help> helpData, List<UserDTO> users, Evaluation evaluation)
        {
            _logger.LogInformation("Importing user help content from file: {FileName}.", userHelpContentFile.FileName);
            using var reader = new StreamReader(userHelpContentFile.OpenReadStream());
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null
            };
            using var csvReader = new CsvReader(reader, config);
            csvReader.Context.RegisterClassMap<UserHelpContentMap>();

            var records = new List<UserHelpContent>();
            int lineNumber = 1;

            try
            {
                while (await csvReader.ReadAsync())
                {
                    try
                    {
                        var raw = csvReader.GetRecord<UserHelpContentCsv>();
                        var user = users.FirstOrDefault(u => u.Matricule == raw.Matricule);
                        if (user == null)
                        {
                            _logger.LogWarning("User not found for matricule {Matricule} at line {LineNumber}.", raw.Matricule, lineNumber);
                            throw new CsvParsingException(userHelpContentFile.FileName, lineNumber, $"Utilisateur non trouvé pour le matricule : {raw.Matricule}");
                        }

                        var userEval = await _context.UserEvaluations
                            .Include(ue => ue.Evaluation)
                            .FirstOrDefaultAsync(ue => ue.UserId == user.Id && ue.Evaluation.EvalAnnee == raw.Année);
                        if (userEval == null)
                        {
                            _logger.LogWarning("Evaluation not found for user {Matricule} and year {Year} at line {LineNumber}.", raw.Matricule, raw.Année, lineNumber);
                            throw new CsvParsingException(userHelpContentFile.FileName, lineNumber, $"Évaluation non trouvée pour l'utilisateur : {raw.Matricule} et l'année : {raw.Année}");
                        }

                        var help = helpData.FirstOrDefault(h => h.Name.Equals(raw.Help, StringComparison.OrdinalIgnoreCase)); // Case-insensitive comparison
                        if (help == null)
                        {
                            _logger.LogWarning("Help not found for name '{HelpName}' at line {LineNumber}. Available help names: {HelpNames}", 
                                raw.Help, lineNumber, string.Join(", ", helpData.Select(h => h.Name)));
                            throw new CsvParsingException(userHelpContentFile.FileName, lineNumber, $"Help non trouvé pour le nom : {raw.Help}");
                        }

                        var userHelpContent = new UserHelpContent
                        {
                            UserEvalId = userEval.UserEvalId,
                            HelpId = help.HelpId,
                            WriterUserId = raw.Writer,
                            Content = raw.Content
                        };

                        records.Add(userHelpContent);
                        _logger.LogDebug("Parsed user help content for matricule {Matricule} at line {LineNumber}.", raw.Matricule, lineNumber);
                    }
                    catch (CsvParsingException)
                    {
                        throw;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error parsing user help content at line {LineNumber} in file {FileName}.", lineNumber, userHelpContentFile.FileName);
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
                _logger.LogError(ex, "Error parsing user help content file {FileName}.", userHelpContentFile.FileName);
                throw new CsvParsingException(userHelpContentFile.FileName, lineNumber, $"Erreur lors de l'analyse du fichier UserHelpContent : {ex.Message}");
            }

            _logger.LogInformation("Imported {RecordCount} user help content records from file {FileName}.", records.Count, userHelpContentFile.FileName);
            return records;
        }

        [HttpGet("import-status")]
        public async Task<IActionResult> GetImportStatus([FromQuery] int annee)
        {
            _logger.LogInformation("Checking import status for year {Year}.", annee);
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

            var userEvalIds = await _context.UserEvaluations
                .Where(ue => ue.EvalId == evaluation.EvalId)
                .Select(ue => ue.UserEvalId)
                .ToListAsync();

            bool hasFixation = await _context.HistoryUserIndicatorFOs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasMiParcoursIndicators = await _context.HistoryUserIndicatorMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasMiParcoursCompetence = await _context.HistoryUserCompetenceMPs.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasFinale = await _context.HistoryUserindicatorFis.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
            bool hasHelp = await _context.Helps.AnyAsync(h => h.TemplateId == evaluation.TemplateId);
            bool hasUserHelpContent = await _context.UserHelpContents.AnyAsync(uhc => userEvalIds.Contains(uhc.UserEvalId));

            _logger.LogInformation("Import status for year {Year}: Evaluation={Evaluation}, Fixation={Fixation}, MiParcoursIndicators={MiParcoursIndicators}, MiParcoursCompetence={MiParcoursCompetence}, Finale={Finale}, Help={Help}, UserHelpContent={UserHelpContent}.",
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

        public class ImportNonCadreEvaluationRequest
        {
            public int Annee { get; set; }
            public IFormFile? EvaluationFile { get; set; }
            public IFormFile? FixationFile { get; set; }
            public IFormFile? MiParcoursIndicatorsFile { get; set; }
            public IFormFile? MiParcoursCompetenceFile { get; set; }
            public IFormFile? FinaleFile { get; set; }
            public IFormFile? HelpFile { get; set; }
            public IFormFile? UserHelpContentFile { get; set; }
        }

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

    public class ControllerErrorResponse
    {
        public string? FileName { get; set; }
        public int? LineNumber { get; set; }
        public string ErrorMessage { get; set; }
        public string? Details { get; set; }
    }
}