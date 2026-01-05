using System.ComponentModel.DataAnnotations;
using System.DirectoryServices;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.DTOs;
using UserService.Models;

namespace UserService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly AppdbContext _context;

        public UserController(AppdbContext context)
        {
            _context = context;
        }


        [HttpPost("populate")]
        public ActionResult PopulateUsersFromAD()
        {
            try
            {
                var adUsers = BuildFullOrganisationHierarchy();
                if (adUsers == null || adUsers.Count == 0)
                {
                    return StatusCode(500, "Failed to retrieve users from Active Directory.");
                }

                var users = MapADUsersToUsers(adUsers);
                int batchSize = 10;
                for (int i = 0; i < users.Count; i += batchSize)
                {
                    var batch = users.Skip(i).Take(batchSize).ToList();

                    try
                    {
                        _context.Users.AddRange(batch);
                        _context.SaveChanges();
                    }
                    catch (Exception ex)
                    {
                        return StatusCode(500, $"Internal server error on transaction: {ex.Message}");
                    }
                }

                return Ok("Users have been successfully populated from Active Directory");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        private List<UserAD> BuildFullOrganisationHierarchy()
        {
            List<UserAD> users = GetUsersFromActiveDirectory();
            UserAD manager;
            // var usersDictionary = new Dictionary<string, UserAD>();

            foreach (var user in users)
            {
                manager = GetManager(user.DisplayName, user.Email);
                user.DirectReports.Add(manager);
            }
            return users;
        }

        private List<UserAD> GetUsersFromActiveDirectory()
        {
            List<UserAD> users = new List<UserAD>();
            string domainPath = "LDAP://corp.ravinala";

            using (DirectoryEntry directoryEntry = new DirectoryEntry(domainPath))
            {
                using (DirectorySearcher searcher = new DirectorySearcher(directoryEntry))
                {

                    searcher.Filter = "(objectClass=user)";
                    searcher.PropertiesToLoad.Add("displayName");
                    searcher.PropertiesToLoad.Add("mail");
                    searcher.PropertiesToLoad.Add("title");
                    searcher.PropertiesToLoad.Add("userDn");
                    searcher.PropertiesToLoad.Add("department");
                    searcher.PropertiesToLoad.Add("ObjectGUID");
                    searcher.PropertiesToLoad.Add("userAccountControl");
                    searcher.PropertiesToLoad.Add("sAMAccountName");
                    searcher.PageSize = 2000;


                    foreach (SearchResult result in searcher.FindAll())
                    {
                        DirectoryEntry userEntry = result.GetDirectoryEntry();
                        string displayName = userEntry.Properties["displayName"].Value?.ToString();
                        string mail = userEntry.Properties["mail"].Value?.ToString();
                        string matricule = userEntry.Properties["sAMAccountName"].Value?.ToString();

                        if (!string.IsNullOrEmpty(displayName) && !displayName.EndsWith("$") && !string.IsNullOrEmpty(mail))
                        {

                            // Conversion de l'ObjectGUID en une chaîne de caractères
                            byte[] objectGuidBytes = (byte[])userEntry.Properties["ObjectGUID"][0];
                            string objectGuidString = new Guid(objectGuidBytes).ToString();

                            bool isActive = IsAccountActive(userEntry);

                            if (isActive)
                            {

                                users.Add(new UserAD
                                {
                                    DisplayName = displayName,
                                    Email = mail,
                                    Title = userEntry.Properties["title"].Count > 0
                                        ? userEntry.Properties["title"][0]?.ToString()
                                        : "",
                                    UserDn = userEntry.Properties["userDn"].Count > 0
                                        ? userEntry.Properties["userDn"][0]?.ToString()
                                        : "",
                                    Department = userEntry.Properties["department"].Count > 0
                                        ? userEntry.Properties["department"][0]?.ToString()
                                        : "",
                                    Id = objectGuidString,
                                    DirectReports = new List<UserAD>(),
                                    IsActive = isActive,
                                    Matricule = matricule,
                                });
                            }
                        }
                    }
                }
            }
            return users;
        }

        // [HttpGet("test-ad-users")]
        // public IActionResult TestGetUsersFromAD()
        // {
        //     try
        //     {
        //         List<UserAD> users = GetUsersFromActiveDirectory();
        //         if (users == null || users.Count == 0)
        //         {
        //             return NotFound("No users found.");
        //         }
        //         return Ok(users);
        //     }
        //     catch (Exception ex)
        //     {
        //         return StatusCode(500, $"Internal server error: {ex.Message}");
        //     }
        // }


        private bool IsAccountActive(DirectoryEntry userEntry)
        {
            const int UF_ACCOUNTDISABLE = 0x0002;
            int userAccountControl = (int)userEntry.Properties["userAccountControl"].Value;
            bool isActive = (userAccountControl & UF_ACCOUNTDISABLE) == 0;
            return isActive;
        }

        private UserAD GetManager(string displayName = null, string mail = null)
        {
            string domainPath = "LDAP://corp.ravinala";
            string managerDn = null;
            UserAD manager = null;

            using (DirectoryEntry directoryEntry = new DirectoryEntry(domainPath))
            {
                using (DirectorySearcher searcher = new DirectorySearcher(directoryEntry))
                {
                    if (!string.IsNullOrEmpty(displayName))
                    {
                        searcher.Filter = $"(&(objectClass=user)(displayName={displayName}))";
                    }
                    else if (!string.IsNullOrEmpty(mail))
                    {
                        searcher.Filter = $"(&(objectClass=user)(mail={mail}))";
                    }
                    else
                    {
                        throw new ArgumentException("Either displayName or mail must be provided.");
                    }

                    searcher.PropertiesToLoad.Add("manager");

                    SearchResult result = searcher.FindOne();
                    if (result != null)
                    {
                        managerDn = result.Properties["manager"]?.Count > 0
                            ? result.Properties["manager"][0]?.ToString()
                            : null;
                    }
                }
            }

            if (!string.IsNullOrEmpty(managerDn))
            {
                using (DirectoryEntry directoryEntry = new DirectoryEntry(domainPath))
                {
                    using (DirectorySearcher searcher = new DirectorySearcher(directoryEntry))
                    {
                        searcher.Filter = $"(distinguishedName={managerDn})";
                        searcher.PropertiesToLoad.Add("displayName");
                        searcher.PropertiesToLoad.Add("mail");
                        searcher.PropertiesToLoad.Add("title");
                        searcher.PropertiesToLoad.Add("department");
                        searcher.PropertiesToLoad.Add("ObjectGUID");
                        searcher.PropertiesToLoad.Add("sAMAccountName");

                        SearchResult result = searcher.FindOne();
                        if (result != null)
                        {

                            // Conversion de l'ObjectGUID en une chaîne de caractères
                            byte[] objectGuidBytes = (byte[])result.Properties["ObjectGUID"][0];
                            string objectGuidString = new Guid(objectGuidBytes).ToString();
                            manager = new UserAD
                            {
                                DisplayName = result.Properties["displayName"]?.Count > 0
                                    ? result.Properties["displayName"][0]?.ToString()
                                    : "",
                                Email = result.Properties["mail"]?.Count > 0
                                    ? result.Properties["mail"][0]?.ToString()
                                    : "",
                                Title = result.Properties["title"]?.Count > 0
                                    ? result.Properties["title"][0]?.ToString()
                                    : "",
                                Id = objectGuidString,
                                Department = result.Properties["department"]?.Count > 0
                                    ? result.Properties["department"][0]?.ToString()
                                    : ""
                            };
                        }
                    }
                }
            }

            return manager;
        }

        // [HttpGet("testGetManager")]
        // public ActionResult TestGetManager()
        // {
        //     string testDisplayName = "Vonjimampianina RAKOTOARISOA (DSI)";
        //     string testEmail = "vonji.rakotoarisoa@ravinala-airports.aero";

        //     UserAD manager = GetManager(displayName: testDisplayName, mail: testEmail);

        //     if (manager != null)
        //     {
        //         return Ok(manager);  // Retourne les infos du manager en JSON
        //     }
        //     else
        //     {
        //         return NotFound("Manager not found");
        //     }
        // }


        private List<User> MapADUsersToUsers(List<UserAD> adUsers)
        {
            var users = new List<User>();
            try
            {
                foreach (var adUser in adUsers)
                {
                    string depart = adUser?.Department;
                    if (string.IsNullOrEmpty(adUser?.Department) && adUser.DisplayName.Contains("("))
                    {
                        depart = adUser?.DisplayName?.Split('(', ')')[1].Trim();
                    }
                    {

                        var user = new User
                        {
                            Id = adUser?.Id,
                            Name = adUser?.DisplayName,
                            Email = adUser?.Email,
                            Poste = adUser?.Title,
                            Department = depart,
                            SuperiorId = adUser?.DirectReports?.FirstOrDefault()?.Id,
                            SuperiorName = adUser?.DirectReports?.FirstOrDefault()?.DisplayName,
                            Matricule = adUser?.Matricule
                        };

                        users.Add(user);
                    }

                }
                return users;
            }

            catch (Exception ex)
            {
                Console.WriteLine("Error here");
                Console.WriteLine(ex.ToString());
                return users;
            }
        }

        // Assign habilitations to user
        [HttpPost("assign-habilitations")]
        public async Task<IActionResult> AssignHabilitations([FromBody] AssignHabilitationDto dto)
        {
            try
            {
                // Retrieve all users based on the provided user IDs, including their existing habilitations
                var users = await _context.Users.Include(u => u.Habilitations)
                    .Where(u => dto.UserIds.Contains(u.Id))
                    .ToListAsync();

                if (users.Count != dto.UserIds.Count)
                {
                    return BadRequest("Some users were not found");
                }

                if (!dto.HabilitationIds.Any())
                {
                    foreach (var user in users)
                    {
                        user.Habilitations.Clear();
                    }
                }
                else
                {
                    // Retrieve all habilitations based on the provided habilitation IDs
                    var habilitations = await _context.Habilitations
                        .Where(h => dto.HabilitationIds.Contains(h.Id))
                        .ToListAsync();

                    if (habilitations.Count != dto.HabilitationIds.Count)
                    {
                        return BadRequest("Some habilitations were not found");
                    }

                    // Assign habilitations only if the user doesn't already have them
                    foreach (var user in users)
                    {
                        foreach (var habilitation in habilitations)
                        {
                            // Check if the user already has the habilitation to avoid duplicates
                            if (!user.Habilitations.Any(h => h.Id == habilitation.Id))
                            {
                                user.Habilitations.Add(habilitation);
                            }
                        }
                    }
                }

                await _context.SaveChangesAsync();
                return Ok("Habilitation(s) assigned successfully, avoiding duplicates.");
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Internal server error: {e.Message}");
            }
        }

        [HttpPost("remove-habilitations")]
        public async Task<IActionResult> RemoveHabilitations([FromBody] RemoveHabilitationDto dto)
        {
            try
            {
                // Récupérer tous les utilisateurs concernés, y compris leurs habilitations existantes
                var users = await _context.Users.Include(u => u.Habilitations)
                    .Where(u => dto.UserIds.Contains(u.Id))
                    .ToListAsync();

                if (users.Count != dto.UserIds.Count)
                {
                    return BadRequest("Certains utilisateurs n'ont pas été trouvés.");
                }

                // Vérifier si des habilitations sont spécifiées
                if (!dto.HabilitationIds.Any())
                {
                    return BadRequest("Aucune habilitation à supprimer n'a été spécifiée.");
                }

                // Récupérer les habilitations à supprimer basées sur les IDs fournis
                var habilitationsToRemove = await _context.Habilitations
                    .Where(h => dto.HabilitationIds.Contains(h.Id))
                    .ToListAsync();

                if (habilitationsToRemove.Count != dto.HabilitationIds.Count)
                {
                    return BadRequest("Certaines habilitations n'ont pas été trouvées.");
                }

                // Supprimer les habilitations spécifiées pour chaque utilisateur
                foreach (var user in users)
                {
                    user.Habilitations.RemoveAll(h => dto.HabilitationIds.Contains(h.Id));
                }

                await _context.SaveChangesAsync();
                return Ok("Habilitation(s) supprimée(s) avec succès.");
            }
            catch (Exception e)
            {
                return StatusCode(500, $"Erreur interne du serveur : {e.Message}");
            }
        }

        [HttpGet]
        [Route("all")]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetAllUser([FromQuery] UserSearchDTO dto)
        {
            try
            {
                var query = _context.Users.AsQueryable();

                if (!string.IsNullOrEmpty(dto.NameOrMail))
                {
                    query = query.Where(x => x.Name.Contains(dto.NameOrMail) || x.Email.Contains(dto.NameOrMail));
                }

                if (!string.IsNullOrEmpty(dto.Department))
                {
                    query = query.Where(u => u.Department == dto.Department);
                }

                if (!string.IsNullOrEmpty(dto.Habilitation))
                {
                    query = query.Where(u => u.Habilitations.Any(h => h.Label == dto.Habilitation));
                }

                if (!string.IsNullOrEmpty(dto.TypeUser))
                {
                    // Tenter de parser la chaîne en EmployeeType
                    if (Enum.TryParse<EmployeeType>(dto.TypeUser, ignoreCase: true, out var typeUserEnum))
                    {
                        query = query.Where(u => u.TypeUser == typeUserEnum);
                    }
                    else
                    {
                        return BadRequest($"TypeUser invalide : {dto.TypeUser}");
                    }
                }

                // Ajout de la condition pour le Matricule
                if (!string.IsNullOrEmpty(dto.Matricule))
                {
                    query = query.Where(u => u.Matricule.Contains(dto.Matricule));
                }

                var users = await query
                    .OrderBy(x => x.Name)
                    .Select(u => new UserDTO
                    {
                        Id = u.Id,
                        Matricule = u.Matricule,
                        Name = u.Name ?? "",
                        Email = u.Email ?? "",
                        Department = u.Department != null ? (u.Department == "Direction des Systèmes d'Information" ? "DSI" : u.Department) : "",
                        Poste = u.Poste ?? "",
                        SuperiorId = u.SuperiorId ?? "",
                        SuperiorName = u.SuperiorName ?? "",
                        Status = u.Status ?? "",
                        TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : "",
                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label ?? ""
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }



        [HttpGet]
        [Route("all-cadre")]
        public async Task<ActionResult<IEnumerable<User>>> GetAllCadreUsers([FromQuery] UserSearchDTO dto)
        {
            try
            {
                // Filtrer initialement pour les utilisateurs de type Cadre
                var query = _context.Users.Where(u => u.TypeUser == EmployeeType.Cadre).AsQueryable();

                if (!string.IsNullOrEmpty(dto.NameOrMail))
                {
                    query = query.Where(x => x.Name.Contains(dto.NameOrMail) || x.Email.Contains(dto.NameOrMail));
                }
                if (!string.IsNullOrEmpty(dto.Department))
                {
                    query = query.Where(u => u.Department == dto.Department);
                }
                if (!string.IsNullOrEmpty(dto.Habilitation))
                {
                    query = query.Where(u => u.Habilitations.Any(h => h.Label == dto.Habilitation));
                }

                var users = await query
                    .OrderBy(x => x.Name)
                    .Select(u => new UserDTO
                    {
                        Id = u.Id,
                        Name = u.Name ?? "",
                        Email = u.Email ?? "",
                        Department = u.Department != null ? u.Department == "Direction des Systèmes d'Information" ? "DSI" : u.Department : "",
                        Poste = u.Poste ?? "",
                        SuperiorId = u.SuperiorId ?? "",
                        SuperiorName = u.SuperiorName ?? "",
                        Status = u.Status ?? "",
                        TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : "",
                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label ?? ""
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet]
        [Route("all-non-cadre")]
        public async Task<ActionResult<IEnumerable<User>>> GetAllNonCadreUsers([FromQuery] UserSearchDTO dto)
        {
            try
            {
                // Filtrer initialement pour les utilisateurs de type NonCadre
                var query = _context.Users.Where(u => u.TypeUser == EmployeeType.NonCadre).AsQueryable();

                if (!string.IsNullOrEmpty(dto.NameOrMail))
                {
                    query = query.Where(x => x.Name.Contains(dto.NameOrMail) || x.Email.Contains(dto.NameOrMail));
                }
                if (!string.IsNullOrEmpty(dto.Department))
                {
                    query = query.Where(u => u.Department == dto.Department);
                }
                if (!string.IsNullOrEmpty(dto.Habilitation))
                {
                    query = query.Where(u => u.Habilitations.Any(h => h.Label == dto.Habilitation));
                }

                var users = await query
                    .OrderBy(x => x.Name)
                    .Select(u => new UserDTO
                    {
                        Id = u.Id,
                        Name = u.Name ?? "",
                        Email = u.Email ?? "",
                        Department = u.Department != null ? u.Department == "Direction des Systèmes d'Information" ? "DSI" : u.Department : "",
                        Poste = u.Poste ?? "",
                        SuperiorId = u.SuperiorId ?? "",
                        SuperiorName = u.SuperiorName ?? "",
                        Status = u.Status ?? "",
                        TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : "",
                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label ?? ""
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet]
        [Route("all-null-type")]
        public async Task<ActionResult<IEnumerable<User>>> GetAllUsersWithNullType([FromQuery] UserSearchDTO dto)
        {
            try
            {
                // Filtrer initialement pour les utilisateurs ayant un TypeUser null
                var query = _context.Users.Where(u => u.TypeUser == null).AsQueryable();

                if (!string.IsNullOrEmpty(dto.NameOrMail))
                {
                    query = query.Where(x => x.Name.Contains(dto.NameOrMail) || x.Email.Contains(dto.NameOrMail));
                }
                if (!string.IsNullOrEmpty(dto.Department))
                {
                    query = query.Where(u => u.Department == dto.Department);
                }
                if (!string.IsNullOrEmpty(dto.Habilitation))
                {
                    query = query.Where(u => u.Habilitations.Any(h => h.Label == dto.Habilitation));
                }

                var users = await query
                    .OrderBy(x => x.Name)
                    .Select(u => new UserDTO
                    {
                        Id = u.Id,
                        Matricule = u.Matricule,
                        Name = u.Name ?? "",
                        Email = u.Email ?? "",
                        Department = u.Department != null ? u.Department == "Direction des Systèmes d'Information" ? "DSI" : u.Department : "",
                        Poste = u.Poste ?? "",
                        SuperiorId = u.SuperiorId ?? "",
                        SuperiorName = u.SuperiorName ?? "",
                        Status = u.Status ?? "",
                        TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : "",
                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label ?? ""
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpGet("user")]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetAllUser()
        {
            try
            {
                var users = await _context.Users
                    .OrderBy(x => x.Name)
                    .Select(u => new UserDTO
                    {
                        Id = u.Id,
                        Matricule = u.Matricule,
                        Name = u.Name ?? "",
                        Email = u.Email ?? "",
                        Department = u.Department != null
                            ? u.Department == "Direction des Systèmes d'Information"
                                ? "DSI"
                                : u.Department
                            : "",
                        Poste = u.Poste ?? "",
                        SuperiorId = u.SuperiorId ?? "",
                        SuperiorName = u.SuperiorName ?? "",
                        Status = u.Status ?? "",
                        TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : "Aucun",
                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label ?? ""
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("userType")]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetAllUserOnlyWithTypeUserNotNull()
        {
            try
            {
                var users = await _context.Users
                    // On ne prend que ceux qui ont un TypeUser non nul
                    .Where(u => u.TypeUser.HasValue)
                    .OrderBy(x => x.Name)
                    .Select(u => new UserDTO
                    {
                        Id = u.Id,
                        Matricule = u.Matricule,
                        Name = u.Name ?? "",
                        Email = u.Email ?? "",
                        Department = u.Department != null
                            ? (u.Department == "Direction des Systèmes d'Information"
                                ? "DSI"
                                : u.Department)
                            : "",
                        Poste = u.Poste ?? "",
                        SuperiorId = u.SuperiorId ?? "",
                        SuperiorName = u.SuperiorName ?? "",
                        Status = u.Status ?? "",

                        // Ici, on peut se contenter de convertir directement,
                        // sachant que TypeUser n'est pas nul grâce au Where(...)
                        TypeUser = u.TypeUser.Value.ToString(),

                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label ?? ""
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        [HttpGet("user/{id}")]
        public async Task<ActionResult<UserDTO>> GetUserById(string id)
        {
            try
            {
                // Rechercher l'utilisateur par son ID
                var user = await _context.Users
                    .Where(u => u.Id == id)
                    .Select(u => new UserDTO
                    {
                        Id = u.Id,
                        Matricule = u.Matricule,
                        Name = u.Name ?? "",
                        Email = u.Email ?? "",
                        Department = u.Department != null
                            ? u.Department == "Direction des Systèmes d'Information"
                                ? "DSI"
                                : u.Department
                            : "",
                        Poste = u.Poste ?? "",
                        SuperiorId = u.SuperiorId ?? "",
                        SuperiorName = u.SuperiorName ?? "",
                        Status = u.Status ?? "",
                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label ?? ""
                        }).ToList()
                    })
                    .FirstOrDefaultAsync();

                // Vérifier si l'utilisateur existe
                if (user == null)
                {
                    return NotFound(new { Message = "Utilisateur non trouvé" });
                }

                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        // Fonction pour obtenir tous les utilisateurs dont TypeUser est null
        [HttpGet("users-with-null-type")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsersWithNullType()
        {
            var usersWithNullType = await _context.Users
                .Where(u => u.TypeUser == null)
                .ToListAsync();

            return Ok(usersWithNullType);
        }

        [HttpGet("users-with-type")]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetUsersByType([FromQuery] string type)
        {
            var query = _context.Users.AsQueryable();

            // Convertir le type de chaîne en enum EmployeeType si possible
            if (!string.IsNullOrEmpty(type) && Enum.TryParse<EmployeeType>(type, true, out var parsedType))
            {
                query = query.Where(u => u.TypeUser == parsedType);
            }
            else
            {
                // Si le type est nul ou ne correspond pas, obtenir les utilisateurs sans type
                query = query.Where(u => u.TypeUser == null);
            }

            // Sélectionner et transformer TypeUser en chaîne
            var usersWithType = await query
                .Select(u => new UserDTO
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    Department = u.Department,
                    Poste = u.Poste,
                    SuperiorId = u.SuperiorId,
                    SuperiorName = u.SuperiorName,
                    Status = u.Status,
                    TypeUser = u.TypeUser.HasValue ? u.TypeUser.ToString() : null,  // Convertir EmployeeType en string
                })
                .ToListAsync();

            return Ok(usersWithType);
        }

        [HttpGet("users-cadre")]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetUsersCadre()
        {
            var usersCadre = await _context.Users
                .Where(u => u.TypeUser == EmployeeType.Cadre)
                .Select(u => new UserDTO
                {
                    Id = u.Id,
                    Matricule = u.Matricule,
                    Name = u.Name ?? "",
                    Email = u.Email ?? "",
                    Department = u.Department ?? "",
                    Poste = u.Poste ?? "",
                    SuperiorId = u.SuperiorId,
                    SuperiorName = u.SuperiorName,
                    Status = u.Status,
                    TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : null,
                    Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                    {
                        Id = h.Id,
                        Label = h.Label ?? ""
                    }).ToList()
                })
                .ToListAsync();

            return Ok(usersCadre);
        }


        [HttpGet("users-non-cadre")]
        public async Task<ActionResult<IEnumerable<UserDTO>>> GetUsersNonCadre()
        {
            var usersNonCadre = await _context.Users
                .Where(u => u.TypeUser == EmployeeType.NonCadre)
                .Select(u => new UserDTO
                {
                    Id = u.Id,
                    Matricule = u.Matricule,
                    Name = u.Name ?? "",
                    Email = u.Email ?? "",
                    Department = u.Department ?? "",
                    Poste = u.Poste ?? "",
                    SuperiorId = u.SuperiorId,
                    SuperiorName = u.SuperiorName,
                    Status = u.Status,
                    TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : null,
                    Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                    {
                        Id = h.Id,
                        Label = h.Label ?? ""
                    }).ToList()
                })
                .ToListAsync();

            return Ok(usersNonCadre);
        }


        [HttpPut("update-users-type")]
        public async Task<IActionResult> UpdateUsersType([FromBody] UpdateUsersTypeDto dto)
        {
            if (dto.UserIds == null || !dto.UserIds.Any())
            {
                return BadRequest("La liste des utilisateurs est vide.");
            }

            var users = await _context.Users.Where(u => dto.UserIds.Contains(u.Id)).ToListAsync();

            if (!users.Any())
            {
                return NotFound("Aucun utilisateur trouvé avec les IDs fournis.");
            }

            users.ForEach(u => u.TypeUser = dto.NewType);
            await _context.SaveChangesAsync();

            return Ok("Les types d'utilisateur ont été mis à jour avec succès.");
        }

        private bool IsValidBase64(string base64String)
        {
            if (string.IsNullOrWhiteSpace(base64String)) return false;

            Span<byte> buffer = new Span<byte>(new byte[base64String.Length]);
            return Convert.TryFromBase64String(base64String, buffer, out _);
        }

        [HttpPut("update-user-signature")]
        public async Task<IActionResult> UpdateUserSignature([FromBody] UpdateUsersSignatureDto dto)
        {
            if (string.IsNullOrEmpty(dto.UserId))
            {
                return BadRequest(new
                {
                    message = "L'ID de l'utilisateur est requis."
                });
            }

            if (!IsValidBase64(dto.NewSignature))
            {
                return BadRequest(new
                {
                    message = "La signature fournie n'est pas valide"
                });
            }

            var user = await _context.Users.FindAsync(dto.UserId);

            if (user == null)
            {
                return NotFound(new
                {
                    message = "Utilisateur non trouvé avec l'ID fourni."
                });
            }

            user.Signature = dto.NewSignature;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "La signature de l'utilisateur a été mise à jour avec succès."
            });
        }




        [HttpGet]
        [Route("departments")]
        public async Task<ActionResult<IEnumerable<string>>> GetAllDepartment()
        {
            try
            {
                var users = await _context.Users.ToListAsync();

                var departments = users
                    .Select(x => string.IsNullOrWhiteSpace(x.Department) ? "Vide" :
                    x.Department == "Direction des Systèmes d'Information" ? "DSI" : x.Department
                    )
                    .Distinct()
                    .OrderBy(dept => dept)
                    .ToList();

                return Ok(departments);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        //all user from AD
        [HttpGet]
        [Route("AD")]
        public ActionResult<IEnumerable<UserAD>> GetAllUserAD()
        {
            try
            {
                var users = GetUsersFromActiveDirectory();
                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        //habilitation par personne
        [HttpGet]
        [Route("habilitation/{id}")]
        public async Task<ActionResult<IEnumerable<User>>> GetUserHabilitation(string id)
        {
            try
            {
                var user = await _context.Users
                    .Where(x => x.Id == id)
                    .Select(u => new UserDTO
                    {
                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label ?? "",
                            HabilitationAdmins = h.HabilitationAdmins.Select(ha => new HabilitationUniqAdminDto
                            {
                                Id = ha.Id,

                            }).ToList()
                        }).ToList()
                    }).FirstOrDefaultAsync();

                if (user == null)
                {
                    return NotFound($"User with ID {id} not found.");
                }

                return Ok(user);
            }
            catch (System.Exception ex)
            {

                return StatusCode(500, $"Internal server error: {ex.Message}");

            }
        }

        [HttpGet("user-habilitations/{id}")]
        public async Task<ActionResult<UserHabilitationDto>> GetUserHabilitationsWithAdmins(string id)
        {
            try
            {
                // Rechercher l'utilisateur avec ses habilitations et habilitationsAdmins
                var user = await _context.Users
                    .Where(u => u.Id == id)
                    .Select(u => new UserHabilitationDto
                    {
                        Id = u.Id,
                        Name = u.Name,
                        Email = u.Email,
                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label,
                            HabilitationAdmins = h.HabilitationAdmins.Select(ha => new HabilitationUniqAdminDto
                            {
                                Id = ha.Id,
                                Name = ha.Name,
                                SectionName = ha.Section.Name
                            }).ToList()
                        }).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (user == null)
                {
                    return NotFound($"Utilisateur avec l'ID {id} non trouvé.");
                }

                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Erreur interne du serveur : {ex.Message}");
            }
        }


        // GET api/userAD/manager
        [HttpGet("AD/manager")]
        public ActionResult<UserAD> GetManagers([FromQuery] string? displayName = null, [FromQuery] string? mail = null)
        {
            try
            {
                if (string.IsNullOrEmpty(displayName) && string.IsNullOrEmpty(mail))
                {
                    return BadRequest("Either displayName or mail must be provided.");
                }

                var manager = displayName != null && mail != null ? GetManager(displayName, mail) : null;
                if (manager != null)
                {
                    return Ok(manager);
                }
                return NotFound("Manager not found.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // GET api/userAD/hierarchy
        [HttpGet("AD/hierarchy")]
        public ActionResult<IEnumerable<UserAD>> GetFullOrganisationHierarchy()
        {
            try
            {
                var hierarchy = BuildFullOrganisationHierarchy();
                return Ok(hierarchy);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("user/manager")]
        public async Task<UserDTO> GetManagerByUserIdAsync(string userId)
        {
            try
            {
                if (string.IsNullOrEmpty(userId))
                {
                    throw new ArgumentException("User ID must be provided.");
                }

                // Récupérer l'utilisateur à partir de son ID
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                {
                    throw new KeyNotFoundException("User not found.");
                }

                if (string.IsNullOrEmpty(user.SuperiorId))
                {
                    throw new InvalidOperationException("The user does not have a manager assigned.");
                }

                // Récupérer le manager à partir de l'ID du manager de l'utilisateur
                var manager = await _context.Users.FirstOrDefaultAsync(u => u.Id == user.SuperiorId);

                if (manager == null)
                {
                    throw new KeyNotFoundException("Manager not found.");
                }

                // Mapper les données du manager dans un objet UserDTO
                var managerDto = new UserDTO
                {
                    Id = manager.Id,
                    Matricule = manager.Matricule,
                    Email = manager.Email,
                    Name = manager.Name,
                    Department = manager.Department,
                    Poste = manager.Poste,
                    SuperiorId = manager.SuperiorId,
                    SuperiorName = manager.SuperiorName,
                    Status = manager.Status,
                    TypeUser = manager.TypeUser.HasValue ? manager.TypeUser.ToString() : null,
                    Habilitations = manager.Habilitations?.Select(h => new HabilitationIDLabelDto
                    {
                        Id = h.Id,
                        Label = h.Label
                    }).ToList() ?? new List<HabilitationIDLabelDto>() // Utiliser une liste vide si null
                };

                return managerDto;
            }
            catch (Exception ex)
            {
                // Log the error
                Console.WriteLine($"An error occurred: {ex.Message}");
                throw;
            }
        }


        [HttpGet("user/subordonates")]
        public async Task<IEnumerable<UserDTO>> GetUsersBySuperiorIdAsync(string superiorId)
        {
            try
            {
                if (string.IsNullOrEmpty(superiorId))
                {
                    throw new ArgumentException("Superior ID must be provided.");
                }

                var allSubordinates = await GetAllSubordinatesRecursive(superiorId);

                return allSubordinates;
            }
            catch (Exception ex)
            {
                // Log the error
                Console.WriteLine($"An error occurred: {ex.Message}");
                throw;
            }
        }

        private async Task<List<UserDTO>> GetAllSubordinatesRecursive(string superiorId)
        {
            var directSubordinates = await _context.Users
                .Where(u => u.SuperiorId == superiorId)
                .Select(u => new UserDTO
                {
                    Id = u.Id,
                    Matricule = u.Matricule,
                    Email = u.Email,
                    Name = u.Name,
                    Department = u.Department,
                    Poste = u.Poste,
                    SuperiorId = u.SuperiorId,
                    SuperiorName = u.SuperiorName,
                    Status = u.Status,
                    TypeUser = u.TypeUser.HasValue ? u.TypeUser.ToString() : null,
                    Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                    {
                        Id = h.Id,
                        Label = h.Label
                    }).ToList()
                }).ToListAsync();

            var allSubordinates = new List<UserDTO>(directSubordinates);

            // Récursion pour chaque subordonné direct
            foreach (var subordinate in directSubordinates)
            {
                var children = await GetAllSubordinatesRecursive(subordinate.Id);
                allSubordinates.AddRange(children);
            }

            return allSubordinates;
        }

        // ACTUALIZE
        [HttpPost("Actualize")]
        public async Task<IActionResult> ActualiseUsers()
        {
            try
            {
                // get the user from Active directory
                var adUsers = BuildFullOrganisationHierarchy();
                // get users from bdd
                var dbUsers = await _context.Users.ToListAsync();

                // Create dictionary for fast comparison
                var adUserDict = adUsers.ToDictionary(x => x.Id);
                var dbUsersDict = dbUsers.ToDictionary(x => x.Id);

                // List for modification
                var usersToAdd = new List<User>();
                var usersToUpdate = new List<User>();
                var usersToDelete = new List<User>();



                // Compare and add new users (in AD but not in bd)
                foreach (var adUser in adUsers)
                {


                    if (!dbUsersDict.ContainsKey(adUser.Id))
                    {
                        var profilePicture = "https://ravinalaairportsmadagascar.sharepoint.com/_vti_bin/afdcache.ashx/_userprofile/userphoto.jpg?_oat_=1727750452_23b68f353d771a83e90931346b581ed0192096ce5e332065c363bf4e5faf1901&P1=1727697792&P2=2073235389&P3=1&P4=bFvxgEa8MLJ4hEnnyCRLnbDKAnGjvd27wO74GExZ%2B6qjzFWAZrlCiYQ%2FsXPeOUOVD%2B%2BxfOxWRPBLK918UPbrfj7FB5edhWDhHtZkZyhUZoVH2Wkh1ihWOpMO7T32XRsPJCUG03h%2FrobkSMMNkpc3Je%2BM6VFS5pOi0QrnCTRjfrTx0uTVDRlhpGfFf%2FXjYG%2F%2FRXSnEQIsavdKD8f7qkj4fjmJbLdTvuFzU73HKSFO0NZ7x5gUYur%2BRZiyxNjIzVVtOzxpD6MVSSY4m18kSe6BxGJprEBFUlqVAn02Afy5pnO7lXEtSM5fmc9fMcYrM9kovWgMeHGnDJzLPAsT9pqinA%3D%3D&size=S&accountname=";
                        var directReports = adUser.DirectReports;
                        var superior = directReports?.FirstOrDefault();

                        usersToAdd.Add(new User
                        {
                            Id = adUser.Id,
                            Matricule = adUser.Matricule,
                            Name = adUser.DisplayName,
                            Email = adUser.Email,
                            Department = adUser.Department,
                            Poste = adUser.Title,
                            SuperiorId = superior?.Id,
                            SuperiorName = superior?.DisplayName,
                        });
                    }
                }



                // Compare and update existing user (id AD and DB but different data)
                foreach (var dbUser in dbUsers)
                {
                    if (adUserDict.TryGetValue(dbUser.Id, out var aduser))
                    {
                        var profilePicture = "https://ravinalaairportsmadagascar.sharepoint.com/_vti_bin/afdcache.ashx/_userprofile/userphoto.jpg?_oat_=1727750452_23b68f353d771a83e90931346b581ed0192096ce5e332065c363bf4e5faf1901&P1=1727697792&P2=2073235389&P3=1&P4=bFvxgEa8MLJ4hEnnyCRLnbDKAnGjvd27wO74GExZ%2B6qjzFWAZrlCiYQ%2FsXPeOUOVD%2B%2BxfOxWRPBLK918UPbrfj7FB5edhWDhHtZkZyhUZoVH2Wkh1ihWOpMO7T32XRsPJCUG03h%2FrobkSMMNkpc3Je%2BM6VFS5pOi0QrnCTRjfrTx0uTVDRlhpGfFf%2FXjYG%2F%2FRXSnEQIsavdKD8f7qkj4fjmJbLdTvuFzU73HKSFO0NZ7x5gUYur%2BRZiyxNjIzVVtOzxpD6MVSSY4m18kSe6BxGJprEBFUlqVAn02Afy5pnO7lXEtSM5fmc9fMcYrM9kovWgMeHGnDJzLPAsT9pqinA%3D%3D&size=S&accountname=";


                        var directReports = aduser.DirectReports;
                        var superior = directReports.FirstOrDefault();
                        var superiorId = aduser?.DirectReports?.FirstOrDefault()?.Id;
                        var superiorName = aduser?.DirectReports?.FirstOrDefault()?.DisplayName;

                        string? depart = aduser?.Department;

                        if (string.IsNullOrEmpty(aduser?.Department) && aduser.DisplayName.Contains('('))
                        {
                            depart = aduser?.DisplayName?.Split('(', ')')[1].Trim();
                        }

                        if (dbUser.Name != aduser?.DisplayName || dbUser.Email != aduser?.Email ||
                            dbUser.Department != depart || dbUser.Poste != aduser?.Title ||
                            dbUser.SuperiorId != superiorId || dbUser.SuperiorName != superiorName)
                        {
                            dbUser.Matricule = aduser.Matricule;
                            dbUser.Name = aduser?.DisplayName;
                            dbUser.Email = aduser?.Email;
                            dbUser.Department = depart;
                            dbUser.Poste = aduser?.Title;
                            dbUser.SuperiorId = superiorId;
                            dbUser.SuperiorName = superiorName;

                            usersToUpdate.Add(dbUser);
                        }
                    }
                    else
                    {
                        // If the user is no longer in AD, mark for deletion
                        usersToDelete.Add(dbUser);
                    }
                }

                // Applyings the changes
                if (usersToAdd.Count != 0)
                {
                    int batchSize = 10;
                    for (int i = 0; i < usersToAdd.Count; i += batchSize)
                    {
                        var batch = usersToAdd.Skip(i).Take(batchSize).ToList();
                        try
                        {
                            _context.Users.AddRange(batch);
                            await _context.SaveChangesAsync();
                        }
                        catch (Exception ex)
                        {
                            return StatusCode(500, $"Internal server error on transaction user add update: {ex.Message}");

                        }
                    }
                }
                if (usersToUpdate.Count != 0)
                {
                    int batchSize = 10;
                    for (int i = 0; i < usersToUpdate.Count; i += batchSize)
                    {
                        var batch = usersToUpdate.Skip(i).Take(batchSize).ToList();
                        try
                        {
                            _context.Users.UpdateRange(batch);
                        }
                        catch (Exception ex)
                        {
                            return StatusCode(500, $"Internal server error on transaction user update: {ex.Message}");

                        }
                    }
                }
                if (usersToDelete.Count != 0)
                {
                    int batchSize = 10;
                    for (int i = 0; i < usersToDelete.Count; i += batchSize)
                    {
                        var batch = usersToDelete.Skip(i).Take(batchSize).ToList();
                        try
                        {
                            _context.Users.RemoveRange(batch);
                        }
                        catch (Exception ex)
                        {
                            return StatusCode(500, $"Internal server error on transaction deleted update: {ex.Message}");

                        }
                    }
                }
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Added = usersToAdd.Count,
                    Updated = usersToUpdate.Count,
                    Deleted = usersToDelete.Count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}. Inner exception: {ex.InnerException?.Message}");
            }

        }
    }
    public class UpdateUsersTypeDto
    {
        public List<string> UserIds { get; set; } = new List<string>();
        public EmployeeType NewType { get; set; }
    }

    public class RemoveHabilitationDto
    {
        public List<string> UserIds { get; set; } // IDs des utilisateurs
        public List<int> HabilitationIds { get; set; } // IDs des habilitations à supprimer
    }

    public class UpdateUsersSignatureDto
    {
        public string UserId { get; set; }

        [StringLength(65536, ErrorMessage = "Le fichier ne peut pas dépasser 64 Ko.")]
        public string NewSignature { get; set; }
    }

}






// $ldapPath = "LDAP://corp.ravinala"
// $username = "st124"
// $password = "chr1stina@!!"

// try {
//     # Créer un objet DirectoryEntry avec le nom d'utilisateur et le mot de passe
//     $entry = New-Object System.DirectoryServices.DirectoryEntry($ldapPath, $username, $password)

//     # Créer un DirectorySearcher
//     $searcher = New-Object System.DirectoryServices.DirectorySearcher($entry)
//     $searcher.Filter = "(objectClass=user)"

//     # Trouver tous les résultats
//     $results = $searcher.FindAll()

//     # Afficher les noms affichés des utilisateurs
//     foreach ($result in $results) {
//         $result.Properties["displayName"],
//         $result.Properties["mail"]
//     }
// } catch {
//     Write-Host "Erreur : $_"
// }
