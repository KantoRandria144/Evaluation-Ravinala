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
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { IconTargetArrow } from '@tabler/icons-react';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InputAdornment from '@mui/material/InputAdornment';

function ManagerNMp({ subordinateId, typeUser }) {
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user.id;

  const managerId = userId;
  const subordoneId = subordinateId;
  const type = typeUser;

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
  const [isLoading, setIsLoading] = useState(false);

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
      await fetchUserCompetences(evalId, subordoneId, fetchCompetences);
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
      const response = await formulaireInstance.get('/Evaluation/GetArchivedDataMp', {
        params: {
          userId: subordoneId,
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
          alert(`Veuillez saisir un pourcentage pour : ${comp.name}`);
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

  const validateMidtermObjectif = async () => {
    try {
      setIsLoading(true);
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

      // Supprimer cette partie :
      // if (!signatureFile) {
      //   alert('Veuillez fournir un fichier de signature avant de valider vos objectifs.');
      //   handleOpenSignatureModal();
      //   return;
      // }

      // const base64Signature = await convertFileToBase64(signatureFile);

      // const compareResponse = await authInstance.post(`/Signature/compare-user-signature/${managerId}`, {
      //   ImageBase64: base64Signature
      // });

      // if (!compareResponse.data.isMatch) {
      //   alert('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
      //   handleOpenSignatureModal();
      //   return;
      // }

      const response = await formulaireInstance.post('/Evaluation/ValidateResultManager', formattedData, {
        params: {
          userId: subordoneId,
          type: type
        }
      });

      alert(response.data.message || 'Objectifs validés avec succès !');
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des objectifs :', error);
      alert(error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMidtermObjectif = async () => {
    try {
      setIsLoading(true);

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
          ResultId: res.resultId || 0,
          ResultText: res.resultText,
          Result: res.result.trim() === '' ? 0 : parseFloat(res.result)
        }))
      }));

      const formattedData = {
        Competences: formattedCompetences,
        Indicators: formattedIndicators
      };

      console.log(formattedData);

      // Supprimer cette partie :
      // if (!signatureFile) {
      //   alert('Veuillez fournir un fichier de signature avant de mettre à jour vos objectifs.');
      //   handleOpenSignatureModal();
      //   return;
      // }

      // const base64Signature = await convertFileToBase64(signatureFile);

      // const compareResponse = await authInstance.post(`/Signature/compare-user-signature/${managerId}`, {
      //   ImageBase64: base64Signature
      // });

      // if (!compareResponse.data.isMatch) {
      //   alert('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
      //   handleOpenSignatureModal();
      //   return;
      // }

      const response = await formulaireInstance.put(
        `/Evaluation/UpdateMidtermObjectifNoncadre?userId=${subordoneId}&type=${type}`,
        formattedData
      );

      alert(response.data.message || 'Objectifs mis à jour avec succès !');
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des objectifs :', error);
      alert(error.response?.data?.message || 'Une erreur est survenue lors de la mise à jour.');
    } finally {
      setIsLoading(false);
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

      {/* ÉTAPE DES COMPÉTENCES */}
      {competences.length > 0 && activeStep === -1 && (
        <>
          <Box>
            <List>
              {competences.map((comp) => (
                <Card>
                  <CardContent>
                    <Accordion>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel-${comp.competenceId}-content`}
                        id={`panel-${comp.competenceId}-header`} sx={{backgroundColor:'#80808014'}}
                      >
                        <Box display="flex" alignItems="center" >
                          <CheckCircleIcon sx={{ color: '#4caf50', mr: 1 }} />
                          <Typography variant="h5" sx={{ fontWeight: '600', color: '#333333' }}>
                            {comp.name}
                          </Typography>
                        </Box>
                      </AccordionSummary>

                      <AccordionDetails>
                        <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0' }}>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ width: '200px' }}>
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

                              {/* Champ de Saisie pour le Pourcentage */}
                              <TableRow>
                                <TableCell colSpan={2}>
                                  <TextField
                                    fullWidth
                                    variant="outlined"
                                    label="Pourcentage"
                                    placeholder="Ex: 50, 75, 100"
                                    value={competenceRatings[comp.competenceId] || ''}
                                    onChange={(e) => {
                                      let value = e.target.value;
                                      if (!/^\d{0,3}([.,]\d{0,2})?$/.test(value)) return;
                                      value = value.replace(',', '.');
                                      handleCompetenceLevelChange(comp.competenceId, value);
                                    }}
                                    InputProps={{
                                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                                    }}
                                  />
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
            <Button variant="contained" color="primary" onClick={handleNext} endIcon={<KeyboardArrowRight />}>
              Suivant
            </Button>
          </Box>
        </>
      )}

      {/* ÉTAPE DES INDICATEURS */}
      {hasUserData && indicators.length > 0 && activeStep >= 0 && (
        <>
          <Paper sx={{ p: 2, mt: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {indicators.map((indicator) => (
                <Step key={indicator.indicatorId}>
                  <StepLabel>{indicator.label}</StepLabel>
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
                {indicators[activeStep] && (
                  <Card>
                    <CardContent>
                      <Typography
                        variant="h5"
                        gutterBottom
                        sx={{
                          marginBottom: '20px',
                          backgroundColor: '#f5f5f5',
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

                      <Paper sx={{ p: 3, border: '1px solid #ccc', backgroundColor: '#e8eaf6' }}>
                        <TextField
                          fullWidth
                          label={
                            <span>
                              Objectif <span style={{ color: 'red' }}>*</span>
                            </span>
                          }
                          multiline
                          minRows={2}
                          value={results.find((res) => res.indicatorId === indicators[activeStep].indicatorId)?.indicatorName || ''}
                          onChange={(e) => handleIndicatorNameChange(indicators[activeStep].indicatorId, e.target.value)}
                          sx={{ marginBottom: 2 }}
                          variant="outlined"
                        />

                        <Typography variant="subtitle1" gutterBottom sx={{ mb: 2, mt:5 }} align="center">
                          Indicateur de résultat <span style={{ color: 'red' }}>*</span>
                        </Typography>

                        {results
                          .find((res) => res.indicatorId === indicators[activeStep].indicatorId)
                          ?.results.map((result, index) => (
                            <React.Fragment key={index}>
                              <Card
                                sx={{
                                  padding: 2,
                                  borderRadius: 2,
                                  backgroundColor: '#ffffff'
                                }}
                              >
                                <CardContent>
                                  <Typography variant="h6" sx={{ marginBottom: 1, fontWeight: 'bold', color: '#3F51B5' }}>
                                    {index + 1}.
                                  </Typography>
                                  <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                      <TextField
                                        fullWidth
                                        label="Indicateur"
                                        value={result.resultText}
                                        multiline
                                        minRows={2}
                                        onChange={(e) => handleResultChange(indicators[activeStep].indicatorId, index, e.target.value)}
                                        variant="outlined"
                                        sx={{ backgroundColor: '#ffffff' }}
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <TextField
                                        fullWidth
                                        label="Résultat"
                                        type="text"
                                        value={result.result}
                                        onChange={(e) => {
                                          let value = e.target.value;
                                          if (!/^\d{0,3}([.,]\d{0,2})?$/.test(value)) return;
                                          value = value.replace(',', '.');
                                          handleResultNumberChange(indicators[activeStep].indicatorId, index, value)
                                        }}
                                        variant="outlined"
                                        sx={{ backgroundColor: '#ffffff' }}
                                        InputProps={{
                                          endAdornment: <InputAdornment position="end">%</InputAdornment>
                                        }}
                                      />
                                    </Grid>
                                  </Grid>
                                </CardContent>
                              </Card>
                              {/* Add a Divider between each Card */}
                              {index !==
                                results.find((res) => res.indicatorId === indicators[activeStep].indicatorId)?.results.length - 1 && (
                                <Divider sx={{ marginBottom: 3 }} />
                              )}
                            </React.Fragment>
                          ))}
                      </Paper>
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
                isValidateCompetence ? (
                  <Button
                    variant="contained"
                    color="success"
                    disabled={isValidate || isLoading}
                    onClick={() => {
                      if (validateStep()) {
                        updateMidtermObjectif();
                      }
                    }}
                    startIcon={
                      isLoading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : null
                    }
                  >
                    {isValidate ? 'Déjà validé' : isLoading ? 'En cours...' : 'Mettre à jour'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    disabled={isValidate || isLoading}
                    onClick={() => {
                      if (validateStep()) {
                        validateMidtermObjectif();
                      }
                    }}
                    sx={{ textTransform: 'none', fontWeight: 'bold' }}
                    startIcon={
                      isLoading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : null
                    }
                  >
                    {isLoading ? 'En cours...' : isValidate ? 'Déjà validé' : 'Valider'}
                  </Button>
                )
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
            {/* <Dialog open={openSignatureModal} onClose={handleCloseSignatureModal}>
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
                    if (isValidateCompetence) {
                      updateMidtermObjectif();
                    } else {
                      validateMidtermObjectif();
                    }
                  }}
                  variant="contained"
                  color="primary"
                >
                  Confirmer
                </Button>
              </DialogActions>
            </Dialog> */}

            {/* <Dialog open={openNoSignatureModal} onClose={() => setOpenNoSignatureModal(false)}>
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
            </Dialog> */}
          </Box>
        </>
      )}
    </Box>
  );
}

export default ManagerNMp;
