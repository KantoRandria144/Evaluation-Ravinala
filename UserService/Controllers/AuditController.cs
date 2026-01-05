using Microsoft.AspNetCore.Mvc;
using UserService.Service;
using System.Threading.Tasks;

namespace UserService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuditController : ControllerBase
    {
        private readonly IAuditService _auditService;

        public AuditController(IAuditService auditService)
        {
            _auditService = auditService;
        }

        [HttpPost("log")]
        public async Task<IActionResult> LogAction([FromBody] AuditLogRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.Action))
            {
                return BadRequest("UserId and Action are required.");
            }

            await _auditService.LogAction(
                request.UserId,
                request.Action,
                request.TableName,
                request.RecordId,
                request.OldValues,
                request.NewValues
            );

            return Ok(new { message = "Action logged successfully" });
        }

        [HttpGet("getAll")]
        public async Task<IActionResult> GetAll()
        {
            var logs = await _auditService.GetAllAsync();
            return Ok(logs);
        }
    }

    public class AuditLogRequest
    {
        public string UserId { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string? TableName { get; set; }
        public string? RecordId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
    }
}