using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class Evaluation
    {
        [Key]
        public int EvalId { get; set; }

        [Required]
        public int EvalAnnee { get; set; }

        [Required]
        public DateTime FixationObjectif { get; set; }

        [Required]
        public DateTime MiParcours { get; set; }

        [Required]
        public DateTime Final { get; set; }

        [Required]
        public int EtatId { get; set; }

        // Foreign key
        public int TemplateId { get; set; }

        [Required]
        public string Titre {get; set;}

        [Required]
        public string Type {get;set;}
 
        [ForeignKey("EtatId")]
        public Etat Etat { get; set; }

        public decimal? CompetenceWeightTotal { get; set; }
        public decimal? IndicatorWeightTotal { get; set; }

        // Navigation properties
        [ForeignKey("TemplateId")]
        public FormTemplate FormTemplate { get; set; }
        public ICollection<UserEvaluation> UserEvaluations { get; set; }
    }
}