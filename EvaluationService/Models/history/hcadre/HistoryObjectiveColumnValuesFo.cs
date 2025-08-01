using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class HistoryObjectiveColumnValuesFo
    {
        [Key]
        public int HistValueId { get; set; }  

        [ForeignKey("HistoryCFo")]
        public int HcfId { get; set; } 
        
        [Required]
        public string ColumnName { get; set; } 

        public string Value { get; set; } 

        public string? ValidatedBy {get; set;}
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now; 

        public virtual HistoryCFo HistoryCFo { get; set; }
    }
}
