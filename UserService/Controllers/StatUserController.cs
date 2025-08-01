using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Models;

namespace UserService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StatUserController : ControllerBase
    {
        private readonly AppdbContext _context;

        public StatUserController(AppdbContext context)
        {
            _context = context;
        }

        [HttpGet("user/subordinates/count")]
        public async Task<int> GetSubordinateCountBySuperiorIdAsync(string superiorId)
        {
            try
            {
                if (string.IsNullOrEmpty(superiorId))
                {
                    throw new ArgumentException("Superior ID must be provided.");
                }

                // Utiliser Entity Framework ou une autre méthode d'accès aux données pour interroger la base de données
                var count = await _context.Users.CountAsync(u => u.SuperiorId == superiorId);

                return count;
            }
            catch (Exception ex)
            {
                // Log l'erreur
                Console.WriteLine($"An error occurred: {ex.Message}");
                throw;
            }
        }


        [HttpGet("user/subordinates/countType")]
        public async Task<IActionResult> GetCount(string superiorId)
        {
            try
            {
                if (string.IsNullOrEmpty(superiorId))
                {
                    throw new ArgumentException("Superior ID must be provided.");
                }

                // Use Entity Framework to get the count of "Cadres" and "NonCadres"
                var cadresCount = await _context.Users.CountAsync(u => u.SuperiorId == superiorId && u.TypeUser == EmployeeType.Cadre);
                var nonCadresCount = await _context.Users.CountAsync(u => u.SuperiorId == superiorId && u.TypeUser == EmployeeType.NonCadre);

                // Create an object with the results
                var result = new
                {
                    CadresCount = cadresCount,
                    NonCadresCount = nonCadresCount
                };

                return Ok(result);  // Return the results as a JSON object
            }
            catch (Exception ex)
            {
                // Log the error
                Console.WriteLine($"An error occurred: {ex.Message}");
                return StatusCode(500, "Internal server error");
            }
        }



//admin
        [HttpGet("user/count")]
        public async Task<ActionResult<IDictionary<string, int>>> GetUserCountByType()
        {
            try
            {
                // Récupère les utilisateurs avec leur type
                var users = await _context.Users
                    .Select(u => new
                    {
                        TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : "Aucun",
                        IsCadre = u.TypeUser.HasValue && u.TypeUser.Value == EmployeeType.Cadre, 
                        IsNonCadre = u.TypeUser.HasValue && u.TypeUser.Value == EmployeeType.NonCadre 
                    })
                    .ToListAsync();

                // Comptabilise le nombre d'utilisateurs par type
                var userCountByType = users
                    .GroupBy(u => u.TypeUser)
                    .ToDictionary(g => g.Key, g => g.Count());

                // Comptabilise le total des utilisateurs de type 'Cadre' et 'NonCadre'
                int cadreCount = users.Count(u => u.IsCadre);
                int nonCadreCount = users.Count(u => u.IsNonCadre);

                // Ajoute un total combiné pour les 'Cadres' et 'NonCadres'
                int totalCadreNonCadre = cadreCount + nonCadreCount;

                // Ajoute ces totaux au dictionnaire
                userCountByType.Add("TotalCadreNonCadre", totalCadreNonCadre);

                return Ok(userCountByType);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("user/countByDepartment")]
        public async Task<ActionResult<IDictionary<string, int>>> GetUserCountByDepartment()
        {
            try
            {
                // Récupère les utilisateurs
                var users = await _context.Users
                    .Where(u => u.Department != null) // Assurez-vous que le département n'est pas nul
                    .Select(u => new
                    {
                        Department = u.Department
                    })
                    .ToListAsync();

                // Comptabilise le nombre d'utilisateurs par département
                var userCountByDepartment = users
                    .GroupBy(u => u.Department)
                    .ToDictionary(g => g.Key, g => g.Count());

                return Ok(userCountByDepartment);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

    }
}