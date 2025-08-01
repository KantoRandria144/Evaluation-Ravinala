namespace EvaluationService.DTOs
{
    public class UserCompetenceDto
    {
        public int UserCompetenceId { get; set; }
        public int UserEvalId { get; set; }
        public int CompetenceId { get; set; }
        public string CompetenceName {get; set;}
        public decimal Performance { get; set; }
    }
}