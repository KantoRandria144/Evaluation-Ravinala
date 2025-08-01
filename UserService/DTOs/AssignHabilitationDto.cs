namespace UserService.DTOs
{
    public class AssignHabilitationDto
    {
        public List<string> UserIds { get; set; }
        public List<int> HabilitationIds { get; set; }
    }
}