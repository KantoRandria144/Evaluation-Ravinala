using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class Etat
    {
        [Key]
        public int EtatId { get; set; }
        [Required]
        public string EtatDesignation {get; set;}
    }
}