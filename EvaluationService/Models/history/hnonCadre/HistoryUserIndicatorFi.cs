using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class HistoryUserindicatorFi
    {
        [Key]
        public int HistoryUserindicatorFiId { get; set; }

        [ForeignKey("UserEvaluation")]
        [Required]
        public int UserEvalId { get; set; }

        [Required]
        public string Name { get; set; }

        public string ResultText { get; set; }

        public decimal? Result { get; set; }

        public string? ValidatedBy {get; set;}

        [Required]
        public DateTime CreatedAt {get; set;}

        public virtual UserEvaluation UserEvaluation { get; set; }
    }
}