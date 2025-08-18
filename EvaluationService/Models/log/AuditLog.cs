using System.ComponentModel.DataAnnotations;

namespace EvaluationService.Models.log;

public class AuditLog
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(350)]
    public required string UserId { get; set; }
    
    [Required]
    [MaxLength(250)]
    public required string Action { get; set; }
    
    [MaxLength(250)]
    public string? TableName { get; set; } = null!;
    
    [MaxLength(250)]
    public string? RecordId { get; set; } = null!;
    public DateTime Timestamp { get; set; }
}
