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
            if (string.IsNullOrEmpty(request.UserId) || string.IsNullOrEmpty(request.Action))
            {
                return BadRequest("UserId and Action are required.");
            }

            await _auditService.LogAction(request.UserId, request.Action, request.TableName, request.RecordId);
            return Ok(new { message = "Action logged successfully" });
        }
    }

    public class AuditLogRequest
    {
        public string UserId { get; set; }
        public string Action { get; set; }
        public string? TableName { get; set; }
        public string? RecordId { get; set; }
    }
}