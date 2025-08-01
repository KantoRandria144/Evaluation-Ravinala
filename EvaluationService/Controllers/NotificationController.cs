using EvaluationService.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

namespace EvaluationService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly AppdbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public NotificationController(AppdbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        [HttpGet("notifications/{userId}")]
        public async Task<IActionResult> GetNotifications(string userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return Ok(notifications);
        }

        [HttpPost("notifications/mark-as-read")]
        public async Task<IActionResult> MarkAsRead([FromBody] List<int> notificationIds)
        {
            var notifications = await _context.Notifications
                .Where(n => notificationIds.Contains(n.Id))
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new { Message = "Notifications marquées comme lues." });
        }

        [HttpGet("notifications/unread-count/{userId}")]
        public async Task<IActionResult> GetUnreadNotificationsCount(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { Message = "User ID must be provided." });
            }

            var unreadCount = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .CountAsync();

            return Ok(new { UnreadCount = unreadCount });
        }

        [HttpGet("notifications/stream")]
        public async Task StreamNotifications(string userId)
        {
            Response.ContentType = "text/event-stream";

            using var writer = new StreamWriter(Response.Body);
            NotificationService.RegisterClient(userId, writer);

            while (!HttpContext.RequestAborted.IsCancellationRequested)
            {
                await Task.Delay(100); // Maintenir la connexion ouverte
            }

            NotificationService.UnregisterClient(userId);
        }   

        [HttpGet("validationStatus")]
        public async Task<IActionResult> GetValidationStatus(string userId, int evalId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.UserId == userId && n.EvalId == evalId && n.Message.Contains("a validé vos résultats pour la période d'évaluation final"));

            if (notification == null)
            {
                return Ok(new { isValidated = false });
            }

            return Ok(new { isValidated = true, validatedAt = notification.CreatedAt, validatedBy = notification.SenderId });
        }

    }
}