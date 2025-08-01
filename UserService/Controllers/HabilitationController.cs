using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.DTOs;
using UserService.Models;

namespace UserService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HabilitationController : ControllerBase
    {
        private readonly AppdbContext _context;

        public HabilitationController(AppdbContext context)
        {
            _context = context;
        }

        // Get all habilitations
        [HttpGet]
        public async Task<ActionResult<List<HabilitationIDLabelDto>>> GetAllHabilitationsAsync()
        {
            try
            {
                
                var habilitations = await _context.Habilitations
                    .Include(h => h.HabilitationAdmins)
                    .ToListAsync();

                var habilitationDtos = habilitations.Select(h => new HabilitationIDLabelDto
                {
                    Id = h.Id,
                    Label = h.Label,
                    HabilitationAdmins = h.HabilitationAdmins.Select(a => new HabilitationUniqAdminDto
                    {
                        Id = a.Id,
                        Name = a.Name
                    }).ToList()
                }).ToList();

                return Ok(habilitationDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Get habilitation by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<HabilitationIDLabelDto>> GetHabilitationByIdAsync(int id)
        {
            try
            {
                var habilitation = await _context.Habilitations
                    .Include(h => h.HabilitationAdmins)
                    .FirstOrDefaultAsync(h => h.Id == id);

                if (habilitation == null)
                {
                    return NotFound($"Habilitation with ID {id} not found.");
                }

                // Mapper vers DTO
                var habilitationDto = new HabilitationIDLabelDto
                {
                    Id = habilitation.Id,
                    Label = habilitation.Label,
                    HabilitationAdmins = habilitation.HabilitationAdmins.Select(a => new HabilitationUniqAdminDto
                    {
                        Id = a.Id
                    }).ToList()
                };

                return Ok(habilitationDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // POST: Create Habilitation
        [HttpPost]
        public async Task<ActionResult<HabilitationIDLabelDto>> CreateHabilitationAsync(HabilitationIDLabelDto habilitationDto)
        {
            if (habilitationDto == null || string.IsNullOrEmpty(habilitationDto.Label))
            {
                return BadRequest("L'habilitation est invalide ou le label est manquant.");
            }

            try
            {
                var habilitation = new Habilitation
                {
                    Label = habilitationDto.Label,
                    HabilitationAdmins = new List<HabilitationAdmin>()
                };

                if (habilitationDto.HabilitationAdmins != null)
                {
                    foreach (var adminDto in habilitationDto.HabilitationAdmins)
                    {
                        var existingAdmin = await _context.HabilitationAdmins.FindAsync(adminDto.Id);
                        if (existingAdmin != null)
                        {
                            habilitation.HabilitationAdmins.Add(existingAdmin);
                        }
                    }
                }

                _context.Habilitations.Add(habilitation);
                await _context.SaveChangesAsync();

                habilitationDto.Id = habilitation.Id;

                return Ok(habilitationDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur serveur interne : {ex.Message}");
            }
        }

        
        [HttpPut("editHabilitation/{id}")]
        public async Task<ActionResult<HabilitationIDLabelDto>> UpdateHabilitationAsync(
            int id,
            UpdateHabilitationDto updateDto)
        {
            if (updateDto == null)
            {
                return BadRequest("Les données de mise à jour sont invalides.");
            }

            try
            {
                // Rechercher l'habilitation dans la base de données
                var habilitation = await _context.Habilitations
                    .Include(h => h.HabilitationAdmins)
                    .FirstOrDefaultAsync(h => h.Id == id);

                if (habilitation == null)
                {
                    return NotFound($"L'habilitation avec l'ID {id} n'existe pas.");
                }

                // Mise à jour du label si fourni
                if (!string.IsNullOrEmpty(updateDto.Label))
                {
                    habilitation.Label = updateDto.Label;
                }

                // Ajout de nouveaux administrateurs si spécifiés
                if (updateDto.AddedHabilitationAdmins != null)
                {
                    foreach (var adminDto in updateDto.AddedHabilitationAdmins)
                    {
                        var admin = await _context.HabilitationAdmins.FindAsync(adminDto.Id);
                        if (admin != null && !habilitation.HabilitationAdmins.Any(a => a.Id == admin.Id))
                        {
                            habilitation.HabilitationAdmins.Add(admin);
                        }
                    }
                }

                // Suppression d'administrateurs existants si spécifiés
                if (updateDto.RemovedHabilitationAdmins != null)
                {
                    var adminsToRemove = habilitation.HabilitationAdmins
                        .Where(a => updateDto.RemovedHabilitationAdmins.Any(r => r.Id == a.Id))
                        .ToList();

                    foreach (var admin in adminsToRemove)
                    {
                        habilitation.HabilitationAdmins.Remove(admin);
                    }
                }

                // Enregistrer les modifications
                await _context.SaveChangesAsync();

                // Mapper et retourner l'habilitation mise à jour
                var updatedDto = new HabilitationIDLabelDto
                {
                    Id = habilitation.Id,
                    Label = habilitation.Label,
                    HabilitationAdmins = habilitation.HabilitationAdmins
                        .Select(a => new HabilitationUniqAdminDto
                        {
                            Id = a.Id,
                            Name = a.Name
                        })
                        .ToList()
                };

                return Ok(updatedDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur serveur interne : {ex.Message}");
            }
        }



        // Get all HabilitationAdmins
        [HttpGet("admins")]
        public async Task<ActionResult<List<HabilitationUniqAdminDto>>> GetAllHabilitationAdminsAsync()
        {
            try
            {
                var habilitationAdmins = await _context.HabilitationAdmins
                    .Include(ha => ha.Section)
                    .Select(ha => new HabilitationUniqAdminDto
                    {
                        Id = ha.Id,
                        Name = ha.Name,
                        SectionName = ha.Section.Name
                    })
                    .ToListAsync();

                return Ok(habilitationAdmins);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Une erreur s'est produite : " + ex.Message);
            }
        }


        // POST: Create HabilitationAdmin
        [HttpPost("addAdmin")]
        public async Task<ActionResult<HabilitationAdmin>> CreateHabilitationAdmin([FromBody] HabilitationAdminCreateDto habilitationAdminDto)
        {
            if (habilitationAdminDto == null || string.IsNullOrEmpty(habilitationAdminDto.Name) || habilitationAdminDto.SectionId <= 0)
            {
                return BadRequest("Le nom est manquant, ou le section est invalide.");
            }

            try
            {
                // Vérifiez si la section existe
                var section = await _context.Sections.FindAsync(habilitationAdminDto.SectionId);
                if (section == null)
                {
                    return BadRequest("L'ID de la section spécifiée n'existe pas.");
                }

                // Crée une nouvelle instance de HabilitationAdmin
                var habilitationAdmin = new HabilitationAdmin
                {
                    Name = habilitationAdminDto.Name,
                    SectionId = habilitationAdminDto.SectionId,
                    IsGranted = true // IsGranted est toujours vrai
                };

                // Ajoute à la base de données
                _context.HabilitationAdmins.Add(habilitationAdmin);
                await _context.SaveChangesAsync();

                return Ok(habilitationAdmin);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Une erreur s'est produite : " + ex.Message);
            }
        }



        [HttpDelete("admins/{id}")]
        public async Task<ActionResult> DeleteHabilitationAdmin(int id)
        {
            try
            {
                var habilitationAdmin = await _context.HabilitationAdmins.FindAsync(id);
                if (habilitationAdmin == null)
                {
                    return NotFound("Le specification n'existe pas");
                }

                _context.HabilitationAdmins.Remove(habilitationAdmin);
                await _context.SaveChangesAsync();

                return NoContent(); // Retourne un statut 204 No Content en cas de succès
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Une erreur s'est produite lors de la suppression : " + ex.Message);
            }
        }

        [HttpGet("section")]
        public async Task<ActionResult<List<Section>>> GetAllSection()
        {
            try
            {
                var sections = await _context.Sections
                    .ToListAsync();

                return Ok(sections);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Une erreur s'est produite : " + ex.Message);
            }
        }
    }

    public class UpdateHabilitationDto
    {   
        public string? Label { get; set; }
        public List<HabilitationAdminDto>? AddedHabilitationAdmins { get; set; }
        public List<HabilitationAdminDto>? RemovedHabilitationAdmins { get; set; }
    }

    public class HabilitationAdminDto
    {
        public int Id { get; set; }
    }


}
