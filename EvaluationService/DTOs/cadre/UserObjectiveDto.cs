namespace EvaluationService.DTOs
{
    public class UserObjectiveDto
    {
        public int ObjectiveId { get; set; }
        public string Description { get; set; }
        public decimal Weighting { get; set; }
        public string ResultIndicator { get; set; }
        public decimal Result { get; set; }
        public decimal? CollaboratorResult { get; set; }
        public decimal? ManagerResult { get; set; }
        public string? ManagerComment { get; set; }
        public string? CollaboratorComment { get; set; }

        public TemplateStrategicPriorityDto? TemplateStrategicPriority { get; set; }
        public List<ColumnValueDto> ObjectiveColumnValues { get; set; }
    }
}