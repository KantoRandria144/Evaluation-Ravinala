using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EvaluationService.Models
{
    public class TemplateStrategicPriority
    {
        [Key]
        public int TemplatePriorityId { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public int MaxObjectives { get; set; } = 4;

        // Foreign key
        public int TemplateId { get; set; }

        [Required]
        public bool IsActif { get; set; } = true;

        // Navigation properties
        [ForeignKey("TemplateId")]
        public FormTemplate FormTemplate { get; set; }

         [JsonIgnore]
        public ICollection<UserObjective> UserObjectives { get; set; }
    }
}