using CommonModels.DTOs;
using Microsoft.AspNetCore.Mvc;
using UserService.Data;

namespace UserService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SignatureController : ControllerBase
    {

        private readonly AppdbContext _context;
        private readonly IConfiguration _configuration;

        public SignatureController(AppdbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpGet("get-user-signature/{userId}")]
        public async Task<IActionResult> GetUserSignature(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { message = "L'ID de l'utilisateur est requis." });
            }

            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound(new { message = "Utilisateur non trouvé." });
            }

            if (string.IsNullOrEmpty(user.Signature))
            {
                return NotFound(new { message = "La signature de cet utilisateur n'a pas été trouvée." });
            }

            return Ok(new { userId = user.Id, signature = user.Signature });
        }

        // [HttpPost("compare-user-signature/{userId}")]
        // public async Task<IActionResult> CompareUserSignature(string userId, IFormFile uploadedFile)
        // {
        //     if (string.IsNullOrEmpty(userId))
        //     {
        //         return BadRequest(new { message = "L'ID de l'utilisateur est requis." });
        //     }

        //     if (uploadedFile == null || uploadedFile.Length == 0)
        //     {
        //         return BadRequest(new { message = "Le fichier d'image est requis." });
        //     }

        //     // Récupérer l'utilisateur et sa signature
        //     var user = await _context.Users.FindAsync(userId);

        //     if (user == null)
        //     {
        //         return NotFound(new { message = "Utilisateur non trouvé." });
        //     }

        //     if (string.IsNullOrEmpty(user.Signature))
        //     {
        //         return NotFound(new { message = "La signature de cet utilisateur n'a pas été trouvée." });
        //     }

        //     // Lire l'image téléchargée en Base64
        //     string uploadedFileBase64;
        //     using (var memoryStream = new MemoryStream())
        //     {
        //         await uploadedFile.CopyToAsync(memoryStream);
        //         byte[] imageBytes = memoryStream.ToArray();
        //         uploadedFileBase64 = Convert.ToBase64String(imageBytes);
        //     }

        //     // Comparer les signatures
        //     double similarityScore;
        //     try
        //     {
        //         similarityScore = SignatureComparer.CompareSignatures(user.Signature, uploadedFileBase64);
        //     }
        //     catch (Exception ex)
        //     {
        //         return StatusCode(500, new { message = "Erreur lors de la comparaison des signatures.", error = ex.Message });
        //     }

        //     // Définir un seuil pour déterminer la correspondance
        //     const double strictThreshold = 0.15; // Correspondance stricte
        //     const double relaxedThreshold = 0.31; // Correspondance approximative

        //     string matchLevel;
        //     if (similarityScore < strictThreshold)
        //     {
        //         matchLevel = "Correspondance stricte.";
        //     }
        //     else if (similarityScore < relaxedThreshold)
        //     {
        //         matchLevel = "Correspondance approximative.";
        //     }
        //     else
        //     {
        //         matchLevel = "Pas de correspondance.";
        //     }

        //     return Ok(new
        //     {
        //         userId = user.Id,
        //         isMatch = similarityScore < relaxedThreshold,
        //         similarityScore,
        //         matchLevel,
        //         message = matchLevel
        //     });
        // }

        //     [HttpPost("compare-user-signature/{userId}")]
        //     public async Task<IActionResult> CompareUserSignature(string userId, [FromBody] CompareSignatureRequest request)
        //     {
        //         if (string.IsNullOrEmpty(userId))
        //         {
        //             return BadRequest(new { message = "L'ID de l'utilisateur est requis." });
        //         }

        //         if (string.IsNullOrEmpty(request.ImageBase64))
        //         {
        //             return BadRequest(new { message = "L'image en Base64 est requise." });
        //         }

        //         // Récupérer l'utilisateur et sa signature
        //         var user = await _context.Users.FindAsync(userId);

        //         if (user == null)
        //         {
        //             return NotFound(new { message = "Utilisateur non trouvé." });
        //         }

        //         if (string.IsNullOrEmpty(user.Signature))
        //         {
        //             return NotFound(new { message = "La signature de cet utilisateur n'a pas été trouvée." });
        //         }

        //         // imageBase64 est déjà une chaîne base64, pas besoin de la convertir
        //         double similarityScore;
        //         try
        //         {
        //             similarityScore = SignatureComparer.CompareSignatures(user.Signature, request.ImageBase64);
        //         }
        //         catch (Exception ex)
        //         {
        //             return StatusCode(500, new { message = "Erreur lors de la comparaison des signatures.", error = ex.Message });
        //         }

        //         const double strictThreshold = 0.15;
        //         const double relaxedThreshold = 0.31;

        //         string matchLevel;
        //         if (similarityScore < strictThreshold)
        //         {
        //             matchLevel = "Correspondance stricte.";
        //         }
        //         else if (similarityScore < relaxedThreshold)
        //         {
        //             matchLevel = "Correspondance approximative.";
        //         }
        //         else
        //         {
        //             matchLevel = "Pas de correspondance.";
        //         }

        //         return Ok(new
        //         {
        //             userId = user.Id,
        //             isMatch = similarityScore < relaxedThreshold,
        //             similarityScore,
        //             matchLevel,
        //             message = matchLevel
        //         });
        //     }
        // }

        [HttpPost("compare-user-signature/{userId}")]
        public async Task<IActionResult> CompareUserSignature(string userId, [FromBody] CompareSignatureRequest request)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return BadRequest(new { message = "L'ID de l'utilisateur est requis." });
            }

            if (string.IsNullOrEmpty(request.ImageBase64))
            {
                return BadRequest(new { message = "L'image en Base64 est requise." });
            }

            // Récupérer l'utilisateur et sa signature
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound(new { message = "Utilisateur non trouvé." });
            }

            // Vérifier si l'utilisateur n'a pas de signature
            if (string.IsNullOrEmpty(user.Signature))
            {
                return Ok(new
                {
                    userId = user.Id,
                    hasSignature = false,
                    isMatch = false,
                    message = "Cet utilisateur n'a pas encore enregistré de signature."
                });
            }

            // Comparer les signatures
            double similarityScore;
            try
            {
                similarityScore = SignatureComparer.CompareSignatures(user.Signature, request.ImageBase64);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la comparaison des signatures.", error = ex.Message });
            }

            const double strictThreshold = 0.15;
            const double relaxedThreshold = 0.31;

            if (similarityScore < relaxedThreshold)
            {
                // Ajout au cache des signatures validées
                SignatureValidationCache.ValidatedSignatures[userId] = DateTime.Now;

                string matchLevel = similarityScore < strictThreshold
                    ? "Correspondance stricte."
                    : "Correspondance approximative.";

                return Ok(new
                {
                    userId = user.Id,
                    hasSignature = true,
                    isMatch = true,
                    similarityScore,
                    matchLevel,
                    message = "Signature validée avec succès."
                });
            }

            return Ok(new
            {
                userId = user.Id,
                hasSignature = true,
                isMatch = false,
                similarityScore,
                matchLevel = "Pas de correspondance.",
                message = "Signature non valide."
            });
        }



        public class CompareSignatureRequest
        {
            public string ImageBase64 { get; set; }
        }

    }
}