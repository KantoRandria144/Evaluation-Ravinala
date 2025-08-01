using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class UserHelpContent
    {
        [Key]
        public int ContentId { get; set; }

        [Required]
        public int UserEvalId { get; set; }

        [Required]
        public int HelpId { get; set; }

        [Required]
        public string WriterUserId { get; set; }

        public string Content { get; set; }

        // Foreign Keys and Navigation Properties
        [ForeignKey("UserEvalId")]
        public virtual UserEvaluation UserEvaluation { get; set; }

        [ForeignKey("HelpId")]
        public virtual Help Help { get; set; }
    }
}