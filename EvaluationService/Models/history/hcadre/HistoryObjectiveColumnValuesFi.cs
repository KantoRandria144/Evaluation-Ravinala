using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class HistoryObjectiveColumnValuesFi
    {
        [Key]
        public int HistValueId { get; set; }        

        [ForeignKey("HistoryCFi")]
        public int HcfiId { get; set; }                    
        
        [Required]
        public string ColumnName { get; set; }              

        public string Value { get; set; }        

        public string? ValidatedBy {get; set;}          
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now; 

        public virtual HistoryCFi HistoryCFi { get; set; }
    }
}