using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UserService.Models
{
    public class HabilitationAdmin
    {
        [Key]
        public int Id { get; set; } 
        public string Name { get; set; } 

        [ForeignKey("Section")]
        public int SectionId { get; set; } 
        public Section Section { get; set; }        
        public bool IsGranted { get; set; } //always true
        public List<Habilitation> Habilitations { get; set; } = new List<Habilitation>();
    }
}