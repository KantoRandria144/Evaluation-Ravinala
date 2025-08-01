namespace UserService.DTOs
{
    public class UserHabilitationDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public List<HabilitationIDLabelDto> Habilitations { get; set; }
    }
}