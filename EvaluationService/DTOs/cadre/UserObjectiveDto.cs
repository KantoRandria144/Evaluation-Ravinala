namespace EvaluationService.DTOs
{
    public class UserObjectiveDto
    {
        public int ObjectiveId { get; set; }
        public string Description { get; set; }
        public decimal Weighting { get; set; }
        public string ResultIndicator { get; set; }
        public decimal Result { get; set; }
        public TemplateStrategicPriorityDto TemplateStrategicPriority { get; set; }
        public List<ColumnValueDto> ObjectiveColumnValues { get; set; }
    }
}