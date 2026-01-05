namespace CommonModels.DTOs
{
    public class PerformanceScoreDTO
    {
        public string Phase { get; set; } // Fixation, Mi-Parcours, Évaluation Finale
        public int EvaluationYear { get; set; }
        public double Score { get; set; }
    }
}