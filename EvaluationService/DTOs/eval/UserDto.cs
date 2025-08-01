namespace EvaluationService.DTOs
{
    public class UserDto
    {
        public string Id { get; set; }
        public string DisplayName { get; set; }
        public string Email { get; set; }
        public string Title { get; set; }
        public string Department { get; set; }
        public bool IsActive { get; set; }

        public List<UserDto> DirectReports { get; set; }
    }

}