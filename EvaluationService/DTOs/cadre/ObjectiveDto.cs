namespace EvaluationService.DTOs
{
    public class ObjectiveDto
    {
        public int PriorityId { get; set; }
        public string? PriorityName { get; set; }

        public string Description { get; set; } = string.Empty;
        public decimal Weighting { get; set; }

        public string ResultIndicator { get; set; } = string.Empty;

        public decimal Result { get; set; }

        // 🔥 OPTIONNEL (Manager uniquement)
        public string? ManagerComment { get; set; }
        // 🔥 OPTIONNEL (Collaborator uniquement   )
        public string? CollaboratorComment { get; set; }
        public decimal? CollaboratorResult { get; set; }
        public decimal? ManagerResult { get; set; }


        public int ObjectiveId { get; set; }

        // 🔥 OPTIONNEL + SAFE PAR DÉFAUT
        public List<ColumnValueDto>? DynamicColumns { get; set; } = new();
    }
}
