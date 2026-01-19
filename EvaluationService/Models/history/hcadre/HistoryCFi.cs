using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class HistoryCFi
    {
        [Key]
        public int HcfiId { get; set; }

        [ForeignKey("UserEvaluation")]
        public int UserEvalId { get; set; }

        [Required]
        public string PriorityName { get; set; }

        [Required]
        public string Description { get; set; }

        [Required]
        public decimal Weighting { get; set; }

        public string ResultIndicator { get; set; }

        [Required]
        public decimal Result { get; set; }
        
        public string? ValidatedBy {get; set;}
        public string? ManagerComment { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public virtual UserEvaluation UserEvaluation { get; set; }
    }
}