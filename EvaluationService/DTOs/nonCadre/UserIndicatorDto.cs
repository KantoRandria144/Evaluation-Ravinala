namespace EvaluationService.DTOs
{
    public class UserIndicatorDto
    {
        public int UserIndicatorId { get; set; }
        public int UserEvalId { get; set; }
        public int IndicatorId { get; set; }
        public string IndicatorName { get; set; }
        public string ResultText { get; set; }
        public decimal Result { get; set; }
    }
}