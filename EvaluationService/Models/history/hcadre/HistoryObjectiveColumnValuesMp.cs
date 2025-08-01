using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EvaluationService.Models
{
    public class HistoryObjectiveColumnValuesMp
    {
        [Key]
        public int HistValueId { get; set; }              

        [ForeignKey("HistoryCMp")]
        public int HcmId { get; set; }                    
        
        [Required]
        public string ColumnName { get; set; }              

        public string Value { get; set; }        

        public string? ValidatedBy {get; set;}          
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.Now; 

        public virtual HistoryCMp HistoryCMp { get; set; }
    }
}
