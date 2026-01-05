using Microsoft.EntityFrameworkCore;
using UserService.Data;
using UserService.Models.log;

namespace UserService.Service;

public interface IAuditService
{
    Task LogAction(
        string userId,
        string action,
        string? tableName = null,
        string? recordId = null,
        string? oldValues = null,
        string? newValues = null);

    Task<List<object>> GetAllAsync();
}

public class AuditService : IAuditService
{
    private readonly AppdbContext _context;

    public AuditService(AppdbContext context)
    {
        _context = context;
    }

    public async Task LogAction(
        string userId,
        string action,
        string? tableName = null,
        string? recordId = null,
        string? oldValues = null,
        string? newValues = null)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Action = action,
            TableName = tableName,
            RecordId = recordId,
            OldValues = oldValues,
            NewValues = newValues,
        };  

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    public async Task<List<object>> GetAllAsync()
    {
        return await _context.AuditLogs
            .Include(l => l.User) // Assure-toi que AuditLog a bien une navigation vers User
            .OrderByDescending(l => l.Timestamp)
            .Select(l => new 
            {
                l.Id,
                UserName = l.User != null ? l.User.Name : l.UserId, // fallback si User n’est pas trouvé
                l.Action,
                l.TableName,
                l.RecordId,
                l.OldValues,
                l.NewValues,
                l.Timestamp
            })
            .ToListAsync<object>();
    }
}