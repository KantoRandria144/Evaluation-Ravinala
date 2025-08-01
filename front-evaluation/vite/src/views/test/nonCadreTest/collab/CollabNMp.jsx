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
  LinearProgress,
  List,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { IconTargetArrow } from '@tabler/icons-react';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function ManagerNMp() {
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user.id;
  const type = user.typeUser;

  const [templateId, setTemplateId] = useState(null);
  const [activeStep, setActiveStep] = useState(-1);
  // -1 : évaluation des compétences, >=0 : indicateurs

  const [evaluationId, setEvaluationId] = useState(null);

  const [indicators, setIndicators] = useState([]);
  const [competences, setCompetences] = useState([]);
  const [results, setResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [openSignatureModal, setOpenSignatureModal] = useState(false);
  const [openNoSignatureModal, setOpenNoSignatureModal] = useState(false);
  const [hasUserData, setHasUserData] = useState(false);
  const [isValidate, setIsValidate] = useState(false);
  const [isValidateCompetence, setIsValidateCompetence] = useState(false);

  // Stocke la saisie (en %) pour chaque compétence
  const [competenceRatings, setCompetenceRatings] = useState({});

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

  const fetchDetailedTemplate = async (templateId) => {
    try {
      const evaluationResponse = await formulaireInstance.get(`/Evaluation/enCours/${type}`);
      const evalId = evaluationResponse.data;
      setEvaluationId(evalId);

      const response = await formulaireInstance.get(`/Template/NonCadreTemplate/${templateId}`);
      const { indicators: fetchedIndicators } = response.data;
      setIndicators(fetchedIndicators);

      const { competences: fetchCompetences } = response.data;
      setCompetences(fetchCompetences);

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

      // UNE FOIS QU'ON A L'EVALUATION ET LES COMPETENCES DU TEMPLATE,
      // ON TENTE DE RECUPERER LES COMPETENCES UTILISATEUR ET DE PREREMPLIR.
      await fetchUserCompetences(evalId, userId, fetchCompetences);
    } catch (error) {
      setErrorMessage('Erreur lors de la récupération des indicateurs.');
    }
  };

  const fetchUserCompetences = async (evalId, userId, templateCompetences) => {
    try {
      // Appel à votre endpoint C#: GET /Evaluation/{evalId}/competences/{userId}
      const response = await formulaireInstance.get(`/Evaluation/${evalId}/competences/${userId}`);
      const userCompetences = response.data;

      // On créé un objet {competenceId: performance, ...}
      const ratings = {};
      userCompetences.forEach((uc) => {
        ratings[uc.competenceId] = uc.performance.toString(); // convertir en string pour le TextField
      });
      setCompetenceRatings(ratings);

      // hasUserData passe à true pour montrer qu'on a déjà des données
      setIsValidateCompetence(true);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Aucune compétence existante pour l'utilisateur dans cette évaluation,
        // on affiche donc les données provenant du template vierges
        setIsValidateCompetence(false);
      } else {
        console.error('Erreur lors de la récupération des compétences utilisateur:', err);
        setIsValidateCompetence(false);
      }
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
          userId: userId,
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
      const response = await formulaireInstance.get('/Evaluation/GetArchivedDataMp', {
        params: {
          userId: userId,
          type: type
        }
      });

      if (response.data) {
        const { competences, indicators } = response.data;

        const hasCompetences = competences && competences.length > 0;
        const hasIndicators = indicators && indicators.length > 0;

        if (hasCompetences || hasIndicators) {
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
    if (!/^[0-9.,]*$/.test(value)) {
      return;
    }
    value = value.replace(',', '.');

    setResults((prevResults) =>
      prevResults.map((result) =>
        result.indicatorId === indicatorId
          ? {
              ...result,
              results: result.results.map((res, i) => (i === index ? { ...res, result: value } : res))
            }
          : result
      )
    );
  };

  const validateStep = () => {
    if (activeStep === -1) {
      // Validation des compétences
      for (const comp of competences) {
        const val = competenceRatings[comp.competenceId];
        if (!val || val.trim() === '') {
          alert(`Veuillez saisir un pourcentage pour la compétence : ${comp.name}`);
          return false;
        }
      }
      return true;
    } else {
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

      return true;
    }
  };

  const handleNext = () => {
    if (activeStep === -1) {
      // Validation des compétences
      for (const comp of competences) {
        const val = competenceRatings[comp.competenceId];
        if (!val || val.trim() === '') {
          alert(`Veuillez saisir un pourcentage pour la compétence : ${comp.name}`);
          return;
        }
      }
      setActiveStep(0);
    } else {
      if (validateStep()) {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    } else {
      setActiveStep(-1);
    }
  };

  const steps = indicators.map((indicator) => indicator.label);

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const validateMidtermObjectifHistory = async () => {
    try {
      // Formater les compétences
      const formattedCompetences = Object.entries(competenceRatings).map(([competenceId, performance]) => ({
        competenceId: parseInt(competenceId, 10),
        performance: parseFloat(performance || 0)
      }));

      // Formater les indicateurs
      const formattedIndicators = results.map((result) => ({
        indicatorId: result.indicatorId,
        indicatorName: result.indicatorName,
        results: result.results.map((res) => ({
          resultText: res.resultText,
          result: res.result.trim() === '' ? 0 : parseFloat(res.result)
        }))
      }));

      const formattedData = {
        competences: formattedCompetences,
        indicators: formattedIndicators
      };

      if (!signatureFile) {
        alert('Veuillez fournir un fichier de signature avant de valider vos objectifs.');
        handleOpenSignatureModal();
        return;
      }

      const base64Signature = await convertFileToBase64(signatureFile);

      const compareResponse = await authInstance.post(`/Signature/compare-user-signature/${userId}`, {
        ImageBase64: base64Signature
      });

      if (!compareResponse.data.isMatch) {
        alert('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
        handleOpenSignatureModal();
        return;
      }

      const response = await formulaireInstance.post('/Evaluation/ArchiveMiParcoursData', formattedData, {
        params: {
          userId: userId,
          type: type
        }
      });

      alert(response.data.message || 'Objectifs validés avec succès !');
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des objectifs :', error);
      alert(error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour.');
    }
  };

  const updateMidtermObjectif = async () => {
    try {
      // Formater les compétences
      const formattedCompetences = Object.entries(competenceRatings).map(([competenceId, performance]) => ({
        CompetenceId: parseInt(competenceId, 10),
        Performance: parseFloat(performance || 0)
      }));

      // Formater les indicateurs
      const formattedIndicators = results.map((indicator) => ({
        IndicatorId: indicator.indicatorId,
        IndicatorName: indicator.indicatorName,
        Results: indicator.results.map((res) => ({
          ResultId: res.resultId || 0, // Inclure ResultId si disponible
          ResultText: res.resultText,
          Result: res.result.trim() === '' ? 0 : parseFloat(res.result)
        }))
      }));

      // Combiner les compétences et les indicateurs dans formattedData
      const formattedData = {
        Competences: formattedCompetences,
        Indicators: formattedIndicators
      };

      console.log(formattedData);

      // Vérifier la présence du fichier de signature
      if (!signatureFile) {
        alert('Veuillez fournir un fichier de signature avant de mettre à jour vos objectifs.');
        handleOpenSignatureModal();
        return;
      }

      // Convertir le fichier de signature en Base64
      const base64Signature = await convertFileToBase64(signatureFile);

      // Comparer la signature avec celle du manager
      const compareResponse = await authInstance.post(`/Signature/compare-user-signature/${managerId}`, {
        ImageBase64: base64Signature
      });

      if (!compareResponse.data.isMatch) {
        alert('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
        handleOpenSignatureModal();
        return;
      }

      // Envoyer les données formatées à l'API
      const response = await formulaireInstance.put(
        `/Evaluation/UpdateMidtermObjectifNoncadre?userId=${userId}&type=${type}`,
        formattedData
      );

      // Afficher un message de succès et recharger la page
      alert(response.data.message || 'Objectifs mis à jour avec succès !');
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des objectifs :', error);
      alert(error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour.');
    }
  };

  const handleCompetenceLevelChange = (competenceId, levelValue) => {
    setCompetenceRatings((prev) => ({
      ...prev,
      [competenceId]: levelValue
    }));
  };

  return (
    <Box p={3}>
      {!hasUserData && <Alert severity="info">Le collaborateur n'a pas encore validé ses objectifs.</Alert>}
      {!isValidateCompetence && <Alert severity="info">Votre manager n'a pas encore validé vos résultats</Alert>}

      {/* ÉTAPE DES COMPÉTENCES */}
      {competences.length > 0 && activeStep === -1 && (
        <>
          <Box>
            <List>
              {competences.map((comp) => (
                <Card key={comp.competenceId}>
                  <CardContent>
                    <Accordion>
                      {/* Titre de la Compétence */}
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel-${comp.competenceId}-content`}
                        id={`panel-${comp.competenceId}-header`}
                      >
                        <Box display="flex" alignItems="center">
                          <CheckCircleIcon sx={{ color: '#757575', mr: 1 }} />
                          <Typography variant="h5" sx={{ fontWeight: '600', color: '#333333' }}>
                            {comp.name}
                          </Typography>
                        </Box>
                      </AccordionSummary>

                      {/* Détails de la Compétence */}
                      <AccordionDetails>
                        <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0' }}>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>
                                  <strong>Niveau</strong>
                                </TableCell>
                                <TableCell>
                                  <strong>Description</strong>
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {/* Niveaux de Compétence */}
                              {comp.levels.map((level) => (
                                <TableRow key={level.levelId}>
                                  <TableCell>{level.levelName}%</TableCell>
                                  <TableCell>{level.description}</TableCell>
                                </TableRow>
                              ))}

                              {/* Affichage du Pourcentage Total */}
                              <TableRow>
                                <TableCell>
                                  <strong>Pourcentage Total</strong>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="h6" sx={{ color: '#3f51b5' }}>
                                    {competenceRatings[comp.competenceId] || 'N/A'}%
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </List>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, paddingRight: 4 }}>
            <Button variant="contained" color="primary" onClick={handleNext}>
              Suivant
            </Button>
          </Box>
        </>
      )}

      {/* ÉTAPE DES INDICATEURS */}
      {hasUserData && indicators.length > 0 && activeStep >= 0 && (
        <>
          {indicators.map((indicator) => {
            const currentResult = results.find((res) => res.indicatorId === indicator.indicatorId);

            return (
              <Card key={indicator.indicatorId} sx={{ marginBottom: 4 }}>
                <CardContent>
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{
                      marginBottom: '20px',
                      backgroundColor: '#e8eaf6',
                      padding: 3,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    {indicator.label}
                    <IconTargetArrow style={{ color: '#3f51b5' }} />
                  </Typography>
                  <TableContainer component="div">
                    <Table sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell
                            sx={{
                              fontWeight: 'bold',
                              color: '#333333',
                              textAlign: 'left',
                              borderRight: '1px solid rgba(224, 224, 224, 1)',
                              width: '25%'
                            }}
                          >
                            <strong>Objectif</strong>
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 'bold',
                              color: '#333333',
                              textAlign: 'left',
                              borderRight: '1px solid rgba(224, 224, 224, 1)',
                              width: '35%'
                            }}
                          >
                            <strong>Résultat (Texte)</strong>
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 'bold',
                              color: '#333333',
                              textAlign: 'left',
                              borderRight: '1px solid rgba(224, 224, 224, 1)',
                              width: '5%'
                            }}
                          >
                            <strong>Valeur</strong>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {!currentResult || currentResult.results.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3}>
                              <Typography>Aucun résultat</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentResult.results.map((result, index) => (
                            <TableRow key={`${indicator.indicatorId}-${index}`}>
                              {index === 0 && (
                                <TableCell
                                  rowSpan={currentResult.results.length}
                                  sx={{
                                    borderRight: '1px solid rgba(224, 224, 224, 1)',
                                    width: '25%'
                                  }}
                                >
                                  <Typography>{currentResult.indicatorName || 'N/A'}</Typography>
                                </TableCell>
                              )}
                              <TableCell
                                sx={{
                                  borderRight: '1px solid rgba(224, 224, 224, 1)',
                                  width: '35%'
                                }}
                              >
                                <Typography>{result.resultText || ''}</Typography>
                              </TableCell>
                              <TableCell
                                sx={{
                                  borderRight: '1px solid rgba(224, 224, 224, 1)',
                                  width: '5%'
                                }}
                              >
                                <Box
                                  sx={{
                                    backgroundColor: result.result
                                      ? result.result >= 50
                                        ? '#E8EAF6'
                                        : 'rgba(244, 67, 54, 0.1)'
                                      : 'transparent',
                                    color: result.result ? (result.result >= 50 ? 'primary.main' : 'error.main') : 'inherit',
                                    padding: result.result ? '8px 16px' : '0',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                  }}
                                >
                                  <Typography>{result.result ? `${result.result} %` : ''}</Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            );
          })}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              disabled={isValidate}
              onClick={() => {
                if (validateStep()) {
                  if (!signatureFile) {
                    handleOpenSignatureModal();
                  } else {
                    validateMidtermObjectifHistory();
                  }
                }
              }}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              {isValidate ? 'Déjà validé' : 'Valider'}
            </Button>
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
                  validateMidtermObjectifHistory();
                }}
                variant="contained"
                color="primary"
              >
                Confirmer
              </Button>
            </DialogActions>
          </Dialog>

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
        </>
      )}
    </Box>
  );
}

export default ManagerNMp;
