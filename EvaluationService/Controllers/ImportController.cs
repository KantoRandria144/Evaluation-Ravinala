using CommonModels.DTOs;
using CsvHelper;
using EvaluationService.Data;
using EvaluationService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using Newtonsoft.Json;


namespace EvaluationService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ImportController : ControllerBase
    {
        private readonly AppdbContext _context;
        private readonly HttpClient _httpClient;

        public ImportController(AppdbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _context = context;
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.BaseAddress = new Uri(configuration["UserService:BaseUrl"]);
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


        // [HttpPost("import-evaluation")]
        // public async Task<IActionResult> ImportEvaluation([FromForm] ImportEvaluationRequest request)
        // {
        //     if (request.EvaluationFile == null && request.FixationFile == null && request.MiParcoursFile == null && request.FinaleFile == null)
        //     {
        //         return BadRequest("At least one file must be provided.");
        //     }

        //     using var transaction = await _context.Database.BeginTransactionAsync();

        //     try
        //     {
        //         Evaluation evaluation = null;
        //         var users = new List<UserDTO>();

        //         // Étape 1 : Importer l'évaluation
        //         if (request.EvaluationFile != null)
        //         {
        //             evaluation = await ImportEvaluationData(request.EvaluationFile);
        //             _context.Evaluations.Add(evaluation);
        //             await _context.SaveChangesAsync();

        //             users = await GetUsersFromExternalService(); // seulement si on importe l’évaluation
        //         }

        //         // Étape 2 : Importer les périodes (si fichier fourni)
        //         var fixationData = request.FixationFile != null
        //             ? await ImportPeriodData<FixationData>(request.FixationFile)
        //             : new List<FixationData>();

        //         var miParcoursData = request.MiParcoursFile != null
        //             ? await ImportPeriodData<MiParcoursData>(request.MiParcoursFile)
        //             : new List<MiParcoursData>();

        //         var finaleData = request.FinaleFile != null
        //             ? await ImportPeriodData<FinaleData>(request.FinaleFile)
        //             : new List<FinaleData>();

        //         // Étape 3 : Associer utilisateurs et insérer données historiques
        //         if (evaluation != null)
        //         {
        //             var allMatricules = fixationData.Concat<PeriodData>(miParcoursData).Concat(finaleData)
        //                                             .Select(d => d.Matricule)
        //                                             .Distinct();

        //             foreach (var userMatricule in allMatricules)
        //             {
        //                 var user = users.FirstOrDefault(u => u.Matricule == userMatricule);
        //                 if (user == null || (evaluation.Type == "Cadre" && user.TypeUser != "Cadre"))
        //                     continue;

        //                 var userEvaluation = new UserEvaluation
        //                 {
        //                     EvalId = evaluation.EvalId,
        //                     UserId = user.Id
        //                 };

        //                 _context.UserEvaluations.Add(userEvaluation);
        //                 await _context.SaveChangesAsync();

        //                 await InsertPeriodData(userEvaluation.UserEvalId, fixationData, miParcoursData, finaleData, userMatricule);
        //             }
        //         }

        //         await transaction.CommitAsync();
        //         return Ok("Data imported successfully.");
        //     }
        //     catch (Exception ex)
        //     {
        //         await transaction.RollbackAsync();
        //         return StatusCode(500, $"Internal server error: {ex.Message}");
        //     }
        // }


        // [HttpPost("import-evaluation")]
        // public async Task<IActionResult> ImportEvaluation([FromForm] ImportEvaluationRequest request)
        // {
        //     if (request.EvaluationFile == null && request.FixationFile == null && request.MiParcoursFile == null && request.FinaleFile == null)
        //     {
        //         return BadRequest("Au moins un fichier doit être fourni.");
        //     }

        //     int annee = request.Annee;

        //     if (annee == 0)
        //         return BadRequest("L'année doit être spécifiée.");

        //     // Si EvaluationFile est fourni, vérifier cohérence année dans fichier
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

        //     // Vérifications ordre d'import basées sur l'année demandée
        //     var evaluationExists = await _context.Evaluations.AnyAsync(e => e.EvalAnnee == annee);
        //     if (request.FixationFile != null && !evaluationExists)
        //         return BadRequest("Importer d'abord la période d'évaluation avant la fixation des objectifs.");

        //     var fixationExists = false;
        //     if (evaluationExists)
        //     {
        //         var eval = await _context.Evaluations.FirstAsync(e => e.EvalAnnee == annee);
        //         var userEvalIds = await _context.UserEvaluations
        //             .Where(ue => ue.EvalId == eval.EvalId)
        //             .Select(ue => ue.UserEvalId)
        //             .ToListAsync();
        //         fixationExists = await _context.HistoryCFos.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
        //     }
        //     if (request.MiParcoursFile != null && !evaluationExists)
        //         return BadRequest("Importer d'abord la période d'évaluation avant le mi-parcours.");

        //     var miParcoursExists = false;
        //     if (fixationExists)
        //     {
        //         var eval = await _context.Evaluations.FirstAsync(e => e.EvalAnnee == annee);
        //         var userEvalIds = await _context.UserEvaluations
        //             .Where(ue => ue.EvalId == eval.EvalId)
        //             .Select(ue => ue.UserEvalId)
        //             .ToListAsync();
        //         miParcoursExists = await _context.HistoryCMps.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
        //     }
        //     if (request.FinaleFile != null && !evaluationExists)
        //         return BadRequest("Importer d'abord la période d'évaluation avant l'évaluation finale.");

        //     using var transaction = await _context.Database.BeginTransactionAsync();

        //     try
        //     {
        //         Evaluation evaluation = null;
        //         var users = new List<UserDTO>();

        //         // Importer évaluation si présent
        //         if (request.EvaluationFile != null)
        //         {
        //             evaluation = await ImportEvaluationData(request.EvaluationFile);
        //             _context.Evaluations.Add(evaluation);
        //             await _context.SaveChangesAsync();
        //             users = await GetUsersFromExternalService();
        //         }
        //         else if (evaluationExists)
        //         {
        //             // Récupérer evaluation en base si pas import nouvelle évaluation
        //             evaluation = await _context.Evaluations.FirstAsync(e => e.EvalAnnee == annee);
        //             users = await GetUsersFromExternalService();
        //         }

        //         var fixationData = request.FixationFile != null
        //             ? await ImportPeriodData<FixationData>(request.FixationFile)
        //             : new List<FixationData>();

        //         var miParcoursData = request.MiParcoursFile != null
        //             ? await ImportPeriodData<MiParcoursData>(request.MiParcoursFile)
        //             : new List<MiParcoursData>();

        //         var finaleData = request.FinaleFile != null
        //             ? await ImportPeriodData<FinaleData>(request.FinaleFile)
        //             : new List<FinaleData>();

        //         if (evaluation != null)
        //         {
        //             var allMatricules = fixationData.Concat<PeriodData>(miParcoursData).Concat(finaleData)
        //                                             .Select(d => d.Matricule)
        //                                             .Distinct();

        //             foreach (var userMatricule in allMatricules)
        //             {
        //                 var user = users.FirstOrDefault(u => u.Matricule == userMatricule);
        //                 if (user == null || (evaluation.Type == "Cadre" && user.TypeUser != "Cadre"))
        //                     continue;

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

        //                 await InsertPeriodData(userEvaluation.UserEvalId, fixationData, miParcoursData, finaleData, userMatricule);
        //             }
        //         }

        //         await transaction.CommitAsync();
        //         return Ok("Data imported successfully.");
        //     }
        //     catch (Exception ex)
        //     {
        //         await transaction.RollbackAsync();
        //         return StatusCode(500, $"Internal server error: {ex.Message}");
        //     }
        // }


[HttpPost("import-evaluation")]
public async Task<IActionResult> ImportEvaluation([FromForm] ImportEvaluationRequest request)
{
    if (request.EvaluationFile == null && request.FixationFile == null && request.MiParcoursFile == null && request.FinaleFile == null)
    {
        return BadRequest("Au moins un fichier doit être fourni.");
    }

    int annee = request.Annee;

    if (annee == 0)
        return BadRequest("L'année doit être spécifiée.");

    // Vérification EvaluationFile
    if (request.EvaluationFile != null)
    {
        try
        {
            using var reader = new StreamReader(request.EvaluationFile.OpenReadStream());
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
            var evalData = csv.GetRecords<EvaluationData>().FirstOrDefault();
            if (evalData == null)
                return BadRequest("Le fichier d'évaluation est vide ou mal formaté.");
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

    // Vérifications ordre d'import basées sur l'année demandée
    var evaluationExists = await _context.Evaluations.AnyAsync(e => e.EvalAnnee == annee);
    if (request.FixationFile != null && !evaluationExists)
        return BadRequest("Importer d'abord la période d'évaluation avant la fixation des objectifs.");

    var fixationExists = false;
    if (evaluationExists)
    {
        var eval = await _context.Evaluations.FirstAsync(e => e.EvalAnnee == annee);
        var userEvalIds = await _context.UserEvaluations
            .Where(ue => ue.EvalId == eval.EvalId)
            .Select(ue => ue.UserEvalId)
            .ToListAsync();
        fixationExists = await _context.HistoryCFos.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
    }

    if (request.MiParcoursFile != null && !evaluationExists)
        return BadRequest("Importer d'abord la période d'évaluation avant le mi-parcours.");

    var miParcoursExists = false;
    if (fixationExists)
    {
        var eval = await _context.Evaluations.FirstAsync(e => e.EvalAnnee == annee);
        var userEvalIds = await _context.UserEvaluations
            .Where(ue => ue.EvalId == eval.EvalId)
            .Select(ue => ue.UserEvalId)
            .ToListAsync();
        miParcoursExists = await _context.HistoryCMps.AnyAsync(h => userEvalIds.Contains(h.UserEvalId));
    }

    if (request.FinaleFile != null && !evaluationExists)
        return BadRequest("Importer d'abord la période d'évaluation avant l'évaluation finale.");

    using var transaction = await _context.Database.BeginTransactionAsync();

    try
    {
        Evaluation evaluation = null;
        var users = new List<UserDTO>();

        // Import EvaluationFile
        if (request.EvaluationFile != null)
        {
            evaluation = await ImportEvaluationData(request.EvaluationFile);
            _context.Evaluations.Add(evaluation);
            await _context.SaveChangesAsync();
            users = await GetUsersFromExternalService();
        }
        else if (evaluationExists)
        {
            evaluation = await _context.Evaluations.FirstAsync(e => e.EvalAnnee == annee);
            users = await GetUsersFromExternalService();
        }

        List<FixationData> fixationData = new();
        if (request.FixationFile != null)
        {
            try
            {
                fixationData = await ImportPeriodData<FixationData>(request.FixationFile);
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

        List<MiParcoursData> miParcoursData = new();
        if (request.MiParcoursFile != null)
        {
            try
            {
                miParcoursData = await ImportPeriodData<MiParcoursData>(request.MiParcoursFile);
            }
            catch (HeaderValidationException)
            {
                return BadRequest("Les colonnes du fichier mi-parcours ne correspondent pas au format attendu.");
            }
            catch (Exception)
            {
                return BadRequest("Erreur lors de la lecture du fichier mi-parcours.");
            }
        }

        List<FinaleData> finaleData = new();
        if (request.FinaleFile != null)
        {
            try
            {
                finaleData = await ImportPeriodData<FinaleData>(request.FinaleFile);
            }
            catch (HeaderValidationException)
            {
                return BadRequest("Les colonnes du fichier final ne correspondent pas au format attendu.");
            }
            catch (Exception)
            {
                return BadRequest("Erreur lors de la lecture du fichier final.");
            }
        }

        if (evaluation != null)
        {
            var allMatricules = fixationData.Concat<PeriodData>(miParcoursData).Concat(finaleData)
                                            .Select(d => d.Matricule)
                                            .Distinct();

            foreach (var userMatricule in allMatricules)
            {
                var user = users.FirstOrDefault(u => u.Matricule == userMatricule);
                if (user == null || (evaluation.Type == "Cadre" && user.TypeUser != "Cadre"))
                    continue;

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

                await InsertPeriodData(userEvaluation.UserEvalId, fixationData, miParcoursData, finaleData, userMatricule);
            }
        }

        await transaction.CommitAsync();
        return Ok("Data imported successfully.");
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();
        return StatusCode(500, $"Internal server error: {ex.Message}");
    }
}



        private async Task<Evaluation> ImportEvaluationData(IFormFile evaluationFile)
        {
            using var reader = new StreamReader(evaluationFile.OpenReadStream());
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            var evaluationData = csv.GetRecords<EvaluationData>().FirstOrDefault();
            if (evaluationData == null)
                throw new Exception("No evaluation data found.");

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
                CompetenceWeightTotal = 0,
                IndicatorWeightTotal = 0

            };
        }

        private async Task<List<T>> ImportPeriodData<T>(IFormFile file) where T : PeriodData
        {
            using var reader = new StreamReader(file.OpenReadStream());
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            var records = new List<T>();
            while (csv.Read())
            {
                var rawRecord = csv.Parser.Record;

                // Vérifier si toutes les colonnes sont vides
                if (rawRecord.All(string.IsNullOrWhiteSpace))
                {
                    Console.WriteLine("Skipping empty record.");
                    continue;
                }

                try
                {
                    var record = csv.GetRecord<T>();
                    records.Add(record);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error reading record: {string.Join(", ", rawRecord)}");
                    Console.WriteLine($"Error: {ex.Message}");
                }
            }

            return records;
        }




        private async Task InsertPeriodData(int userEvalId, List<FixationData> fixationData, List<MiParcoursData> miParcoursData, List<FinaleData> finaleData, string matricule)
        {
            // Fixation Objectif
            foreach (var data in fixationData.Where(d => d.Matricule == matricule))
            {
                var hcf = new HistoryCFo
                {
                    UserEvalId = userEvalId,
                    PriorityName = data.PriorityStrategique,
                    Description = data.Description,
                    Weighting = data.Ponderation,
                    ResultIndicator = data.IndicateurResultat,
                    CreatedAt = DateTime.Now
                };
                _context.HistoryCFos.Add(hcf);
                await _context.SaveChangesAsync();

                if (!string.IsNullOrEmpty(data.Commentaire))
                {
                    _context.HistoryObjectiveColumnValuesFos.Add(new HistoryObjectiveColumnValuesFo
                    {
                        HcfId = hcf.HcfId,
                        ColumnName = "Commentaire",
                        Value = data.Commentaire,
                        ValidatedBy = "Admin",
                        CreatedAt = DateTime.Now
                    });
                }
            }

            // Mi-Parcours
            foreach (var data in miParcoursData.Where(d => d.Matricule == matricule))
            {
                var hcm = new HistoryCMp
                {
                    UserEvalId = userEvalId,
                    PriorityName = data.PriorityStrategique,
                    Description = data.Description,
                    Weighting = data.Ponderation,
                    ResultIndicator = data.IndicateurResultat,
                    Result = data.Resultat,
                    UpdatedAt = DateTime.Now
                };
                _context.HistoryCMps.Add(hcm);
                await _context.SaveChangesAsync();

                if (!string.IsNullOrEmpty(data.Commentaire))
                {
                    _context.HistoryObjectiveColumnValuesMps.Add(new HistoryObjectiveColumnValuesMp
                    {
                        HcmId = hcm.HcmId,
                        ColumnName = "Commentaire",
                        Value = data.Commentaire,
                        ValidatedBy = "Admin",
                        CreatedAt = DateTime.Now
                    });
                }
            }

            // Finale
            foreach (var data in finaleData.Where(d => d.Matricule == matricule))
            {
                var hcfi = new HistoryCFi
                {
                    UserEvalId = userEvalId,
                    PriorityName = data.PriorityStrategique,
                    Description = data.Description,
                    Weighting = data.Ponderation,
                    ResultIndicator = data.IndicateurResultat,
                    Result = data.Resultat,
                    UpdatedAt = DateTime.Now
                };
                _context.HistoryCFis.Add(hcfi);
                await _context.SaveChangesAsync();

                if (!string.IsNullOrEmpty(data.Commentaire))
                {
                    _context.HistoryObjectiveColumnValuesFis.Add(new HistoryObjectiveColumnValuesFi
                    {
                        HcfiId = hcfi.HcfiId,
                        ColumnName = "Commentaire",
                        Value = data.Commentaire,
                        ValidatedBy = "Admin",
                        CreatedAt = DateTime.Now
                    });
                }
            }
        }

        [HttpGet("import-status")]
        public async Task<IActionResult> GetImportStatus([FromQuery] int annee)
        {
            var evaluation = await _context.Evaluations.FirstOrDefaultAsync(e => e.EvalAnnee == annee);

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

    }

    // DTOs

    public class ImportEvaluationRequest
    {
        public int Annee { get; set; }  // ajouté
        public IFormFile? EvaluationFile { get; set; }
        public IFormFile? FixationFile { get; set; }
        public IFormFile? MiParcoursFile { get; set; }
        public IFormFile? FinaleFile { get; set; }
    }

    public class EvaluationData
    {
        public int EvalAnnee { get; set; }
        public DateTime FixationObjectif { get; set; }
        public DateTime MiParcours { get; set; }
        public DateTime Finale { get; set; }
        public int EtatId { get; set; }
        public int TemplateId { get; set; }
        public string Titre { get; set; }
        public string Type { get; set; }
    }

    public class PeriodData
    {
        public string Matricule { get; set; }
        public string PriorityStrategique { get; set; }
        public string Description { get; set; }
        public decimal Ponderation { get; set; }
        public string IndicateurResultat { get; set; }
        public decimal Resultat { get; set; }
        public string Commentaire { get; set; }
    }

    public class FixationData : PeriodData { }
    public class MiParcoursData : PeriodData { }
    public class FinaleData : PeriodData { }
}
