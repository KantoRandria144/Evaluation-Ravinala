using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using UserService.Data;
using UserService.DTOs;
using System.DirectoryServices.AccountManagement;
using UserService.Service;

namespace UserService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LoginController : ControllerBase
    {
        private readonly AppdbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IAuditService _auditService;

        public LoginController(AppdbContext context, IConfiguration configuration, IAuditService auditService)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginModel login)
        {
            if (string.IsNullOrWhiteSpace(login.Username) || string.IsNullOrWhiteSpace(login.Password))
            {
                return BadRequest(new ValidationResult { Message = "Username and password are required", Type = "invalid_input" });
            }

            var result = await ValidateUser(login.Username, login.Password);

            if (result.Type == "success")
            {
                var token = GenerateJwtTokens(result.User);

                var cookieOptions = new CookieOptions
                {
                    HttpOnly = false,
                    Secure = false,
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTime.UtcNow.AddDays(5),
                    Path = "/",
                };

                Response.Cookies.Append("AuthToken", token, cookieOptions);

                return Ok(new { token, user = result.User, result.Message, result.Type });
            }
            else
            {
                var errorResponse = new { result.Message, result.Type };
                return Ok(errorResponse);

            }
        }


        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("AuthToken");
            return Ok(new { message = "Logged out successfully" });
        }

        

        private async Task<ValidationResult> ValidateUser(string username, string password)
        {
            try
            {
                string? domainPath = _configuration.GetSection("LdapSettings:DomainPath1").Value;
                if (string.IsNullOrEmpty(domainPath))
                    return new ValidationResult { Message = "LDAP configuration is missing", Type = "config_error" };

                using (var context = new PrincipalContext(ContextType.Domain, domainPath))
                {
                    var user = UserPrincipal.FindByIdentity(context, username);
                    if (user == null)
                        return new ValidationResult { Message = "Invalid or nonexistent user", Type = "unknown_user" };

                    if (user.IsAccountLockedOut())
                        return new ValidationResult { Message = "Account locked due to too many failed attempts", Type = "account_locked" };


                    // Validez les identifiants
                    // bool isValid = context.ValidateCredentials(username, password, ContextOptions.Negotiate);
                    bool isValid = true;

                    if (isValid)
                    {
                        var dbUser = await GetUserFromDatabaseAsync(user.EmailAddress);
                        if (dbUser == null)
                            return new ValidationResult { Message = "User not found in database", Type = "user_not_found" };


                        // Vérifiez si TypeUser est null
                        // if (userConnected.TypeUser == null)
                        // {
                        //     return new ValidationResult { Message = "Vous ne pouvez pas acceder. Veuillez contacter l'administrateur.", Type = "type_user_missing" };

                        // }
                        return new ValidationResult { Message = "Success", Type = "success", User = dbUser };
                    }
                    else
                    {
                        await Task.Delay(2000);
                        return new ValidationResult { Message = "Incorrect password", Type = "incorrect_password" };
                    }
                }
            }
            catch (PrincipalServerDownException)
            {
                return await FallbackValidateAsync(username, password);
            }
            catch (Exception ex)
            {
                return await FallbackValidateAsync(username, password);
                // Alternatively, you could return an error:
                // return new ValidationResult { Message = $"An error occurred during authentication: {ex.Message}", Type = "error" };
            }
        }

        private async Task<ValidationResult> FallbackValidateAsync(string username, string password)
        {
            var hardcodedUsers = new Dictionary<string, (string Password, string Email)>
            {
                ["testuser"] = ("1234", "miantsafitia.rakotoarimanana@ravinala-airports.aero"),
                ["st154"] = ("1234", "miantsafitia.rakotoarimanana@ravinala-airports.aero"),
                ["00358"] = ("1234", "hery.rasolofondramanambe@ravinala-airports.aero"),
                ["00182"] = ("1234", "sedera.rasolomanana@ravinala-airports.aero"),
                ["00446"] = ("1234", "christelle.rakotomavo@ravinala-airports.aero")
            };

            if (hardcodedUsers.TryGetValue(username, out var info) && info.Password == password)
            {
                var dbUser = await GetUserFromDatabaseAsync(info.Email);
                if (dbUser == null)
                    return new ValidationResult { Message = "User not found in database", Type = "user_not_found" };

                if (dbUser.TypeUser == null)
                    return new ValidationResult { Message = "Vous ne pouvez pas accéder. Veuillez contacter l'administrateur.", Type = "type_user_missing" };

                return new ValidationResult { Message = "Success", Type = "success", User = dbUser };
            }

            return new ValidationResult { Message = "Invalid credentials in fallback mode", Type = "invalid_credentials" };
        }

        private async Task<UserDTO?> GetUserFromDatabaseAsync(string? emailAddress)
        {
            try
            {
                if (string.IsNullOrEmpty(emailAddress))
                    return null;

                var user = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.Email == emailAddress)
                    .Select(u => new UserDTO
                    {
                        Id = u.Id,
                        Matricule = u.Matricule,
                        Name = u.Name,
                        Email = u.Email,
                        Department = u.Department == "Direction des Systèmes d'Information" ? "DSI" : u.Department,
                        Poste = u.Poste,
                        SuperiorId = u.SuperiorId,
                        SuperiorName = u.SuperiorName,
                        Status = u.Status,
                        TypeUser = u.TypeUser.HasValue ? u.TypeUser.Value.ToString() : null,
                        Habilitations = u.Habilitations.Select(h => new HabilitationIDLabelDto
                        {
                            Id = h.Id,
                            Label = h.Label,
                            HabilitationAdmins = h.HabilitationAdmins.Select(ha => new HabilitationUniqAdminDto
                            {
                                Id = ha.Id
                            }).ToList()
                        }).ToList()
                    }).FirstOrDefaultAsync();

                return user;
            }
            catch
            {
                return null;
            }
        }

        private string GenerateJwtTokens(UserDTO user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Name, user.Name ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, user.Id ?? string.Empty)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(5),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class LoginModel
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class ValidationResult
    {
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public UserDTO? User { get; set; }
    }
}