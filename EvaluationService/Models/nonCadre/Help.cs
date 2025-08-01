using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public enum AllowedUserRole
    {
        Collaborateur = 1,
        NPlus1 = 2,
        NPlus2 = 3
    }

    public class Help
    {
        [Key]
        public int HelpId { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public int TemplateId { get; set; }

        [ForeignKey("TemplateId")]
        public virtual FormTemplate Template { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

         [Required]
        public int AllowedUserLevel { get; set; } // 0: Collaborateur, 1: N+1, 2: N+2

        public virtual ICollection<UserHelpContent> UserHelpContents { get; set; }
    }
}