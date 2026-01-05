namespace CommonModels.DTOs
{
    public static class SignatureValidationCache
    {
        public static Dictionary<string, DateTime> ValidatedSignatures { get; } = new Dictionary<string, DateTime>();
    }
}
