using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class UserCompetence
    {
        [Key]
        public int UserCompetenceId { get; set; }

        [ForeignKey("UserEvaluation")]
        [Required]
        public int UserEvalId { get; set; }

        [ForeignKey("Competence")]
        [Required]
        public int CompetenceId { get; set; }

        [Required]
        public decimal Performance { get; set; }

        // Navigation properties for foreign keys
        public virtual UserEvaluation UserEvaluation { get; set; }
        public virtual Competence Competence { get; set; }
    }
}