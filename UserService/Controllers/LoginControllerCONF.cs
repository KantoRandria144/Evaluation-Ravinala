// using System;
// using System.IdentityModel.Tokens.Jwt;
// using System.Security.Claims;
// using System.Text;
// using Microsoft.IdentityModel.Tokens;
// using System.Collections.Generic;
// using System.Linq;
// using System.Threading.Tasks;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;
// using Microsoft.Extensions.Configuration;
// using Microsoft.Extensions.Logging;
// using UserService.Data;
// using UserService.DTOs;
// using System.DirectoryServices.AccountManagement;
// using UserService.Models;

// namespace UserService.Controllers
// {
//     [Route("api/[controller]")]
//     [ApiController]
//     public class LoginController : ControllerBase
//     {
//         private readonly AppdbContext _context;
//         private readonly IConfiguration _configuration;
//         private readonly ILogger<LoginController> _logger;

//         public LoginController(AppdbContext context, IConfiguration configuration, ILogger<LoginController> logger)
//         {
//             _context = context;
//             _configuration = configuration;
//             _logger = logger;
//         }

//         [HttpPost]
//         public async Task<IActionResult> Login([FromBody] LoginModel login)
//         {
//             if (!ModelState.IsValid)
//             {
//                 return BadRequest(new { Message = "Données invalides", Type = "validation_error" });
//             }

//             var result = await ValidateUser(login.Username, login.Password);
//             if (result.Type == "success")
//             {
//                 var token = GenerateJwtTokens(result.User);

//                 var cookieOptions = new CookieOptions
//                 {
//                     HttpOnly = true,
//                     Secure = true,
//                     SameSite = SameSiteMode.Strict,
//                     Expires = DateTime.UtcNow.AddDays(5),
//                     MaxAge = TimeSpan.FromDays(5),
//                     Path = "/",
//                 };

//                 Response.Cookies.Append("AuthToken", token, cookieOptions);

//                 _logger.LogInformation($"Connexion réussie pour l'utilisateur {result.User.Email}");
//                 return Ok(new { token, user = result.User, result.Message, result.Type });
//             }
//             else
//             {
//                 _logger.LogWarning($"Échec de connexion pour {login.Username} : {result.Message}");
//                 if (result.Type == "incorrect_pass" || result.Type == "unknown_user")
//                 {
//                     return Unauthorized(new { result.Message, result.Type });
//                 }
//                 return BadRequest(new { result.Message, result.Type });
//             }
//         }

//         [HttpPost("logout")]
//         public IActionResult Logout()
//         {
//             Response.Cookies.Delete("AuthToken", new CookieOptions
//             {
//                 HttpOnly = true,
//                 Secure = true,
//                 SameSite = SameSiteMode.Strict,
//                 Path = "/",
//             });
//             _logger.LogInformation("Déconnexion réussie");
//             return Ok(new { message = "Déconnecté avec succès" });
//         }

//         private async Task<ValidationResult> ValidateUser(string username, string password)
//         {
//             try
//             {
//                 return await FallbackValidateAsync(username, password);
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Erreur lors de l'authentification pour {Username}", username);
//                 return new ValidationResult { Message = "Une erreur s'est produite lors de l'authentification", Type = "error" };
//             }
//         }

//         private async Task<ValidationResult> FallbackValidateAsync(string username, string password)
//         {
//             var hardcodedUsers = new Dictionary<string, (string Password, string Email)>
//             {
//                 ["00446"] = ("1234", "christelle.rakotomavo@ravinala-airports.aero"),
//                 ["st154"] = ("1234", "miantsafitia.rakotoarimanana@ravinala-airports.aero"),
//                 ["st155"] = ("1234", "mandaniaina.andriambololona@ravinala-airports.aero"),
//                 ["00358"] = ("1234", "hery.rasolofondramanambe@ravinala-airports.aero"),
//                 ["00182"] = ("1234", "sedera.rasolomanana@ravinala-airports.aero"),
//                 ["00418"] = ("1234", "damien.andriantsilavina@ravinala-airports.aero"),
//                 ["st144"] = ("1234", "kanto.randriamampianina@ravinala-airports.aero"),
//                 ["00386"] = ("1234", "dominique.rakotomamonjy@ravinala-airports.aero"),
//             };

//             // Normaliser le nom d'utilisateur (minuscules pour éviter les problèmes de casse)
//             var normalizedUsername = username.ToLowerInvariant();
            
//             if (hardcodedUsers.TryGetValue(normalizedUsername, out var info) && info.Password == password)
//             {
//                 _logger.LogInformation($"Utilisateur {username} authentifié via fallback");
//                 var dbUser = await GetUserFromDatabaseAsync(info.Email);
                
//                 if (dbUser == null)
//                 {
//                     _logger.LogWarning($"Utilisateur {username} authentifié mais non trouvé en base avec l'email {info.Email}");
//                     return new ValidationResult { Message = "Utilisateur non trouvé en base de données", Type = "db_not_found" };
//                 }

//                 // Vérifiez si TypeUser est null
//                 if (dbUser.TypeUser == null)
//                 {
//                     return new ValidationResult { Message = "Vous ne pouvez pas accéder. Veuillez contacter l'administrateur.", Type = "type_user_missing" };
//                 }

//                 return new ValidationResult { Message = "Success", Type = "success", User = dbUser };
//             }

//             _logger.LogWarning($"Échec d'authentification fallback pour {username}");
//             return new ValidationResult { Message = "Authentification échouée.", Type = "invalid_credentials" };
//         }

//         private async Task<UserDTO?> GetUserFromDatabaseAsync(string? emailAddress)
//         {
//             try
//             {
//                 if (string.IsNullOrEmpty(emailAddress))
//                 {
//                     _logger.LogWarning("EmailAddress est null ou vide dans GetUserFromDatabaseAsync");
//                     return null;
//                 }

//                 _logger.LogInformation($"Recherche de l'utilisateur avec l'email: {emailAddress}");

//                 var user = await _context.Users
//                     .Include(u => u.Habilitations)
//                         .ThenInclude(h => h.HabilitationAdmins)
//                     .Where(u => u.Email == emailAddress)
//                     .Select(u => new UserDTO
//                     {
//                         Id = u.Id,
//                         Matricule = u.Matricule,
//                         Name = u.Name,
//                         Email = u.Email,
//                         Department = u.Department == "Direction des Systèmes d'Information" ? "DSI" : u.Department,
//                         Poste = u.Poste,
//                         SuperiorId = u.SuperiorId,
//                         SuperiorName = u.SuperiorName,
//                         Status = u.Status,
//                         TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : null,
//                         Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
//                         {
//                             Id = h.Id,
//                             Label = h.Label,
//                             HabilitationAdmins = h.HabilitationAdmins.Select(ha => new HabilitationUniqAdminDto
//                             {
//                                 Id = ha.Id
//                             }).ToList()
//                         }).ToList()
//                     }).FirstOrDefaultAsync();

//                 if (user == null)
//                 {
//                     _logger.LogWarning($"Aucun utilisateur trouvé avec l'email: {emailAddress}");
//                 }
//                 else
//                 {
//                     _logger.LogInformation($"Utilisateur trouvé: {user.Name} ({user.Email})");
//                 }

//                 return user;
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Erreur dans GetUserFromDatabaseAsync pour l'email: {Email}", emailAddress);
//                 return null;
//             }
//         }

//         private string GenerateJwtTokens(UserDTO user)
//         {
//             var jwtSecret = _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret manquant dans la configuration");
//             var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
//             var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

//             var claims = new[]
//             {
//                 new Claim(JwtRegisteredClaimNames.Sub, user.Email),
//                 new Claim(JwtRegisteredClaimNames.Name, user.Name),
//                 new Claim(JwtRegisteredClaimNames.Jti, user.Id.ToString()),
//                 new Claim("TypeUser", user.TypeUser ?? string.Empty),
//                 new Claim("Matricule", user.Matricule ?? string.Empty)
//             };

//             var token = new JwtSecurityToken(
//                 issuer: _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer manquant"),
//                 audience: _configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Jwt:Audience manquant"),
//                 claims: claims,
//                 expires: DateTime.UtcNow.AddDays(5),
//                 signingCredentials: credentials
//             );

//             return new JwtSecurityTokenHandler().WriteToken(token);
//         }
//     }

//     public class LoginModel
//     {
//         public string Username { get; set; } = string.Empty;
//         public string Password { get; set; } = string.Empty;
//     }

//     public class ValidationResult
//     {
//         public string Message { get; set; } = string.Empty;
//         public string Type { get; set; } = string.Empty;
//         public UserDTO? User { get; set; }
//     }
// }





















////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////















// using System;
// using System.IdentityModel.Tokens.Jwt;
// using System.Security.Claims;
// using System.Text;
// using Microsoft.IdentityModel.Tokens;
// using System.Collections.Generic;
// using System.Linq;
// using System.Threading.Tasks;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.EntityFrameworkCore;
// using Microsoft.Extensions.Configuration;
// using Microsoft.Extensions.Logging;
// using UserService.Data;
// using UserService.DTOs;
// using System.DirectoryServices.AccountManagement;

// namespace UserService.Controllers
// {
//     [Route("api/[controller]")]
//     [ApiController]
//     public class LoginController : ControllerBase
//     {
//         private readonly AppdbContext _context;
//         private readonly IConfiguration _configuration;
//         private readonly ILogger<LoginController> _logger;

//         public LoginController(AppdbContext context, IConfiguration configuration, ILogger<LoginController> logger)
//         {
//             _context = context;
//             _configuration = configuration;
//             _logger = logger;
//         }

//         [HttpPost]
//         public async Task<IActionResult> Login([FromBody] LoginModel login)
//         {
//             if (!ModelState.IsValid)
//             {
//                 return BadRequest(new { Message = "Données invalides", Type = "validation_error" });
//             }

//             var result = await ValidateUser(login.Username, login.Password);
//           if (result.Type == "success")
//             {
//                 var token = GenerateJwtTokens(result.User);

//                 var cookieOptions = new CookieOptions
//                 {
//                     HttpOnly = true,
//                     Secure = true,
//                     SameSite = SameSiteMode.Strict,
//                     Expires = DateTime.UtcNow.AddDays(5),
//                     MaxAge = TimeSpan.FromDays(5),
//                     Path = "/",
//                 };

//                 Response.Cookies.Append("AuthToken", token, cookieOptions);

//                 _logger.LogInformation($"Connexion réussie pour l'utilisateur {result.User.Email}");
//                 return Ok(new { token, user = result.User, result.Message, result.Type });
//             }
//             else
//             {
//                 _logger.LogWarning($"Échec de connexion pour {login.Username} : {result.Message}");
//                 if (result.Type == "incorrect_pass" || result.Type == "unknown_user")
//                 {
//                     return Unauthorized(new { result.Message, result.Type });
//                 }
//                 return BadRequest(new { result.Message, result.Type });

//             }
//         }


//         [HttpPost("logout")]
//         public IActionResult Logout()
//         {
//             Response.Cookies.Delete("AuthToken", new CookieOptions
//             {
//                 HttpOnly = true,
//                 Secure = true,
//                 SameSite = SameSiteMode.Strict,
//                 Path = "/",
//             });
//             _logger.LogInformation("Déconnexion réussie");
//             return Ok(new { message = "Déconnecté avec succès" });
//         }

        

//         private async Task<ValidationResult> ValidateUser(string username, string password)
//         {
//             try
//             {
//                 using (var context = new PrincipalContext(ContextType.Domain, "corp.ravinala"))
//                 {
//                     // Vérifiez si le nom d'utilisateur ou l'email existe
//                     var user = UserPrincipal.FindByIdentity(context, username);

//                     if (user == null)
//                     {
//                         return new ValidationResult { Message = "Mail incorrect ou inexistant", Type = "unknown_user" };
//                     }

//                     // Vérifiez si le compte est bloqué avant la validation
//                     if (user.IsAccountLockedOut())
//                     {
//                         return new ValidationResult { Message = "Trop de tentatives échouées, veuillez réessayer dans quelques minutes", Type = "account_locked" };
//                     }

//                     // Validation temporaire pour tests : Mot de passe fixe "Vina@2025!!!"
//                     // En production, remplacez par : bool isValid = context.ValidateCredentials(username, password, ContextOptions.Negotiate);
//                     bool isValid = password == "Vina@2025!!!";


//                     if (isValid)
//                     {
//                         // Vérifiez si EmailAddress est valide
//                         if (string.IsNullOrEmpty(user.EmailAddress))
//                         {
//                             return new ValidationResult { Message = "Email non configuré dans AD", Type = "invalid_email" };
//                         }

//                         var userConnected = await _context.Users
//                             .Where(u => u.Email == user.EmailAddress)
//                             .Select(u => new UserDTO
//                             {
//                                 Id = u.Id,
//                                 Matricule = u.Matricule,
//                                 Name = u.Name,
//                                 Email = u.Email,
//                                 Department = u.Department == "Direction des Systèmes d'Information" ? "DSI" : u.Department,
//                                 Poste = u.Poste,
//                                 SuperiorId = u.SuperiorId,
//                                 SuperiorName = u.SuperiorName,
//                                 Status = u.Status,
//                                 TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : null,
//                                 Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
//                                 {
//                                     Id = h.Id,
//                                     Label = h.Label,
//                                     HabilitationAdmins = h.HabilitationAdmins.Select(ha => new HabilitationUniqAdminDto
//                                     {
//                                         Id = ha.Id
//                                     }).ToList()
//                                 }).ToList()
//                             }).FirstOrDefaultAsync();

//                         if (userConnected == null)
//                         {
//                             return new ValidationResult { Message = "Utilisateur non trouvé en base de données", Type = "db_not_found" };
//                         }

//                         // Vérifiez si TypeUser est null
//                         if (userConnected.TypeUser == null)
//                         {
//                             return new ValidationResult { Message = "Vous ne pouvez pas accéder. Veuillez contacter l'administrateur.", Type = "type_user_missing" };
//                         }


//                         return new ValidationResult { Message = "Success", Type = "success", User = userConnected };
//                     }
//                     else
//                     {
//                         await Task.Delay(2000); // Délai anti-brute-force
//                         return new ValidationResult { Message = "Mot de passe incorrect", Type = "incorrect_pass" };
//                     }
//                 }
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError(ex, "Erreur lors de l'authentification pour {Username}", username);
//                 return new ValidationResult { Message = "Une erreur s'est produite lors de l'authentification", Type = "error" };
//             }
//         }

//         private string GenerateJwtTokens(UserDTO user)
//         {
//             var jwtSecret = _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret manquant dans la configuration");
//             var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
//             var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

//             var claims = new[]
//             {
//                 new Claim(JwtRegisteredClaimNames.Sub, user.Email),
//                 new Claim(JwtRegisteredClaimNames.Name, user.Name),
//                 new Claim(JwtRegisteredClaimNames.Jti, user.Id.ToString()),
//                 new Claim("TypeUser", user.TypeUser ?? string.Empty)
//             };

//             var token = new JwtSecurityToken(
//                 issuer: _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer manquant"),
//                 audience: _configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Jwt:Audience manquant"),
//                 claims: claims,
//                 expires: DateTime.UtcNow.AddDays(5),
//                 signingCredentials: credentials
//             );

//             return new JwtSecurityTokenHandler().WriteToken(token);
//         }
//     }

//     public class LoginModel
//     {
//         public string Username { get; set; } = string.Empty;
//         public string Password { get; set; } = string.Empty;
//     }

//     public class ValidationResult
//     {
//         public string Message { get; set; } = string.Empty;
//         public string Type { get; set; } = string.Empty;
//         public UserDTO? User { get; set; }
//     }
// }