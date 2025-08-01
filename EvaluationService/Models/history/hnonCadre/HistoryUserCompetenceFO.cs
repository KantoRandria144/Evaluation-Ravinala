using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class HistoryUserCompetenceFO
    {
        [Key]
        public int HistoryUserCompetenceId { get; set; }

        [ForeignKey("UserEvaluation")]
        [Required]
        public int UserEvalId { get; set; }

        [Required]
        public string CompetenceName { get; set; }

        [Required]
        public decimal Performance { get; set; }

        // Navigation property for foreign key
        public virtual UserEvaluation UserEvaluation { get; set; }
    }
}