namespace CommonModels.DTOs
{
    public class UserPerformanceComparisonDTO
    {
        public string UserId { get; set; }
        public string Matricule { get; set; }
        public string Name { get; set; }
        public string Department { get; set; }
        public string Poste { get; set; }
        public string SuperiorId { get; set; }
        public string SuperiorName { get; set; }
        public string Status { get; set; }
        public string TypeUser { get; set; }
        public List<HabilitationIDLabelDto> Habilitations { get; set; }
        public List<PerformanceScoreDTO> PerformanceScores { get; set; }
    }
}