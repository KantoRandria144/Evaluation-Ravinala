using System.ComponentModel.DataAnnotations;

namespace UserService.Models
{
    public class Section
    {
        [Key]
        public int Id { get; set; }
        public string Name { get; set; }
    }
}