namespace EvaluationService.Models;

public class ControllerErrorResponse
{
    public string? FileName { get; set; }
    public int? LineNumber { get; set; }
    public string? ErrorMessage { get; set; }
    public string? Details { get; set; }
}