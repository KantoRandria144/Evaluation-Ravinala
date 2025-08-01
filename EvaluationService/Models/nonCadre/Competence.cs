using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class Competence
    {
        [Key]
        public int CompetenceId { get; set; }

        [Required]
        public int TemplateId { get; set; }

        [Required]
        public string Name { get; set; }

        // Foreign Key and Navigation Property
        [ForeignKey("TemplateId")]
        public virtual FormTemplate Template { get; set; }

        public virtual ICollection<CompetenceLevel> CompetenceLevels { get; set; }
        public virtual ICollection<UserCompetence> UserCompetences { get; set; }
    }
}