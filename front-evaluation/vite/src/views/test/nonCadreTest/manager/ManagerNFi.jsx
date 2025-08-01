import React, { useEffect, useState } from 'react';
import { formulaireInstance, authInstance } from '../../../../axiosConfig';
import {
  Box,
  TextField,
  Typography,
  Grid,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IconTargetArrow } from '@tabler/icons-react'; // Assurez-vous que cette icône est nécessaire

function ManagerNFi() {
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user.id;

  const managerId = userId;
  const subordoneId = '4bbe3a90-2f91-40b9-bdb2-6efc48195f3a';
  const type = 'NonCadre';

  const [templateId, setTemplateId] = useState(null);
  const [activeStep, setActiveStep] = useState(0); // Initialisé à 0

  const [evaluationId, setEvaluationId] = useState(null);

  const [indicators, setIndicators] = useState([]);
  const [results, setResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [openSignatureModal, setOpenSignatureModal] = useState(false);
  const [openNoSignatureModal, setOpenNoSignatureModal] = useState(false);
  const [hasUserData, setHasUserData] = useState(false);
  const [isValidate, setIsValidate] = useState(false);
  const [helps, setHelps] = useState([]);
  const [helpInputs, setHelpInputs] = useState({});
  const [loadingHelps, setLoadingHelps] = useState(false);
  const [errorHelps, setErrorHelps] = useState('');

  const navigate = useNavigate();

  const handleOpenSignatureModal = () => {
    setOpenSignatureModal(true);
  };

  const handleCloseSignatureModal = () => {
    setOpenSignatureModal(false);
  };

  const handleSignatureFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSignatureFile(e.target.files[0]);
    }
  };

  const fetchHelps = async () => {
    setLoadingHelps(true);
    try {
      const response = await formulaireInstance.get('/Archive/HelpsByAllowedUserLevel/2');
      setHelps(response.data);
      setLoadingHelps(false);
    } catch (error) {
      setErrorHelps('Erreur lors de la récupération des aides.');
      setLoadingHelps(false);
    }
  };

  const fetchUserHelpContents = async () => {
    try {
      const response = await formulaireInstance.get('/Evaluation/GetUserHelpContents', {
        params: {
          userId: subordoneId,
          type: type,
          writerUserId: managerId
        }
      });
      const userHelpContents = response.data;
      const updatedHelpInputs = {};
      userHelpContents.forEach((helpContent) => {
        updatedHelpInputs[helpContent.helpId] = helpContent.content;
      });
      setHelpInputs(updatedHelpInputs);
    } catch (error) {
      console.error('Erreur lors de la récupération des contenus d\'aide utilisateur:', error);
      setErrorHelps('Erreur lors de la récupération des contenus d\'aide utilisateur.');
    }
  };

  const handleHelpInputChange = (helpId, value) => {
    setHelpInputs((prevInputs) => ({
      ...prevInputs,
      [helpId]: value,
    }));
  };

  const fetchDetailedTemplate = async (templateId) => {
    try {
      const evaluationResponse = await formulaireInstance.get(`/Evaluation/enCours/${type}`);
      const evalId = evaluationResponse.data;
      setEvaluationId(evalId);

      const response = await formulaireInstance.get(`/Template/NonCadreTemplate/${templateId}`);
      const { indicators: fetchedIndicators } = response.data;
      setIndicators(fetchedIndicators);

      const initialResults = fetchedIndicators.map((indicator) => ({
        indicatorId: indicator.indicatorId,
        userIndicatorId: 0,
        indicatorName: '',
        results: Array.from({ length: indicator.maxResults }, () => ({
          resultId: 0,
          resultText: '',
          result: '' // Initialisé à '' au lieu de 0
        }))
      }));
      setResults(initialResults);
    } catch (error) {
      setErrorMessage('Erreur lors de la récupération des indicateurs.');
    }
  };

  const fetchCurrentPeriod = async () => {
    try {
      const periodResponse = await formulaireInstance.get('/Periode/periodeActel', {
        params: { type: 'NonCadre' }
      });
      if (periodResponse.data.length > 0) {
        setCurrentPeriod(periodResponse.data[0].currentPeriod);
      }
    } catch (error) {
      setErrorMessage('Erreur lors de la récupération de la période actuelle.');
    }
  };

  const fetchUserIndicators = async () => {
    try {
      const userIndicatorsResponse = await formulaireInstance.get('/Evaluation/IndicatorValidateByUser', {
        params: {
          userId: subordoneId,
          type: type
        }
      });

      const userIndicators = userIndicatorsResponse.data;
      if (userIndicators && userIndicators.length > 0) {
        setHasUserData(true);

        const filledResults = indicators.map((indicator) => {
          const userIndicator = userIndicators.find((ui) => ui.indicatorId === indicator.indicatorId);
          if (userIndicator) {
            return {
              indicatorId: indicator.indicatorId,
              userIndicatorId: userIndicator.userIndicatorId,
              indicatorName: userIndicator.name,
              results: userIndicator.results.map((r) => ({
                resultId: r.resultId,
                resultText: r.resultText,
                result: r.result === 0 || r.result === '0.00' ? '' : r.result.toString()
              }))
            };
          } else {
            return {
              indicatorId: indicator.indicatorId,
              userIndicatorId: 0,
              indicatorName: '',
              results: Array.from({ length: indicator.maxResults }, () => ({
                resultId: 0,
                resultText: '',
                result: ''
              }))
            };
          }
        });

        setResults(filledResults);
      } else {
        setHasUserData(false);
      }
    } catch (err) {
      setHasUserData(false);
      if (err.response && err.response.status !== 404) {
        console.error('Erreur lors de la récupération des indicateurs utilisateur:', err);
      }
    }
  };

  const checkIfValidated = async () => {
    try {
      const response = await formulaireInstance.get('/Evaluation/GetHistoryUserindicatorFi', {
        params: {
          userId: subordoneId,
          type: type
        }
      });

      if (response.data) {
        const indicators = response.data;
        const hasIndicators = Array.isArray(indicators) && indicators.length > 0;

        if (hasIndicators) {
          setIsValidate(true);
        } else {
          setIsValidate(false);
        }
      } else {
        setIsValidate(false);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setIsValidate(false);
      } else {
        console.error('Erreur lors de la vérification de la validation utilisateur:', err);
      }
    }
  };

  const checkIfUserValidated = async () => {
    await checkIfValidated();
  };

  useEffect(() => {
    const initializeTemplate = async () => {
      try {
        await checkIfUserValidated();

        const response = await formulaireInstance.get('/Template/NonCadreTemplate');
        const tempId = response.data.templateId;
        setTemplateId(tempId);

        await fetchDetailedTemplate(tempId);
        await fetchCurrentPeriod();
        await fetchHelps();
        await fetchUserHelpContents(); // Ajouté pour récupérer les contenus d'aide existants
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    initializeTemplate();
  }, []);

  useEffect(() => {
    if (indicators.length > 0) {
      fetchUserIndicators();
    }
  }, [indicators]);

  const handleIndicatorNameChange = (indicatorId, value) => {
    setResults((prevResults) =>
      prevResults.map((result) => (result.indicatorId === indicatorId ? { ...result, indicatorName: value } : result))
    );
  };

  const handleResultChange = (indicatorId, index, value) => {
    setResults((prevResults) =>
      prevResults.map((result) =>
        result.indicatorId === indicatorId
          ? {
              ...result,
              results: result.results.map((res, i) => (i === index ? { ...res, resultText: value } : res))
            }
          : result
      )
    );
  };

  const handleResultNumberChange = (indicatorId, index, value) => {
    // Valider que la valeur est un nombre ou vide
    if (!/^[0-9.,]*$/.test(value)) {
      return; // Ignore les entrées non numériques
    }
  
    // Remplacer les virgules par des points pour la compatibilité décimale
    const formattedValue = value.replace(',', '.');
  
    setResults((prevResults) =>
      prevResults.map((result) =>
        result.indicatorId === indicatorId
          ? {
              ...result,
              results: result.results.map((res, i) =>
                i === index ? { ...res, result: formattedValue } : res
              )
            }
          : result
      )
    );
  };

  const validateStep = () => {
    if (activeStep < indicators.length) {
      const currentIndicator = results.find((res) => res.indicatorId === indicators[activeStep].indicatorId);

      if (!currentIndicator) {
        alert('Les données de cet indicateur sont introuvables.');
        return false;
      }

      if (!currentIndicator.indicatorName.trim()) {
        alert('Le nom de l’indicateur doit être renseigné.');
        return false;
      }

      for (const res of currentIndicator.results) {
        const hasResultText = res.resultText.trim() !== '';
        const hasResult = res.result.trim() !== '';

        if (hasResultText || hasResult) {
          if (!hasResultText || !hasResult) {
            alert('Si vous remplissez un indicateur de résultat, les deux champs doivent être remplis.');
            return false;
          }

          if (isNaN(res.result)) {
            alert('Les champs de résultats doivent être des nombres valides.');
            return false;
          }
        }
      }
    } else if (activeStep === indicators.length) {
      // Validation pour l'étape des aides (optionnelle)
      // Vous pouvez ajouter des validations spécifiques pour les aides ici si nécessaire
      // Par exemple, vérifier que les commentaires ne dépassent pas une certaine longueur
      for (const help of helps) {
        const comment = helpInputs[help.helpId] || '';
        if (comment.length > 500) { // Exemple de validation
          alert(`Le commentaire pour l'aide "${help.name}" ne doit pas dépasser 500 caractères.`);
          return false;
        }
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const steps = [...indicators.map((indicator) => indicator.label), 'Aides Disponibles'];

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Fonction pour insérer les aides avec le nouvel endpoint
  const insertHelpContentsAndArchive = async (helpContents) => {
    try {
      const response = await formulaireInstance.post('/Evaluation/InsertHelpContents', helpContents);
      console.log(response);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de l\'insertion des aides.');
    }
  };

  const validateFinalObjectif = async () => {
    try {
      // Vérifier si le fichier de signature est fourni
      if (!signatureFile) {
        alert('Veuillez fournir un fichier de signature avant de mettre à jour vos objectifs.');
        handleOpenSignatureModal();
        return;
      }

      // Convertir le fichier de signature en base64
      const base64Signature = await convertFileToBase64(signatureFile);

      // Comparer la signature
      const compareResponse = await authInstance.post(`/Signature/compare-user-signature/${managerId}`, {
        ImageBase64: base64Signature
      });

      if (!compareResponse.data.isMatch) {
        alert('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
        handleOpenSignatureModal();
        return;
      }

      // Préparer les promesses pour mettre à jour chaque indicateur
      const updatePromises = results.map(async (indicator) => {
        const { userIndicatorId, results: indicatorResults } = indicator;

        // Vérifier que userIndicatorId est valide
        if (!userIndicatorId || userIndicatorId === 0) {
          throw new Error(`userIndicatorId est manquant ou invalide pour indicatorId ${indicator.indicatorId}`);
        }

        // Préparer les résultats mis à jour
        const updatedResults = indicatorResults.map((res) => ({
          resultId: res.resultId,
          resultText: res.resultText,
          result: res.result.trim() === '' ? 0 : parseFloat(res.result)
        }));

        // Envoyer la requête POST au backend
        const response = await formulaireInstance.post(
          `Evaluation/UpdateUserIndicatorResults?userIndicatorId=${userIndicatorId}`,
          updatedResults
        );

        return response.data;
      });

      // Attendre que toutes les requêtes des indicateurs soient terminées
      const indicatorResponses = await Promise.all(updatePromises);

      // Préparer les données des aides avec les inputs dans le format requis
      const helpContents = helps.map((help) => ({
        userId: subordoneId,
        writerUserId: managerId,
        type: type,
        helpId: help.helpId,
        content: helpInputs[help.helpId] || '',
      }));
      console.log(helpContents);

      // Envoyer les aides avec les contenus au backend
      if (helpContents.length > 0) {
        const helpResponse = await insertHelpContentsAndArchive(helpContents);
        console.log(helpResponse); // Vous pouvez traiter la réponse comme nécessaire
        // Récupérer les contenus d'aide mis à jour depuis le backend
        await fetchUserHelpContents();
      }

      // Optionnel : traiter les réponses individuelles des indicateurs
      indicatorResponses.forEach((res) => {
        console.log(res.message);
      });

      alert('Objectifs et aides mis à jour avec succès !');
      // window.location.reload(); // Supprimé pour éviter le rechargement
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des objectifs :', error);
      alert(error.message || 'Une erreur est survenue lors de la mise à jour.');
    }
  };

  return (
    <Box p={3}>
      {!hasUserData && <Alert severity="info">Le collaborateur n'a pas encore validé ses objectifs.</Alert>}

      {/* ÉTAPE DES INDICATEURS */}
      {indicators.length > 0 && (
        <>
          <Paper sx={{ p: 2, mt: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={index}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          <Box sx={{ marginTop: 3 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                style={{ marginTop: '2rem' }}
              >
                {/* Rendu des Indicateurs */}
                {activeStep < indicators.length && indicators[activeStep] && (
                  <Card>
                    <CardContent>
                      {/* Message Informant que Seuls les Résultats sont Modifiables */}
                      <Typography variant="body1" sx={{ mb: 5, fontStyle: 'italic' }}>
                        Seuls les résultats sont modifiables{' '}
                        <Typography component="span" color="error">
                          *
                        </Typography>
                      </Typography>

                      {/* Titre de l'Indicateur */}
                      <Typography
                        variant="h5"
                        gutterBottom
                        sx={{
                          marginBottom: '20px',
                          backgroundColor: '#fafafa',
                          padding: 3,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}
                      >
                        {indicators[activeStep].label}
                        <IconTargetArrow style={{ color: '#3F51B5' }} />
                      </Typography>

                      {/* Section des Objectifs et Indicateurs de Résultat */}
                      <Paper sx={{ p: 3, backgroundColor: '#e8eaf6' }}>
                        {/* Champ Objectif (Lecture Seule) */}
                        <TextField
                          fullWidth
                          label={<span>Objectif</span>}
                          value={results.find((res) => res.indicatorId === indicators[activeStep].indicatorId)?.indicatorName || ''}
                          onChange={(e) => handleIndicatorNameChange(indicators[activeStep].indicatorId, e.target.value)}
                          sx={{ marginBottom: 2 }}
                          variant="outlined"
                          InputProps={{
                            readOnly: true
                          }}
                        />

                        {/* Sous-titre Indicateur de Résultat */}
                        <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
                          Indicateur de résultat
                        </Typography>

                        {/* Liste des Résultats Filtrés */}
                        {(() => {
                          const currentIndicator = results.find((res) => res.indicatorId === indicators[activeStep].indicatorId);
                          if (!currentIndicator) return null;

                          return currentIndicator.results
                            .filter((result) => result.resultText && result.resultText.trim() !== '') // Filtrer les résultats avec resultText
                            .map(
                              (
                                result,
                                index // Passer l'index ici
                              ) => (
                                <Grid container spacing={2} key={result.resultId || index} sx={{ marginBottom: 2 }}>
                                  {/* Champ Indicateur (Lecture Seule) */}
                                  <Grid item xs={12}>
                                    <TextField
                                      fullWidth
                                      label="Indicateur"
                                      value={result.resultText}
                                      multiline
                                      minRows={2}
                                      onChange={(e) => handleResultChange(indicators[activeStep].indicatorId, index, e.target.value)}
                                      variant="outlined"
                                      InputProps={{
                                        readOnly: true
                                      }}
                                    />
                                  </Grid>

                                  {/* Champ Résultat (Modifiable) */}
                                  <Grid item xs={12}>
                                    <TextField
                                      fullWidth
                                      label={
                                        <span>
                                          Résultat{' '}
                                          <Typography component="span" color="error">
                                            *
                                          </Typography>
                                        </span>
                                      }
                                      type="text"
                                      value={result.result}
                                      onChange={(e) => {
                                        let value = e.target.value;
                                        if (!/^\d{0,3}([.,]\d{0,2})?$/.test(value)) return;
                                        value = value.replace(',', '.');
                                        handleResultNumberChange(indicators[activeStep].indicatorId, index, value);
                                      }}
                                      variant="outlined"
                                    />
                                  </Grid>
                                </Grid>
                              )
                            );
                        })()}
                      </Paper>
                    </CardContent>
                  </Card>
                )}

                {/* Rendu de la Section des Aides Disponibles */}
                {activeStep === indicators.length && (
                  <Card>
                    <CardContent>
                      <Typography variant="h5" gutterBottom sx={{ marginBottom: '20px', fontWeight: 'bold' }}>
                        Aides Disponibles
                      </Typography>

                      {/* Afficher les Aides comme TextFields */}
                      <Box mt={2}>
                        {loadingHelps ? (
                          <Typography variant="body2">Chargement des aides...</Typography>
                        ) : errorHelps ? (
                          <Typography variant="body2" color="error">
                            {errorHelps}
                          </Typography>
                        ) : helps.length > 0 ? (
                          <Grid container spacing={2}>
                            {helps.map((help) => (
                              <Grid item xs={12} sm={6} md={4} key={help.helpId}>
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {help.name}
                                  </Typography>
                                  <Typography variant="body2" gutterBottom>
                                    {help.description}
                                  </Typography>
                                  <TextField
                                    fullWidth
                                    label="Commentaire" // Vous pouvez personnaliser le label selon vos besoins
                                    value={helpInputs[help.helpId] || ''}
                                    onChange={(e) => handleHelpInputChange(help.helpId, e.target.value)}
                                    variant="outlined"
                                    multiline
                                    rows={3}
                                  />
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Typography variant="body2">Aucune aide disponible pour le moment.</Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                variant="contained"
                color="secondary"
                startIcon={<KeyboardArrowLeft />}
                sx={{ textTransform: 'none', fontWeight: 'bold' }}
              >
                Précédent
              </Button>

              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  color="success"
                  disabled={isValidate}
                  onClick={() => {
                    if (validateStep()) {
                      if (!signatureFile) {
                        handleOpenSignatureModal();
                      } else {
                        validateFinalObjectif();
                      }
                    }
                  }}
                  sx={{ textTransform: 'none', fontWeight: 'bold' }}
                >
                  {isValidate ? 'Déjà validé' : 'Validé'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    if (validateStep()) {
                      handleNext();
                    }
                  }}
                  endIcon={<KeyboardArrowRight />}
                  sx={{ textTransform: 'none', fontWeight: 'bold' }}
                >
                  Suivant
                </Button>
              )}
            </Box>

            {/* Modal pour la signature */}
            <Dialog open={openSignatureModal} onClose={handleCloseSignatureModal}>
              <DialogTitle>Veuillez signer pour continuer</DialogTitle>
              <DialogContent>
                <input type="file" accept="image/*" onChange={handleSignatureFileChange} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Choisissez une image contenant votre signature.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseSignatureModal}>Annuler</Button>
                <Button
                  onClick={() => {
                    handleCloseSignatureModal();
                    // Appeler la validation finale seulement si on est à la dernière étape
                    if (activeStep === steps.length - 1) {
                      validateFinalObjectif();
                    }
                  }}
                  variant="contained"
                  color="primary"
                >
                  Confirmer
                </Button>
              </DialogActions>
            </Dialog>

            {/* Modal pour la signature manquante */}
            <Dialog open={openNoSignatureModal} onClose={() => setOpenNoSignatureModal(false)}>
              <DialogTitle>Signature manquante</DialogTitle>
              <DialogContent>
                <Typography variant="body1">
                  Vous n’avez pas encore de signature enregistrée. Veuillez{' '}
                  <Typography
                    component="span"
                    onClick={() => navigate('/collab/profile')}
                    sx={{
                      color: '#1976d2',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    cliquer ici
                  </Typography>{' '}
                  pour continuer.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenNoSignatureModal(false)} variant="contained" color="primary">
                  Fermer
                </Button>
              </DialogActions>
            </Dialog>
          </Box>

          {/* Affichage des Aides dans le dernier step est maintenant intégré dans le contenu du step */}
        </>
      )}
    </Box>
  );
}

export default ManagerNFi;
