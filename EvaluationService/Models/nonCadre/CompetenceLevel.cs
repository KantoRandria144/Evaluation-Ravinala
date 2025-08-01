using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class CompetenceLevel
    {
        [Key]
        public int CompetenceLevelId { get; set; }

        [Required]
        public int CompetenceId { get; set; }

        [Required]
        public int LevelId { get; set; }

        public string Description { get; set; }

        // Foreign Keys and Navigation Properties
        [ForeignKey("CompetenceId")]
        public virtual Competence Competence { get; set; }

        [ForeignKey("LevelId")]
        public virtual Level Level { get; set; }
    }
}