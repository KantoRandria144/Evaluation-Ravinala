using System.ComponentModel.DataAnnotations;

namespace UserService.Models
{
    public class Habilitation
    {
        [Key]
        public int Id { get; set; }
        public string Label { get; set; }
        public List<HabilitationAdmin> HabilitationAdmins { get; set; } = new List<HabilitationAdmin>();
        public List<User> Users { get; set; } = new List<User>();
    }
}