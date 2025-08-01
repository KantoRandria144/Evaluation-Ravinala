namespace UserService.DTOs
{
    public class UserDTO
    {
        public string Id { get; set; }
        public string Matricule {get; set;}
        public string Email { get; set; }
        public string Name { get; set; }
        public string Department {get; set;}
        public string Poste {get; set;}
        public string SuperiorId {get; set;}
        public string SuperiorName {get; set;}
        public string Status {get; set;}
        public string TypeUser {get; set;}
        public List<HabilitationIDLabelDto> Habilitations { get; set; }

    }
}