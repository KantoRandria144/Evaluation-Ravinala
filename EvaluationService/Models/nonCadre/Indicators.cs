using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class Indicator
    {
        [Key]
        public int IndicatorId { get; set; }

        [Required]
        public string label{get; set;}
        
        [Range(1, 3)]
        public int MaxResults { get; set; } = 3;
        public int TemplateId { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation properties
        [ForeignKey("TemplateId")]
        public FormTemplate FormTemplate { get; set; }
    }
}