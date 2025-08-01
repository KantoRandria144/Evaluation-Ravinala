namespace UserService.DTOs
{
    public class HabilitationIDLabelDto
    {
        public int Id { get; set; }
        public string Label { get; set; }
        public List<HabilitationUniqAdminDto> HabilitationAdmins { get; set; } = new List<HabilitationUniqAdminDto>();
    }
}