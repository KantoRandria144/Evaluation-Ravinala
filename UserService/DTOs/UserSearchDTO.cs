using Microsoft.AspNetCore.Mvc;

namespace UserService.DTOs
{
    public class UserSearchDTO
    {
        [FromQuery(Name = "m")]
        public string? Matricule { get; set; }
        public string? NameOrMail {get; set;}
        public string? Department {get; set;}
        public string? Habilitation {get; set;}
        public string? TypeUser { get; set; }

    }
}