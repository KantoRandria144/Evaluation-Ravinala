using EvaluationService.Data;
using EvaluationService.DTOs;
using EvaluationService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
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
                // Retrieve the form template with its active strategic priorities
                var formTemplate = await _context.FormTemplates
                    .Include(t => t.TemplateStrategicPriorities)
                    .FirstOrDefaultAsync(t => t.TemplateId == templateId);

                if (formTemplate == null)
                {
                    return NotFound("Form template not found.");
                }

                // Retrieve active dynamic columns
                var dynamicColumns = await _context.ObjectiveColumns
                    .Where(c => c.IsActive)
                    .Select(c => new ObjectiveColumnDto
                    {
                        ColumnId = c.ColumnId,
                        Name = c.Name,
                        IsActive = c.IsActive
                    })
                    .ToListAsync();

                // Prepare active strategic priorities with empty objectives
                var templatePriorities = formTemplate.TemplateStrategicPriorities
                    .Where(p => p.IsActif) // Filter only active priorities
                    .Select(p => new TemplateStrategicPriorityDto
                    {
                        TemplatePriorityId = p.TemplatePriorityId,
                        Name = p.Name,
                        MaxObjectives = p.MaxObjectives,
                        Ponderation = p.Ponderation,
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
                                    Value = "" // Empty field for blank form
                                }).ToList()
                            }).ToList()
                    }).ToList();

                var totalPonderation = templatePriorities.Sum(p => p.Ponderation ?? 0m);

                // Map template to DTO
                var response = new
                {
                    Template = new FormTemplateDto
                    {
                        TemplateId = formTemplate.TemplateId,
                        Name = formTemplate.Name,
                        CreationDate = formTemplate.CreationDate,
                        TemplateStrategicPriorities = templatePriorities
                    },
                    DynamicColumns = dynamicColumns,
                    TotalPonderation = totalPonderation
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
                // Retrieve all priorities or only active ones based on the parameter
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
                        p.Ponderation,
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
                // Search for the 'Cadre' template by its type
                var cadreTemplate = await _context.FormTemplates.FirstOrDefaultAsync(t => t.Type == 0);

                if (cadreTemplate == null)
                {
                    return NotFound("Cadre template not found.");
                }

                // Update the template name
                cadreTemplate.Name = newName;

                // Save changes
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
                // Check if the associated 'Cadre' FormTemplate exists
                var existingTemplate = await _context.FormTemplates.FirstOrDefaultAsync(t => t.Type == 0);
                if (existingTemplate == null)
                {
                    return NotFound("Form template not found.");
                }

                // Check if a strategic priority with the same name already exists
                var existingPriority = await _context.TemplateStrategicPriorities.FirstOrDefaultAsync(p => p.Name == request.Name && p.TemplateId == existingTemplate.TemplateId);
                if (existingPriority != null)
                {
                    return Conflict("A strategic priority with the same name already exists.");
                }

                // Calculate current sum of active ponderations
                var currentSum = await _context.TemplateStrategicPriorities
                    .Where(p => p.TemplateId == existingTemplate.TemplateId && p.IsActif)
                    .SumAsync(p => (decimal?)(p.Ponderation ?? 0)) ?? 0;

                decimal newPonderationValue = request.Ponderation ?? 0;
                decimal newSum = currentSum + newPonderationValue;

                if (newSum > 100)
                {
                    return BadRequest("The total ponderation would exceed 100%.");
                }

                // Create a new TemplateStrategicPriority object
                var newPriority = new TemplateStrategicPriority
                {
                    Name = request.Name,
                    MaxObjectives = request.MaxObjectives,
                    Ponderation = request.Ponderation,
                    TemplateId = existingTemplate.TemplateId,
                    IsActif = true
                };

                // Add the new strategic priority to the context
                await _context.TemplateStrategicPriorities.AddAsync(newPriority);

                // Save changes
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
                // Retrieve the strategic priority to update
                var priority = await _context.TemplateStrategicPriorities.FindAsync(request.TemplatePriorityId);

                if (priority == null)
                {
                    return NotFound("Strategic priority not found.");
                }

                // Calculate current active sum
                var currentActiveSum = await _context.TemplateStrategicPriorities
                    .Where(p => p.TemplateId == priority.TemplateId && p.IsActif)
                    .SumAsync(p => (decimal?)(p.Ponderation ?? 0)) ?? 0;

                // Adjust for the current priority if it is active
                decimal adjustedCurrentSum = currentActiveSum - (priority.IsActif ? (priority.Ponderation ?? 0) : 0);

                // New state
                bool willBeActive = request.IsActif;
                decimal newPonderationValue = request.NewPonderation ?? 0;

                if (willBeActive)
                {
                    decimal newSum = adjustedCurrentSum + newPonderationValue;
                    if (newSum > 100)
                    {
                        return BadRequest("The total ponderation would exceed 100%.");
                    }
                }

                // Update fields
                priority.Name = request.NewName;
                priority.MaxObjectives = request.NewMaxObjectives;
                priority.Ponderation = request.NewPonderation;
                priority.IsActif = request.IsActif;

                // Save changes
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
                // Retrieve all columns or only active ones based on the parameter
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

        [HttpPost("AddDynamicColumn")]
        public async Task<IActionResult> AddDynamicColumn([FromBody] string columnName)
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

        [HttpGet("NonCadreTemplate/{templateId:int}")]
        public async Task<IActionResult> GetNonCadreTemplate(int templateId)
        {
            try
            {
                // Retrieve the main template with Level included
                var template = await _context.FormTemplates
                    .Where(t => t.TemplateId == templateId && t.Type == FormType.NonCadre)
                    .Include(t => t.Competences)
                        .ThenInclude(c => c.CompetenceLevels)
                            .ThenInclude(cl => cl.Level) // Eagerly load Level
                    .FirstOrDefaultAsync();

                if (template == null)
                {
                    return NotFound("NonCadre template with this ID does not exist.");
                }

                // Retrieve user evaluation weights
                var userEvaluationWeights = await _context.UserEvaluationWeights
                    .FirstOrDefaultAsync(w => w.TemplateId == templateId);

                // Retrieve only active "Helps"
                var helps = await _context.Helps
                    .Where(h => h.TemplateId == templateId && h.IsActive)
                    .Select(h => new
                    {
                        h.HelpId,
                        h.Name
                    })
                    .ToListAsync();

                // Retrieve levels
                var levels = await _context.Levels.Select(l => new
                {
                    l.LevelId,
                    l.LevelName
                }).ToListAsync();

                // Retrieve only active indicators
                var indicators = await _context.Indicators
                    .Where(i => i.TemplateId == templateId && i.IsActive)
                    .Select(i => new
                    {
                        i.IndicatorId,
                        i.MaxResults,
                        i.label
                    }).ToListAsync();

                // Build result with null handling
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
                return StatusCode(500, $"Internal server error: {ex.Message}");
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
                // Search for the 'NonCadre' template by its type
                var nonCadreTemplate = await _context.FormTemplates
                    .FirstOrDefaultAsync(t => t.Type == FormType.NonCadre);

                if (nonCadreTemplate == null)
                {
                    return NotFound("NonCadre template not found.");
                }

                // Update the template name
                nonCadreTemplate.Name = newName;

                // Save changes
                await _context.SaveChangesAsync();
                return Ok("NonCadre template name updated successfully.");
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
                // Check if the template exists
                var template = await _context.FormTemplates.FindAsync(request.TemplateId);
                if (template == null)
                {
                    return NotFound(new { Message = "Template not found" });
                }

                // Create a new indicator
                var newIndicator = new Indicator
                {
                    label = request.Label,
                    MaxResults = request.MaxResults,
                    TemplateId = request.TemplateId,
                    IsActive = true
                };

                // Add the indicator to the database
                _context.Indicators.Add(newIndicator);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Indicator added successfully", IndicatorId = newIndicator.IndicatorId });
            }
            catch (Exception ex)
            {
                // Handle errors
                return StatusCode(500, new { Message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpPut("UpdateIndicators")]
        public async Task<IActionResult> UpdateIndicators([FromBody] List<UpdateIndicatorRequest> requests)
        {
            if (requests == null || !requests.Any())
            {
                return BadRequest(new { Message = "No indicators to update." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var req in requests)
                {
                    var indicator = await _context.Indicators.FindAsync(req.IndicatorId);
                    if (indicator == null)
                    {
                        await transaction.RollbackAsync();
                        return NotFound(new { Message = $"Indicator with ID {req.IndicatorId} not found." });
                    }

                    // Update indicator properties
                    indicator.label = req.NewLabel;
                    indicator.MaxResults = req.NewMaxResults;
                    indicator.IsActive = req.IsActive;

                    _context.Indicators.Update(indicator);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { Message = "All indicators updated successfully." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpGet("AllIndicator")]
        public async Task<IActionResult> GetIndicators([FromQuery] bool? onlyActive = null)
        {
            try
            {
                // Build base query
                IQueryable<Indicator> query = _context.Indicators;

                // Apply filter if onlyActive is true
                if (onlyActive.HasValue && onlyActive.Value)
                {
                    query = query.Where(i => i.IsActive);
                }

                // Execute query and retrieve results
                List<Indicator> indicators = await query.ToListAsync();

                return Ok(indicators);
            }
            catch (Exception ex)
            {
                // Return 500 error on exception
                return StatusCode(500, new { Message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpPut("updateWeights")]
        public async Task<IActionResult> UpdateWeights([FromBody] UpdateWeightRequest request)
        {
            try
            {
                // Check if the model exists
                var userEvaluationWeights = await _context.UserEvaluationWeights
                    .FirstOrDefaultAsync(w => w.TemplateId == request.TemplateId);

                if (userEvaluationWeights == null)
                {
                    return NotFound(new { Message = "Template with the specified ID not found." });
                }

                // Update weights
                userEvaluationWeights.CompetenceWeightTotal = request.CompetenceWeightTotal;
                userEvaluationWeights.IndicatorWeightTotal = request.IndicatorWeightTotal;

                // Save changes to the database
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
                return StatusCode(500, new { Message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpPost("AddHelp")]
        public async Task<IActionResult> AddHelp([FromBody] HelpDto helpDto)
        {
            if (helpDto == null || string.IsNullOrEmpty(helpDto.Name))
            {
                return BadRequest(new { Message = "Help information is invalid." });
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
                // Consider logging: Console.Error.WriteLine($"Error adding Help: {ex.Message}");
                return StatusCode(500, new { Message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpGet("GetHelps")]
        public async Task<IActionResult> GetHelps([FromQuery] bool? onlyActive = null)
        {
            try
            {
                // Build base query
                var helpsQuery = _context.Helps.AsQueryable();

                // Filter by status if specified
                if (onlyActive.HasValue)
                {
                    helpsQuery = helpsQuery.Where(h => h.IsActive == onlyActive.Value);
                }

                // Execute query
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
                // Consider logging: Console.Error.WriteLine($"Error retrieving helps: {ex.Message}");
                return StatusCode(500, new { Message = "An error occurred while retrieving helps." });
            }
        }

        [HttpPut("UpdateHelps")]
        public async Task<IActionResult> UpdateHelps([FromBody] List<UpdateHelpRequest> requests)
        {
            if (requests == null || !requests.Any())
            {
                return BadRequest(new { Message = "No helps to update." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var req in requests)
                {
                    var help = await _context.Helps.FindAsync(req.HelpId);
                    if (help == null)
                    {
                        await transaction.RollbackAsync();
                        return NotFound(new { Message = $"Help with ID {req.HelpId} not found." });
                    }

                    // Update properties if provided
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

                return Ok(new { Message = "All helps updated successfully." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { Message = $"Internal server error: {ex.Message}" });
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

    // Cadre-related DTOs
    public class DynamicColumnUpdateDto
    {
        public int Id { get; set; } // This ID can be omitted if not sent from the client
        public string NewName { get; set; }
        public bool IsActive { get; set; }
    }

    public class StrategicPriorityRequest
    {
        public string Name { get; set; }
        public int MaxObjectives { get; set; }
        public decimal? Ponderation { get; set; }
    }

    public class UpdatePriorityRequest
    {
        public int TemplatePriorityId { get; set; }
        public string NewName { get; set; }
        public int NewMaxObjectives { get; set; }
        public decimal? NewPonderation { get; set; }
        public bool IsActif { get; set; }
    }

    // NonCadre-related DTOs
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
        public int IndicatorId { get; set; }
        public string NewLabel { get; set; }
        [Range(1, 3)]
        public int NewMaxResults { get; set; }
        public bool IsActive { get; set; }
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
        public int HelpId { get; set; } // Required to identify the Help
        public string Name { get; set; } // Optional
        public int? AllowedUserLevel { get; set; } // Optional
        public bool? IsActive { get; set; } // Optional
    }
}