using EvaluationService.Data;
using EvaluationService.Models.log;

namespace EvaluationService.Service;

public interface IAuditService
{
    Task LogAction(string userId, string action, string? tableName = null, string? recordId = null);
}

public class AuditService : IAuditService
{
    private readonly AppdbContext _context;

    public AuditService(AppdbContext context)
    {
        _context = context;
    }

    public async Task LogAction(string userId, string action, string? tableName = null, string? recordId = null)
    {
        var log = new AuditLog()
        {
            UserId = userId,
            Action = action,
            TableName = tableName,
            RecordId = recordId,
            Timestamp = DateTime.UtcNow
        };
        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }
}
