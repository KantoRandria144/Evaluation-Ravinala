namespace EvaluationService.DTOs
{
    public class ObjectiveDto
    {
        public int PriorityId {get; set;}
        public string PriorityName {get; set;}
        public string Description { get; set; }
        public decimal Weighting { get; set; }
        public string ResultIndicator { get; set; }
        public decimal Result { get; set; }
        public string ManagerComment { get; set; }
        public decimal ManagerResult { get; set; }
        public int ObjectiveId { get; set; }
        public List<ColumnValueDto> DynamicColumns { get; set; }  // Colonne dynamique pour chaque objectif
    }
}