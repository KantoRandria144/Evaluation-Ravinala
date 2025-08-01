using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class UserEvaluationWeight
    {
        [Key]
        public int WeightId { get; set; }

        [Required]
        public int TemplateId { get; set; }

        [Required]
        public decimal CompetenceWeightTotal { get; set; }

        [Required]
        public decimal IndicatorWeightTotal { get; set; }

        // Foreign key relation
        [ForeignKey("TemplateId")]
        public FormTemplate FormTemplate { get; set; }
    }
}