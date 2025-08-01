using EvaluationService.Models;

namespace EvaluationService.DTOs
{
    public class FormTemplateDto
    {
        public int TemplateId { get; set; }
        public string Name { get; set; }
        public DateTime CreationDate { get; set; }
        public FormType Type { get; set; }
        public string TypeName { get; set; }
        public List<TemplateStrategicPriorityDto> TemplateStrategicPriorities { get; set; }
    }
}