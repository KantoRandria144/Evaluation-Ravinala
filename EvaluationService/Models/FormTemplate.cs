using System.ComponentModel.DataAnnotations;

namespace EvaluationService.Models
{
    public enum FormType
    {
        Cadre,
        NonCadre
    }
    public class FormTemplate
    {
        [Key]
        public int TemplateId { get; set; }

        [Required]
        [MaxLength(255)]
        public string Name { get; set; }

        [Required]
        public DateTime CreationDate { get; set; }

        [Required]
        public FormType Type { get; set; }

        // Navigation property
        public ICollection<TemplateStrategicPriority> TemplateStrategicPriorities { get; set; }
        public ICollection<Evaluation> Evaluations { get; set; }
        public ICollection<Competence> Competences { get; set; }
        public ICollection<Indicator> Indicators { get; set; }
    }
}