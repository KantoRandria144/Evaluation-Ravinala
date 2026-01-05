using System.ComponentModel.DataAnnotations;

namespace EvaluationService.Models.log;

public class AuditLog
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(350)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? TableName { get; set; }

    [MaxLength(250)]
    public string? RecordId { get; set; }
    
    public string? OldValues { get; set; }
    
    public string? NewValues { get; set; }

    [Required]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}