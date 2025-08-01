using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class UserEvaluation
    {
        [Key]
        public int UserEvalId { get; set; }

        // Foreign keys
        public int EvalId { get; set; }
        public string UserId { get; set; }

        // Navigation properties
        [ForeignKey("EvalId")]
        public Evaluation Evaluation { get; set; }

        public ICollection<UserObjective> UserObjectives { get; set; }
        public ICollection<UserIndicator> UserIndicators { get; set; }
        public ICollection<UserHelpContent> UserHelpContents { get; set; }
    }
}