using EvaluationService.Data;
using EvaluationService.DTOs;
using EvaluationService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

namespace EvaluationService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TemplateController : ControllerBase
    {
        private readonly AppdbContext _context;

        public TemplateController(AppdbContext context)
        {
            _context = context;
        }

        [HttpGet("{templateId}")]
        public async Task<IActionResult> ShowTemplate(int templateId)
        {
            try
            {
                // Récupère le modèle de formulaire avec ses priorités stratégiques actives
                var formTemplate = await _context.FormTemplates
                    .Include(t => t.TemplateStrategicPriorities)
                    .FirstOrDefaultAsync(t => t.TemplateId == templateId);

                if (formTemplate == null)
                {
                    return NotFound("Form template not found.");
                }

                // Récupération des colonnes dynamiques actives
                var dynamicColumns = await _context.ObjectiveColumns
                    .Where(c => c.IsActive)
                    .Select(c => new ObjectiveColumnDto
                    {
                        ColumnId = c.ColumnId,
                        Name = c.Name,
                        IsActive = c.IsActive
                    })
                    .ToListAsync();

                // Préparation des priorités stratégiques actives avec objectifs vides
                var templatePriorities = formTemplate.TemplateStrategicPriorities
                    .Where(p => p.IsActif) // Filtre uniquement les priorités actives
                    .Select(p => new TemplateStrategicPriorityDto
                    {
                        TemplatePriorityId = p.TemplatePriorityId,
                        Name = p.Name,
                        MaxObjectives = p.MaxObjectives,
                        Objectives = Enumerable.Range(1, p.MaxObjectives)
                            .Select(_ => new ObjectiveDto
                            {
                                Description = "",
                                Weighting = 0,
                                ResultIndicator = "",
                                Result = 0,
                                DynamicColumns = dynamicColumns.Select(col => new ColumnValueDto
                                {
                                    ColumnName = col.Name,
                                    Value = "" // Champ vide pour le formulaire vierge
                                }).ToList()
                            }).ToList()
                    }).ToList();

                // Mapping du template au DTO
                var response = new
                {
                    Template = new FormTemplateDto
                    {
                        TemplateId = formTemplate.TemplateId,
                        Name = formTemplate.Name,
                        CreationDate = formTemplate.CreationDate,
                        TemplateStrategicPriorities = templatePriorities
                    },
                    DynamicColumns = dynamicColumns
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpGet("CadreTemplate")]
        public async Task<IActionResult> GetCadreTemplate()
        {
            try
            {
                // Fetch the template with type 'Cadre'
                var cadreTemplate = await _context.FormTemplates
                    .FirstOrDefaultAsync(t => t.Type == 0);
                if (cadreTemplate == null)
                {
                    return NotFound("Cadre template not found.");
                }

                return Ok(new { TemplateId = cadreTemplate.TemplateId, Name = cadreTemplate.Name });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("GetAllPriorities")]
        public async Task<IActionResult> GetAllStrategicPriorities([FromQuery] bool? onlyActive = null)
        {
            try
            {
                // Récupérer toutes les priorités ou uniquement les actives selon le paramètre
                var prioritiesQuery = _context.TemplateStrategicPriorities.AsQueryable();

                if (onlyActive.HasValue && onlyActive.Value)
                {
                    prioritiesQuery = prioritiesQuery.Where(p => p.IsActif);
                }

                var priorities = await prioritiesQuery
                    .Select(p => new
                    {
                        p.TemplatePriorityId,
                        p.Name,
                        p.MaxObjectives,
                        p.TemplateId,
                        p.IsActif
                    })
                    .ToListAsync();

                return Ok(priorities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpPut("UpdateCadreTemplateName")]
        public async Task<IActionResult> UpdateCadreTemplateName([FromBody] string newName)
        {
            try
            {
                // Rechercher le template 'Cadre' par son type
                var cadreTemplate = await _context.FormTemplates.FirstOrDefaultAsync(t => t.Type == 0);

                if (cadreTemplate == null)
                {
                    return NotFound("Cadre template not found.");
                }

                // Mettre à jour le nom du template
                cadreTemplate.Name = newName;

                // Sauvegarder les modifications
                await _context.SaveChangesAsync();
                return Ok("Cadre template name updated successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpPost("AddStrategicPriority")]
        public async Task<IActionResult> AddStrategicPriority([FromBody] StrategicPriorityRequest request)
        {
            try
            {
                // Vérifier si le FormTemplate 'Cadre' associé existe
                var existingTemplate = await _context.FormTemplates.FirstOrDefaultAsync(t => t.Type == 0);
                if (existingTemplate == null)
                {
                    return NotFound("Form template not found.");
                }

                // Vérifier si une priorité stratégique avec le même nom existe déjà
                var existingPriority = await _context.TemplateStrategicPriorities.FirstOrDefaultAsync(p => p.Name == request.Name && p.TemplateId == existingTemplate.TemplateId);
                if (existingPriority != null)
                {
                    return Conflict("A strategic priority with the same name already exists.");
                }

                // Créez un nouvel objet TemplateStrategicPriority
                var newPriority = new TemplateStrategicPriority
                {
                    Name = request.Name,
                    MaxObjectives = request.MaxObjectives,
                    TemplateId = existingTemplate.TemplateId,
                    IsActif = true
                };

                // Ajouter la nouvelle priorité stratégique au contexte
                await _context.TemplateStrategicPriorities.AddAsync(newPriority);

                // Sauvegarder les modifications
                await _context.SaveChangesAsync();
                return Ok("Strategic priority added successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpPut("UpdatePriority")]
        public async Task<IActionResult> UpdateStrategicPriority([FromBody] UpdatePriorityRequest request)
        {
            try
            {
                // Récupérer la priorité stratégique à mettre à jour
                var priority = await _context.TemplateStrategicPriorities.FindAsync(request.TemplatePriorityId);

                if (priority == null)
                {
                    return NotFound("Strategic priority not found.");
                }

                // Mise à jour des champs
                priority.Name = request.NewName;
                priority.MaxObjectives = request.NewMaxObjectives;
                priority.IsActif = request.IsActif; // Mise à jour du champ IsActif

                // Sauvegarder les changements
                await _context.SaveChangesAsync();

                return Ok("Strategic priority updated successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("GetAllColumns")]
        public async Task<IActionResult> GetAllDynamicColumns([FromQuery] bool? onlyActive = null)
        {
            try
            {
                // Récupérer toutes les colonnes ou uniquement les actives selon le paramètre
                var columnsQuery = _context.ObjectiveColumns.AsQueryable();

                if (onlyActive.HasValue && onlyActive.Value)
                {
                    columnsQuery = columnsQuery.Where(c => c.IsActive);
                }

                var columns = await columnsQuery
                    .Select(c => new
                    {
                        c.ColumnId,
                        c.Name,
                        c.IsActive
                    })
                    .ToListAsync();

                return Ok(columns);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        // POST: api/FormTemplate/AddDynamicColumn
        [HttpPost("AddDynamicColumn")]
        public async Task<IActionResult> AddDynamicColumn(string columnName)
        {
            try
            {
                var newColumn = new ObjectiveColumn
                {
                    Name = columnName,
                    IsActive = true
                };

                _context.ObjectiveColumns.Add(newColumn);
                await _context.SaveChangesAsync();
                return Ok("Dynamic column added successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // PUT: api/FormTemplate/UpdateDynamicColumn
        [HttpPut("UpdateDynamicColumn")]
        public async Task<IActionResult> UpdateDynamicColumn([FromBody] DynamicColumnUpdateDto columnUpdateDto)
        {
            try
            {
                var column = await _context.ObjectiveColumns.FindAsync(columnUpdateDto.Id);

                if (column == null)
                {
                    return NotFound("Dynamic column not found.");
                }

                column.Name = columnUpdateDto.NewName;
                column.IsActive = columnUpdateDto.IsActive;

                await _context.SaveChangesAsync();
                return Ok("Dynamic column updated successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        // [HttpGet("NonCadreTemplate/{templateId:int}")]
        // public async Task<IActionResult> GetNonCadreTemplate(int templateId)
        // {
        //     try
        //     {
        //         // Récupération du modèle principal
        //         var template = await _context.FormTemplates
        //             .Where(t => t.TemplateId == templateId && t.Type == FormType.NonCadre)
        //             .Include(t => t.Competences)
        //                 .ThenInclude(c => c.CompetenceLevels)
        //             .FirstOrDefaultAsync();

        //         if (template == null)
        //         {
        //             return NotFound("Le modèle de type NonCadre avec cet ID n'existe pas.");
        //         }

        //         // Récupération des pondérations d'évaluation de l'utilisateur
        //         var userEvaluationWeights = await _context.UserEvaluationWeights
        //             .FirstOrDefaultAsync(w => w.TemplateId == templateId);

        //         // Récupération des "Helps" actifs uniquement
        //         var helps = await _context.Helps
        //             .Where(h => h.TemplateId == templateId && h.IsActive)
        //             .Select(h => new
        //             {
        //                 h.HelpId,
        //                 h.Name
        //             })
        //             .ToListAsync();

        //         // Récupération des niveaux
        //         var levels = await _context.Levels.Select(l => new
        //         {
        //             l.LevelId,
        //             l.LevelName
        //         }).ToListAsync();

        //         // Récupération des indicateurs actifs uniquement
        //         var indicators = await _context.Indicators
        //             .Where(i => i.TemplateId == templateId && i.IsActive)
        //             .Select(i => new
        //             {
        //                 i.IndicatorId,
        //                 i.MaxResults,
        //                 i.label
        //             }).ToListAsync();

        //         // Construction du résultat
        //         var result = new
        //         {
        //             TemplateId = template.TemplateId,
        //             Name = template.Name,
        //             CreationDate = template.CreationDate,
        //             CompetenceWeightTotal = userEvaluationWeights?.CompetenceWeightTotal,
        //             IndicatorWeightTotal = userEvaluationWeights?.IndicatorWeightTotal,
        //             Competences = template.Competences.Select(c => new
        //             {
        //                 c.CompetenceId,
        //                 c.Name,
        //                 Levels = c.CompetenceLevels.Select(cl => new
        //                 {
        //                     cl.LevelId,
        //                     cl.Level.LevelName,
        //                     cl.Description
        //                 })
        //             }),
        //             Helps = helps,
        //             Levels = levels,
        //             Indicators = indicators
        //         };

        //         return Ok(result);
        //     }
        //     catch (Exception ex)
        //     {
        //         return StatusCode(500, "Erreur du serveur : " + ex.Message);
        //     }
        // }

        [HttpGet("NonCadreTemplate/{templateId:int}")]
public async Task<IActionResult> GetNonCadreTemplate(int templateId)
{
    try
    {
        // Récupération du modèle principal avec Level inclus
        var template = await _context.FormTemplates
            .Where(t => t.TemplateId == templateId && t.Type == FormType.NonCadre)
            .Include(t => t.Competences)
                .ThenInclude(c => c.CompetenceLevels)
                    .ThenInclude(cl => cl.Level) // Eagerly load Level
            .FirstOrDefaultAsync();

        if (template == null)
        {
            return NotFound("Le modèle de type NonCadre avec cet ID n'existe pas.");
        }

        // Récupération des pondérations d'évaluation de l'utilisateur
        var userEvaluationWeights = await _context.UserEvaluationWeights
            .FirstOrDefaultAsync(w => w.TemplateId == templateId);

        // Récupération des "Helps" actifs uniquement
        var helps = await _context.Helps
            .Where(h => h.TemplateId == templateId && h.IsActive)
            .Select(h => new
            {
                h.HelpId,
                h.Name
            })
            .ToListAsync();

        // Récupération des niveaux
        var levels = await _context.Levels.Select(l => new
        {
            l.LevelId,
            l.LevelName
        }).ToListAsync();

        // Récupération des indicateurs actifs uniquement
        var indicators = await _context.Indicators
            .Where(i => i.TemplateId == templateId && i.IsActive)
            .Select(i => new
            {
                i.IndicatorId,
                i.MaxResults,
                i.label
            }).ToListAsync();

        // Construction du résultat avec null handling
        var result = new
        {
            TemplateId = template.TemplateId,
            Name = template.Name,
            CreationDate = template.CreationDate,
            CompetenceWeightTotal = userEvaluationWeights?.CompetenceWeightTotal,
            IndicatorWeightTotal = userEvaluationWeights?.IndicatorWeightTotal,
            Competences = template.Competences.Select(c => new
            {
                c.CompetenceId,
                c.Name,
                Levels = c.CompetenceLevels.Select(cl => new
                {
                    cl.LevelId,
                    LevelName = cl.Level?.LevelName ?? "N/A", // Handle null Level
                    cl.Description
                })
            }),
            Helps = helps,
            Levels = levels,
            Indicators = indicators
        };

        return Ok(result);
    }
    catch (Exception ex)
    {
        // Consider logging the exception details here for debugging purposes
        return StatusCode(500, "Erreur du serveur : " + ex.Message);
    }
}



        [HttpGet("NonCadreTemplate")]
        public async Task<IActionResult> GetNonCadreTemplate()
        {
            try
            {
                // Fetch the template with type 'NonCadre'
                var nonCadreTemplate = await _context.FormTemplates
                    .FirstOrDefaultAsync(t => t.Type == FormType.NonCadre);

                if (nonCadreTemplate == null)
                {
                    return NotFound("NonCadre template not found.");
                }

                return Ok(new { TemplateId = nonCadreTemplate.TemplateId, Name = nonCadreTemplate.Name });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("UpdateNonCadreTemplateName")]
        public async Task<IActionResult> UpdateNonCadreTemplateName([FromBody] string newName)
        {
            try
            {
                // Rechercher le template 'Cadre' par son type
                var NonCadreTemplate = await _context.FormTemplates
                    .FirstOrDefaultAsync(t => t.Type == FormType.NonCadre);

                if (NonCadreTemplate == null)
                {
                    return NotFound("Cadre template not found.");
                }

                // Mettre à jour le nom du template
                NonCadreTemplate.Name = newName;

                // Sauvegarder les modifications
                await _context.SaveChangesAsync();
                return Ok("Cadre template name updated successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("addIndicator")]
        public async Task<IActionResult> AddIndicator([FromBody] AddIndicatorRequest request)
        {
            try
            {
                // Vérifie si le template existe
                var template = await _context.FormTemplates.FindAsync(request.TemplateId);
                if (template == null)
                {
                    return NotFound(new { Message = "Template not found" });
                }

                // Crée un nouvel indicateur
                var newIndicator = new Indicator
                {
                    label = request.Label,
                    MaxResults = request.MaxResults,
                    TemplateId = request.TemplateId,
                    IsActive = true
                };

                // Ajoute l'indicateur à la base de données
                _context.Indicators.Add(newIndicator);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Indicator added successfully", IndicatorId = newIndicator.IndicatorId });
            }
            catch (Exception ex)
            {
                // Gestion des erreurs
                return StatusCode(500, new { Message = $"Error: {ex.Message}" });
            }
        }

        [HttpPut("UpdateIndicators")]
        public async Task<IActionResult> UpdateIndicators([FromBody] List<UpdateIndicatorRequest> requests)
        {
            if (requests == null || !requests.Any())
            {
                return BadRequest(new { Message = "Aucun indicateur à mettre à jour." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var req in requests)
                {
                    var indicator = await _context.Indicators.FindAsync(req.IndicatorId);
                    if (indicator == null)
                    {
                        return NotFound(new { Message = $"Indicateur avec ID {req.IndicatorId} non trouvé." });
                    }

                    // Mise à jour des propriétés de l'indicateur
                    indicator.label = req.NewLabel;
                    indicator.MaxResults = req.NewMaxResults;
                    indicator.IsActive = req.IsActive;

                    _context.Indicators.Update(indicator);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Tous les indicateurs ont été mis à jour avec succès." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Message = $"Erreur du serveur : {ex.Message}" });
            }
        }

        [HttpGet("AllIndicator")]
        public async Task<IActionResult> GetIndicators([FromQuery] bool? onlyActive = null)
        {
            try
            {
                // Construire la requête de base
                IQueryable<Indicator> query = _context.Indicators;

                // Appliquer le filtre si onlyActive est vrai
                if (onlyActive.HasValue && onlyActive.Value)
                {
                    query = query.Where(i => i.IsActive);
                }

                // Exécuter la requête et récupérer les résultats
                List<Indicator> indicators = await query.ToListAsync();

                return Ok(indicators);
            }
            catch (Exception ex)
            {
                // Retourner une erreur 500 en cas d'exception
                return StatusCode(500, new { Message = $"Erreur du serveur : {ex.Message}" });
            }
        }

        // [HttpPut("updateIndicator/{id}")]
        // public async Task<IActionResult> UpdateIndicator(int id, [FromBody] UpdateIndicatorRequest request)
        // {
        //     try
        //     {
        //         // Rechercher l'indicateur à modifier
        //         var indicator = await _context.Indicators.FindAsync(id);
        //         if (indicator == null)
        //         {
        //             return NotFound(new { Message = "Indicator not found" });
        //         }

        //         // Mettre à jour toutes les propriétés
        //         indicator.label = request.NewLabel;
        //         indicator.MaxResults = request.NewMaxResults;
        //         indicator.IsActive = request.IsActive;

        //         // Sauvegarder les modifications dans la base de données
        //         _context.Indicators.Update(indicator);
        //         await _context.SaveChangesAsync();

        //         return Ok(new { Message = "Indicator updated successfully" });
        //     }
        //     catch (Exception ex)
        //     {
        //         // Gestion des erreurs
        //         return StatusCode(500, new { Message = $"Error: {ex.Message}" });
        //     }
        // }

        [HttpPut("updateWeights")]
        public async Task<IActionResult> UpdateWeights([FromBody] UpdateWeightRequest request)
        {
            try
            {
                // Vérifiez si le modèle existe
                var userEvaluationWeights = await _context.UserEvaluationWeights
                    .FirstOrDefaultAsync(w => w.TemplateId == request.TemplateId);

                if (userEvaluationWeights == null)
                {
                    return NotFound(new { Message = "Template with the specified ID not found." });
                }

                // Mise à jour des poids
                userEvaluationWeights.CompetenceWeightTotal = request.CompetenceWeightTotal;
                userEvaluationWeights.IndicatorWeightTotal = request.IndicatorWeightTotal;

                // Sauvegarder les changements dans la base de données
                _context.UserEvaluationWeights.Update(userEvaluationWeights);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Message = "Weights updated successfully.",
                    CompetenceWeightTotal = userEvaluationWeights.CompetenceWeightTotal,
                    IndicatorWeightTotal = userEvaluationWeights.IndicatorWeightTotal
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Server error: {ex.Message}" });
            }
        }

        [HttpPost("AddHelp")]
        public async Task<IActionResult> AddHelp([FromBody] HelpDto helpDto)
        {
            if (helpDto == null || string.IsNullOrEmpty(helpDto.Name))
            {
                return BadRequest(new { Message = "Les informations du Help sont invalides." });
            }

            try
            {
                var help = new Help
                {
                    Name = helpDto.Name,
                    TemplateId = helpDto.TemplateId,
                    AllowedUserLevel = helpDto.AllowedUserLevel,
                    IsActive = true
                };

                _context.Helps.Add(help);
                await _context.SaveChangesAsync();

                return Ok(help);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Erreur lors de l'ajout du Help: {ex.Message}");
                return BadRequest(new { Message = $"Une erreur est survenue: {ex.Message}" });
            }
        }

        [HttpGet("GetHelps")]
        public async Task<IActionResult> GetHelps([FromQuery] bool? onlyActive = null)
        {
            try
            {
                // Construire la requête de base
                var helpsQuery = _context.Helps.AsQueryable();

                // Filtrer par état si spécifié
                if (onlyActive.HasValue)
                {
                    helpsQuery = helpsQuery.Where(h => h.IsActive == onlyActive.Value);
                }

                // Exécuter la requête
                var helps = await helpsQuery
                    .Select(h => new
                    {
                        h.HelpId,
                        h.Name,
                        h.TemplateId,
                        h.IsActive,
                        h.AllowedUserLevel
                    })
                    .ToListAsync();

                return Ok(helps);
            }
            catch (Exception ex)
            {
                // Gérer les erreurs
                Console.Error.WriteLine($"Erreur lors de la récupération des aides : {ex.Message}");
                return StatusCode(500, new { Message = "Une erreur est survenue lors de la récupération des aides." });
            }
        }


        [HttpPut("UpdateHelps")]
        public async Task<IActionResult> UpdateHelps([FromBody] List<UpdateHelpRequest> requests)
        {
            if (requests == null || !requests.Any())
            {
                return BadRequest(new { Message = "Aucune aide à mettre à jour." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var req in requests)
                {
                    var help = await _context.Helps.FindAsync(req.HelpId);
                    if (help == null)
                    {
                        return NotFound(new { Message = $"Aide avec ID {req.HelpId} non trouvée." });
                    }

                    // Mise à jour des propriétés si elles sont fournies
                    if (!string.IsNullOrEmpty(req.Name))
                    {
                        help.Name = req.Name;
                    }

                    if (req.AllowedUserLevel.HasValue)
                    {
                        help.AllowedUserLevel = req.AllowedUserLevel.Value;
                    }

                    if (req.IsActive.HasValue)
                    {
                        help.IsActive = req.IsActive.Value;
                    }

                    _context.Helps.Update(help);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "Toutes les aides ont été mises à jour avec succès." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Message = $"Erreur du serveur : {ex.Message}" });
            }
        }



        [HttpGet("GetAllTemplates")]
        public async Task<ActionResult<IEnumerable<FormTemplateDto>>> GetAllTemplates()
        {
            var templates = await _context.FormTemplates
                .Select(template => new FormTemplateDto
                {
                    TemplateId = template.TemplateId,
                    Name = template.Name,
                    Type = template.Type,
                    TypeName = template.Type == 0 ? "Cadre" : "Non-Cadre" 
                })
                .ToListAsync();

            return Ok(templates);
        }
    }

//cadre
    public class DynamicColumnUpdateDto
    {
        public int Id { get; set; } // Cet ID peut être supprimé si on ne souhaite pas l'envoyer depuis le client
        public string NewName { get; set; }
        public bool IsActive { get; set; }
    }

    public class StrategicPriorityRequest
    {
        public string Name { get; set; }
        public int MaxObjectives { get; set; }
    }
    
    public class UpdatePriorityRequest
    {
        public int TemplatePriorityId { get; set; }
        public string NewName { get; set; }
        public int NewMaxObjectives { get; set; }
        public bool IsActif {get; set;}
    }

//NonCadre
    public class AddIndicatorRequest
    {
        [Required]
        public int TemplateId { get; set; }

        [Required]
        public string Label { get; set; }

        [Range(1, 3)]
        public int MaxResults { get; set; }
    }

    public class UpdateIndicatorRequest
    {
        public int IndicatorId {get; set;}
        public string NewLabel { get; set; }
        [Range(1, 3)]
        public int NewMaxResults { get; set; }
        public bool IsActive {get; set;}
    }

    public class UpdateWeightRequest
    {
        public int TemplateId { get; set; }
        public int CompetenceWeightTotal { get; set; }
        public int IndicatorWeightTotal { get; set; }
    }

    public class HelpDto
    {
        public string Name { get; set; }
        public int TemplateId { get; set; }
        public int AllowedUserLevel { get; set; } // 0: Collaborateur, 1: N+1, 2: N+2
    }

    public class UpdateHelpRequest
    {
        public int HelpId { get; set; } // Obligatoire pour identifier le Help
        public string Name { get; set; } // Optionnel
        public int? AllowedUserLevel { get; set; } // Optionnel
        public bool? IsActive { get; set; } // Optionnel
    }

}
