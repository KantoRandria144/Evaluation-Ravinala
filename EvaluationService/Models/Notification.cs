namespace EvaluationService.Models
{
    public class Notification
    {
        public int Id { get; set; }
        public string SenderId {get; set;} // Envoyeur id
        public string SenderMatricule {get; set;} // Envoyeur nom
        public string UserId { get; set; } // Destinataire
        public string Message { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? EvalId { get; set; }
    }

}