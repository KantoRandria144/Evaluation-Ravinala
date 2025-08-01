using System.ComponentModel.DataAnnotations;

namespace EvaluationService.Models
{
    public class HistoryUserHelpContent
    {
        [Key]
        public int HistoryContentId { get; set; }

        [Required]
        public int HelpId { get; set; }

        [Required]
        public string HelpName {get; set;}

        [Required]
        public int ContentId { get; set; }

        [Required]
        public int UserEvalId { get; set; }

        [Required]
        public string WriterUserId { get; set; }

        [Required]
        [MaxLength(255)]
        public string Content { get; set; }
        
        [Required]
        public DateTime ArchivedAt { get; set; } = DateTime.UtcNow;
    }
}