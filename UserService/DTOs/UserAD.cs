namespace UserService.DTOs
{
    public class UserAD
    {
        public string Id { get; set; }
        public string Matricule {get; set;}
        public string DisplayName { get; set; }
        public string Email { get; set; }
        public string Title { get; set; }
        public string UserDn { get; set; }
        public string Department { get; set; }
        public List<UserAD> DirectReports { get; set; } = new List<UserAD>();
        public bool IsActive { get; set; }
    }
}