namespace EvaluationService.DTOs
{
    public class EvaluationDto
    {
        public int EvalId { get; set; }
        public int EvalAnnee { get; set; }
        public DateTime FixationObjectif { get; set; }
        public DateTime MiParcours { get; set; }
        public DateTime Final { get; set; }
        public int EtatId { get; set; }
        public int TemplateId { get; set; }
        public string Titre { get; set; }
        public string? Type {get; set;}
        public string? EtatDesignation { get; set; }
        public decimal? CompetenceWeightTotal { get; set; }
        public decimal? IndicatorWeightTotal { get; set; }

    }
}