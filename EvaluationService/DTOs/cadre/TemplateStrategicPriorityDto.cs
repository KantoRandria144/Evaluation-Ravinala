namespace EvaluationService.DTOs
{
    public class TemplateStrategicPriorityDto
    {
        public int TemplatePriorityId { get; set; }
        public string Name { get; set; }
        public int MaxObjectives { get; set; }
        public List<ObjectiveDto>? Objectives { get; set; }
    }
}