using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace EvaluationService.Models
{
    public class ObjectiveColumn
    {
        [Key]
        public int ColumnId { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [JsonIgnore]
        public ICollection<ObjectiveColumnValue> ObjectiveColumnValues { get; set; }
    }
}