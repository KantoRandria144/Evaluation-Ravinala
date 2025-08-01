using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class Level
    {
        [Key]
        public int LevelId { get; set; }

        [Required]
        [MaxLength(50)]
        public string LevelName { get; set; }

        public virtual ICollection<CompetenceLevel> CompetenceLevels { get; set; }
    }
}