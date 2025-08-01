using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EvaluationService.Models
{
    public class ObjectiveColumnValue
    {
        [Key]
        public int ValueId { get; set; }

        // Foreign keys
        public int ObjectiveId { get; set; }
        public int ColumnId { get; set; }

        public string Value { get; set; }

        // Navigation properties
        [ForeignKey("ObjectiveId")]
        [JsonIgnore]
        public UserObjective UserObjective { get; set; }

        [ForeignKey("ColumnId")]
        public ObjectiveColumn ObjectiveColumn { get; set; }
    }
}