using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class UserIndicatorResult
    {
        [Key]
        public int ResultId { get; set; }

        [Required]
        public int UserIndicatorId { get; set; }

        [Required]        
        public string ResultText { get; set; }

        [Required]
        public decimal Result {get; set;}

        // Foreign Key and Navigation Property
        [ForeignKey("UserIndicatorId")]
        public virtual UserIndicator UserIndicator { get; set; }
    }
}