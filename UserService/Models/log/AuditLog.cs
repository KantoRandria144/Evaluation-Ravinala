using System.ComponentModel.DataAnnotations;

namespace UserService.Models.log;

public class AuditLog
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(350)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? TableName { get; set; }

    [MaxLength(250)]
    public string? RecordId { get; set; }
    
    public string? OldValues { get; set; }
    
    public string? NewValues { get; set; }

    [Required]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public User? User { get; set; }
}