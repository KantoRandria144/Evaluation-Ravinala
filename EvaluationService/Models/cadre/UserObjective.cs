using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EvaluationService.Models
{
    public class UserObjective
    {
        [Key]
        public int ObjectiveId { get; set; }

        [Required]
        public string Description { get; set; }

        [Required]
        public decimal Weighting { get; set; }

        public string? ResultIndicator { get; set; }

        [Required]
        public decimal? Result { get; set; } = 0;

        // Foreign keys
        public int UserEvalId { get; set; }
        public int PriorityId { get; set; }

        [Required]
        public string CreatedBy {get; set;}

        [Required]
        public DateTime CreatedAt {get; set;}

        // Navigation properties
        [ForeignKey("UserEvalId")]
        [JsonIgnore]
        public UserEvaluation UserEvaluation { get; set; }

        [ForeignKey("PriorityId")]
        public TemplateStrategicPriority TemplateStrategicPriority { get; set; }

        public ICollection<ObjectiveColumnValue> ObjectiveColumnValues { get; set; }
    }   
}