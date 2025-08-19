using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using UserService.Models.log;

namespace UserService.Models
{
    public enum EmployeeType
    {
        Cadre = 0,
        NonCadre = 1
    }

    public class User
    {
        [Key]
        public string Id { get; set; } 
        public string Matricule {get; set;}     
        public string Name { get; set; }            
        public string Email { get; set; }           
        public string? Poste { get; set; }           
        public string? Department { get; set; }      
        public string? SuperiorId { get; set; }      
        public string? SuperiorName { get; set; }
        public string? Status { get; set; }
        public string? Signature {get;set;}
        
        public EmployeeType? TypeUser { get; set; }
        public List<Habilitation> Habilitations { get; set; }
        
        public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    }
}