[HttpPut("start/{evalId}")]
public async Task<IActionResult> StartEvaluation(int evalId)
{
\_logger.LogInformation($"Démarrage de l'évaluation avec l'ID {evalId}.");

// Utilisation d'une transaction pour garantir la cohérence des opérations
using (var transaction = await _context.Database.BeginTransactionAsync())
{
    try
    {
        // 1. Récupérer l'évaluation par son ID
        var evaluation = await _context.Evaluations
                                    .FirstOrDefaultAsync(e => e.EvalId == evalId);
        if (evaluation == null)
        {
            _logger.LogWarning($"Évaluation avec l'ID {evalId} non trouvée.");
            return NotFound(new
            {
                Success = false,
                Message = "Évaluation non trouvée."
            });
        }

        // 2. Récupérer le type de l'évaluation (par exemple, "Cadre" ou "NonCadre")
        var typeEvaluation = evaluation.Type; // Assurez-vous que 'Type' est bien la propriété représentant le type

        // 3. Vérifier s'il existe déjà une évaluation en cours du même type (EtatId = 2)
        bool evaluationEnCoursMemeType = await _context.Evaluations
            .AnyAsync(e => e.EtatId == 2 && e.Type == typeEvaluation && e.EvalId != evalId);

        if (evaluationEnCoursMemeType)
        {
            _logger.LogWarning($"Une évaluation pour les collaborateurs '{typeEvaluation}' est déjà en cours.");
            return Conflict(new
            {
                Success = false,
                Message = $"Une évaluation pour les collaborateurs '{typeEvaluation}' est déjà en cours. Veuillez la clôturer avant d'en démarrer une nouvelle."
            });
        }

        // 4. Mettre à jour l'état de l'évaluation à "En cours" (EtatId = 2)
        evaluation.EtatId = 2;
        _context.Evaluations.Update(evaluation);
        await _context.SaveChangesAsync(); // Sauvegarde pour que l'état soit bien mis à jour avant la suite

        _logger.LogInformation($"État de l'évaluation avec l'ID {evalId} mis à jour à 'En cours'.");

        // 5. Récupérer les utilisateurs en fonction du type d’évaluation
        var users = await GetUsersByTypeAsync(typeEvaluation);
        // Ex: "Cadre" ou "Non-Cadre"

        if (users == null || users.Count == 0)
        {
            _logger.LogWarning($"Aucun utilisateur trouvé pour le type d'évaluation '{typeEvaluation}'.");
            return Ok(new
            {
                Success = true,
                Message = "Évaluation démarrée avec succès, mais aucun utilisateur n'a été trouvé pour envoyer des notifications."
            });
        }

        // 6. Associer les utilisateurs à l'évaluation dans la table "UserEvaluations"
        List<string> failedEmails = new List<string>();

        foreach (var user in users)
        {
            bool alreadyAssigned = await _context.UserEvaluations
                                                .AnyAsync(ue => ue.EvalId == evalId && ue.UserId == user.Id);
            if (!alreadyAssigned)
            {
                var userEvaluation = new UserEvaluation
                {
                    EvalId = evalId,
                    UserId = user.Id
                };
                _context.UserEvaluations.Add(userEvaluation);
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation($"Utilisateurs associés à l'évaluation avec l'ID {evalId}.");

        // 7. Envoyer des e-mails de notification à chaque utilisateur
        foreach (var user in users)
        {
            if (string.IsNullOrEmpty(user.Email))
            {
                _logger.LogWarning($"Utilisateur avec l'ID {user.Id} n'a pas d'adresse e-mail.");
                failedEmails.Add($"Utilisateur ID {user.Id} sans e-mail");
                continue;
            }

            try
            {
                var emailRequest = new EmailRequest
                {
                    ToEmail = user.Email,
                    Subject = "Évaluation démarrée",
                    Body = $"Bonjour {user.DisplayName},\n\nL'évaluation avec l'ID {evalId} a été démarrée avec succès.\n\nCordialement,\nVotre Équipe"
                };
                await SendEmailAsync(emailRequest);
                _logger.LogInformation($"Email de notification envoyé à {user.Email} pour l'évaluation ID {evalId}.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erreur lors de l'envoi de l'e-mail à {user.Email} pour l'évaluation ID {evalId}.");
                failedEmails.Add(user.Email);
            }
        }

        // Valider la transaction
        await transaction.CommitAsync();

        if (failedEmails.Count > 0)
        {
            return Ok(new
            {
                Success = true,
                Message = "Évaluation démarrée avec succès, mais une erreur est survenue lors de l'envoi des e-mails à certains utilisateurs.",
                FailedEmails = failedEmails
            });
        }

        return Ok(new
        {
            Success = true,
            Message = "Évaluation démarrée avec succès et les e-mails de notification ont été envoyés."
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Une erreur inattendue est survenue lors du démarrage de l'évaluation.");
        await transaction.RollbackAsync();
        return StatusCode(StatusCodes.Status500InternalServerError, new
        {
            Success = false,
            Message = "Une erreur est survenue lors du démarrage de l'évaluation."
        });
    }
}
}



[HttpPut("start/{evalId}")]
        public async Task<IActionResult> StartEvaluation(int evalId)
        {
            _logger.LogInformation($"Démarrage de l'évaluation avec l'ID {evalId}.");

            // Utilisation d'une transaction pour garantir la cohérence des opérations
            using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                try
                {
                    // 1. Récupérer l'évaluation par son ID
                    var evaluation = await _context.Evaluations
                                                .FirstOrDefaultAsync(e => e.EvalId == evalId);
                    if (evaluation == null)
                    {
                        _logger.LogWarning($"Évaluation avec l'ID {evalId} non trouvée.");
                        return NotFound(new 
                        { 
                            Success = false, 
                            Message = "Évaluation non trouvée." 
                        });
                    }

                    // 2. Récupérer le type de l'évaluation (par exemple, "Cadre" ou "NonCadre")
                    var typeEvaluation = evaluation.Type; // Assurez-vous que 'Type' est bien la propriété représentant le type

                    // 3. Vérifier s'il existe déjà une évaluation en cours du même type (EtatId = 2)
                    bool evaluationEnCoursMemeType = await _context.Evaluations
                        .AnyAsync(e => e.EtatId == 2 && e.Type == typeEvaluation && e.EvalId != evalId);

                    if (evaluationEnCoursMemeType)
                    {
                        _logger.LogWarning($"Une évaluation pour les collaborateurs '{typeEvaluation}' est déjà en cours.");
                        return Conflict(new 
                        { 
                            Success = false, 
                            Message = $"Une évaluation pour les collaborateurs '{typeEvaluation}' est déjà en cours. Veuillez la clôturer avant d'en démarrer une nouvelle." 
                        });
                    }

                    // 4. Mettre à jour l'état de l'évaluation à "En cours" (EtatId = 2)
                    evaluation.EtatId = 2;
                    _context.Evaluations.Update(evaluation);
                    await _context.SaveChangesAsync(); // Sauvegarde pour que l'état soit bien mis à jour avant la suite

                    _logger.LogInformation($"État de l'évaluation avec l'ID {evalId} mis à jour à 'En cours'.");

                    // 5. Récupérer les utilisateurs en fonction du type d’évaluation
                    var users = await GetUsersByTypeAsync(typeEvaluation); 
                    // Ex: "Cadre" ou "Non-Cadre"

                    if (users == null || users.Count == 0)
                    {
                        _logger.LogWarning($"Aucun utilisateur trouvé pour le type d'évaluation '{typeEvaluation}'.");
                        return Ok(new 
                        { 
                            Success = true, 
                            Message = "Évaluation démarrée avec succès, mais aucun utilisateur n'a été trouvé pour envoyer des notifications." 
                        });
                    }

                    // 6. Associer les utilisateurs à l'évaluation dans la table "UserEvaluations"
                    List<string> failedEmails = new List<string>();

                    foreach (var user in users)
                    {
                        bool alreadyAssigned = await _context.UserEvaluations
                                                            .AnyAsync(ue => ue.EvalId == evalId && ue.UserId == user.Id);
                        if (!alreadyAssigned)
                        {
                            var userEvaluation = new UserEvaluation
                            {
                                EvalId = evalId,
                                UserId = user.Id
                            };
                            _context.UserEvaluations.Add(userEvaluation);
                        }
                    }

                    await _context.SaveChangesAsync();

                    _logger.LogInformation($"Utilisateurs associés à l'évaluation avec l'ID {evalId}.");

                    // 7. Envoyer des e-mails de notification uniquement à l'utilisateur spécifié
                    string targetUserId = "18219f8e-b781-46ff-9182-37c9da640c03"; // ID de l'utilisateur cible
                    var targetUser = users.FirstOrDefault(u => u.Id.ToString() == targetUserId); // Assurez-vous que 'u.Id' est de type string ou convertissez-le si nécessaire

                    if (targetUser == null)
                    {
                        _logger.LogWarning($"Utilisateur avec l'ID {targetUserId} non trouvé dans la liste des utilisateurs.");
                    }
                    else
                    {
                        if (string.IsNullOrEmpty(targetUser.Email))
                        {
                            _logger.LogWarning($"Utilisateur avec l'ID {targetUser.Id} n'a pas d'adresse e-mail.");
                            failedEmails.Add($"Utilisateur ID {targetUser.Id} sans e-mail");
                        }
                        else
                        {
                            try
                            {
                                var emailRequest = new EmailRequest
                                {
                                    ToEmail = targetUser.Email,
                                    Subject = "Évaluation démarrée",
                                    Body = $"Bonjour {targetUser.DisplayName},\n\nL'évaluation avec l'ID {evalId} a été démarrée avec succès.\n\nCordialement,\nVotre Équipe"
                                };
                                await SendEmailAsync(emailRequest);
                                _logger.LogInformation($"Email de notification envoyé à {targetUser.Email} pour l'évaluation ID {evalId}.");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, $"Erreur lors de l'envoi de l'e-mail à {targetUser.Email} pour l'évaluation ID {evalId}.");
                                failedEmails.Add(targetUser.Email);
                            }
                        }
                    }

                    // Valider la transaction
                    await transaction.CommitAsync();

                    if (failedEmails.Count > 0)
                    {
                        return Ok(new 
                        { 
                            Success = true, 
                            Message = "Évaluation démarrée avec succès, mais une erreur est survenue lors de l'envoi de l'e-mail à l'utilisateur spécifié.",
                            FailedEmails = failedEmails
                        });
                    }

                    return Ok(new 
                    { 
                        Success = true, 
                        Message = "Évaluation démarrée avec succès et l'e-mail de notification a été envoyé à l'utilisateur spécifié." 
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Une erreur inattendue est survenue lors du démarrage de l'évaluation.");
                    await transaction.RollbackAsync();
                    return StatusCode(StatusCodes.Status500InternalServerError, new 
                    { 
                        Success = false, 
                        Message = "Une erreur est survenue lors du démarrage de l'évaluation." 
                    });
                }
            }
        }

        // Méthode utilitaire pour envoyer des emails avec SendGrid
        private async Task SendEmailAsync(EmailRequest request)
        {
            var from = new EmailAddress(_fromEmail, _fromName);
            var to = new EmailAddress(request.ToEmail);
            var msg = MailHelper.CreateSingleEmail(from, to, request.Subject, request.Body, request.Body);

            var response = await _sendGridClient.SendEmailAsync(msg);

            if (response.StatusCode != System.Net.HttpStatusCode.Accepted &&
                response.StatusCode != System.Net.HttpStatusCode.OK)
            {
                var responseBody = await response.Body.ReadAsStringAsync();
                _logger.LogError($"Échec de l'envoi de l'email via SendGrid. Statut: {response.StatusCode}, Détails: {responseBody}");
                throw new Exception($"Échec de l'envoi de l'email via SendGrid. Statut: {response.StatusCode}, Détails: {responseBody}");
            }
        }
