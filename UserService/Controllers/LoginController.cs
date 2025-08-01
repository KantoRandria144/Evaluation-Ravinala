using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using UserService.Data;
using UserService.DTOs;
using System.DirectoryServices.AccountManagement;

namespace UserService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LoginController : ControllerBase
    {

        private readonly AppdbContext _context;
        private readonly IConfiguration _configuration;

        public LoginController(AppdbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost]
        public async Task<IActionResult> Login([FromBody] LoginModel login)
        {
            var result = await ValidateUser(login.Username, login.Password);
            if (result.Type == "success")
            {

                var token = GenerateJwtTokens(result.User);

                var cookieoptions = new CookieOptions
                {
                    HttpOnly = false,
                    Secure = false,
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTime.UtcNow.AddDays(5),
                    Path = "/",
                };

                Response.Cookies.Append("AuthToken", token, cookieoptions);


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
                using (var context = new PrincipalContext(ContextType.Domain, "corp.ravinala"))
                {
                    // Vérifiez si le nom d'utilisateur ou l'email existe
                    var user = UserPrincipal.FindByIdentity(context, username);

                    if (user == null)
                    {
                        return new ValidationResult { Message = "Mail incorrect ou inexistant", Type = "unknown_user" };
                    }

                    // Vérifiez si le compte est bloqué avant la validation
                    if (user.IsAccountLockedOut())
                    {
                        return new ValidationResult { Message = "Trop de tentatives échouées, veuillez réessayer dans quelques minutes", Type = "unknown_user" };
                    }

                    // Validez les identifiants
                    bool isValid = context.ValidateCredentials(username, password, ContextOptions.Negotiate);
                    if (isValid)
                    {
                        var userConnected = await _context.Users
                            .Where(u => u.Email == user.EmailAddress)
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

                        // Vérifiez si TypeUser est null
                        if (userConnected.TypeUser == null)
                        {
                            return new ValidationResult { Message = "Vous ne pouvez pas acceder. Veuillez contacter l'administrateur.", Type = "type_user_missing" };
                        }

                        return new ValidationResult { Message = "Success", Type = "success", User = userConnected };
                    }
                    else
                    {
                        await Task.Delay(2000);
                        return new ValidationResult { Message = "Mot de passe incorrect", Type = "incorrect_pass" };
                    }
                }
            }
            catch (Exception ex)
            {
                return new ValidationResult { Message = "An error occurred during authentication", Type = "error" };
            }
        }




        private string GenerateJwtTokens(UserDTO user)
        {
            var secutityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Secret"]));
            var credentials = new SigningCredentials(secutityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.Name),
                new Claim(JwtRegisteredClaimNames.Jti, user.Id)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audiance"],
                claims: claims,
                expires: DateTime.Now.AddDays(5),
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
        public string Message { get; set; }
        public string Type { get; set; }
        public UserDTO User { get; set; }
    }
}