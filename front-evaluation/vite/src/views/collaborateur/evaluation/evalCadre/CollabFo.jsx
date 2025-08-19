import React, { useEffect, useState } from 'react';
import { formulaireInstance, authInstance } from '../../../../axiosConfig';
import MainCard from 'ui-component/cards/MainCard';
import {
  Box,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Container,
  Tooltip,
  IconButton,
  Snackbar,
  Alert,
  InputAdornment
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { IconTargetArrow } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import CollabMp from './CollabMp';
import CollabFi from './CollabFi';
import HelpIcon from '@mui/icons-material/Help';
import AuditService from '../../../../services/AuditService';

function CollabFo() {
  const user = JSON.parse(localStorage.getItem('user'));
  const userType = user.typeUser;
  const userId = user.id;

  const [evalId, setEvalId] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [hasOngoingEvaluation, setHasOngoingEvaluation] = useState(false);
  const [template, setTemplate] = useState({ templateStrategicPriorities: [] });
  const [activeStep, setActiveStep] = useState(0);
  const [userObjectives, setUserObjectives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [signatureFile, setSignatureFile] = useState(null);
  const [openSignatureModal, setOpenSignatureModal] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [openNoSignatureModal, setOpenNoSignatureModal] = useState(false);
  const [openSignatureRecommendationModal, setOpenSignatureRecommendationModal] = useState(false);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const navigate = useNavigate();

  const handleOpenHelpModal = () => {
    setOpenHelpModal(true);
  };

  const handleCloseHelpModal = () => {
    setOpenHelpModal(false);
  };

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

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage('');
  };

  const checkUserSignature = async (userId) => {
    try {
      const response = await authInstance.get(`/Signature/get-user-signature/${userId}`);
      return !!response.data.signature;
    } catch (error) {
      return false;
    }
  };

  const fetchCadreTemplateId = async () => {
    try {
      const response = await formulaireInstance.get('/Template/CadreTemplate');
      if (response.data?.templateId) setTemplateId(response.data.templateId);
    } catch (error) {
      console.error('Erreur lors de la récupération du Template ID:', error);
      setErrorMessage('Erreur lors de la récupération de l\'ID du modèle.');
      setOpenSnackbar(true);
    }
  };

  const checkOngoingEvaluation = async () => {
    try {
      const response = await formulaireInstance.get('/Periode/enCours', {
        params: { type: 'Cadre' }
      });
      setHasOngoingEvaluation(response.data.length > 0);
      if (response.data.length > 0) {
        setEvalId(response.data[0].evalId);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des évaluations:', error);
      setErrorMessage('Erreur lors de la vérification des évaluations.');
      setOpenSnackbar(true);
    }
  };

  const fetchTemplate = async () => {
    if (!templateId) return;

    try {
      const response = await formulaireInstance.get(`/Template/${templateId}`);
      setTemplate(response.data.template || { templateStrategicPriorities: [] });

      const periodResponse = await formulaireInstance.get('/Periode/periodeActel', { params: { type: 'Cadre' } });
      if (periodResponse.data?.length > 0) {
        setCurrentPeriod(periodResponse.data[0].currentPeriod);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du Template:', error);
      setErrorMessage('Erreur lors de la récupération du modèle de formulaire.');
      setOpenSnackbar(true);
    }
  };

  const fetchUserObjectives = async (evalId, userId) => {
    try {
      const response = await formulaireInstance.get('/Evaluation/userObjectif', {
        params: { evalId, userId }
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des objectifs de l'utilisateur :", error);
      return null;
    }
  };

  useEffect(() => {
    const loadUserObjectives = async () => {
      if (evalId && userId) {
        try {
          const objectives = await fetchUserObjectives(evalId, userId);
          if (objectives && objectives.length > 0) {
            setUserObjectives(objectives);
            setTemplate((prevTemplate) => {
              const updatedPriorities = prevTemplate.templateStrategicPriorities.map((priority) => {
                const priorityObjectives = objectives.filter((obj) => obj.templateStrategicPriority.name === priority.name);

                return {
                  ...priority,
                  objectives: priorityObjectives.map((obj) => ({
                    objectiveId: obj.objectiveId,
                    description: obj.description || '',
                    weighting: obj.weighting || '',
                    resultIndicator: obj.resultIndicator || '',
                    dynamicColumns:
                      obj.objectiveColumnValues?.map((col) => ({
                        columnName: col.columnName,
                        value: col.value || ''
                      })) || []
                  }))
                };
              });

              return { ...prevTemplate, templateStrategicPriorities: updatedPriorities };
            });
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des objectifs.', error);
          setErrorMessage('Erreur lors de la récupération des objectifs.');
          setOpenSnackbar(true);
        }
      }
      setIsLoading(false);
    };

    loadUserObjectives();
  }, [evalId, userId]);

  const handleObjectiveChange = (priorityName, objectiveIndex, field, value, columnIndex = null) => {
    setTemplate((prevTemplate) => {
      const updatedPriorities = prevTemplate.templateStrategicPriorities.map((priority) => {
        if (priority.name !== priorityName) return priority;

        const updatedObjectives = [...(priority.objectives || [])];

        if (!updatedObjectives[objectiveIndex]) {
          updatedObjectives[objectiveIndex] = {
            description: '',
            weighting: '',
            resultIndicator: '',
            dynamicColumns: []
          };
        }

        const objective = { ...updatedObjectives[objectiveIndex] };

        if (columnIndex !== null) {
          if (!Array.isArray(objective.dynamicColumns)) {
            objective.dynamicColumns = [];
          }
          if (!objective.dynamicColumns[columnIndex]) {
            objective.dynamicColumns[columnIndex] = {
              columnName: '',
              value: ''
            };
          }
          objective.dynamicColumns[columnIndex] = {
            ...objective.dynamicColumns[columnIndex],
            value
          };
        } else {
          if (field === 'weighting') {
            let parsedValue = value.replace(',', '.');
            if (!/^\d{0,3}(\.\d{0,2})?$/.test(parsedValue)) return priority;
            const numericValue = parseFloat(parsedValue);
            if (numericValue > 100) {
              setErrorMessage('La pondération ne peut pas dépasser 100%.');
              setOpenSnackbar(true);
              return priority;
            }
            objective[field] = parsedValue;
          } else {
            objective[field] = value;
          }
        }

        updatedObjectives[objectiveIndex] = objective;
        return { ...priority, objectives: updatedObjectives };
      });

      return { ...prevTemplate, templateStrategicPriorities: updatedPriorities };
    });
  };

  const checkIfValidated = async () => {
    try {
      const response = await formulaireInstance.get('/Evaluation/getUserObjectivesHistory', {
        params: { userId, type: userType }
      });

      if (response.data && response.data.historyCFos && response.data.historyCFos.length > 0) {
        const validatedEntry = response.data.historyCFos.find((entry) => entry.validatedBy);
        setIsValidated(!!validatedEntry);
      } else {
        setIsValidated(false); // No history or no validated entries, expected case
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des données validées :', error);
      // Only show error for network/server issues, not for empty data
      if (error.response?.status >= 500) {
        setErrorMessage('Erreur serveur lors de la vérification des données validées.');
        setOpenSnackbar(true);
      }
    }
  };

  useEffect(() => {
    fetchCadreTemplateId();
    checkOngoingEvaluation();
    checkIfValidated();
  }, []);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  useEffect(() => {
    const recommendAddingSignature = async () => {
      try {
        const hasSignature = await checkUserSignature(userId);
        if (!hasSignature) {
          setOpenSignatureRecommendationModal(true);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la signature :', error);
        setErrorMessage('Erreur lors de la vérification de la signature.');
        setOpenSnackbar(true);
      }
    };

    recommendAddingSignature();
  }, [userId]);

  const handleContinueWithoutSignature = () => {
    setOpenSignatureRecommendationModal(false);
  };

  const calculateTotalWeighting = (priority) => {
    return (priority.objectives || []).reduce((sum, obj) => {
      const weighting = parseFloat(obj.weighting) || 0;
      return sum + weighting;
    }, 0);
  };

  const validateStep = () => {
    const currentPriority = template.templateStrategicPriorities[activeStep];
    if (!currentPriority) return false;

    let isAnyObjectiveFilled = false;
    const totalWeighting = calculateTotalWeighting(currentPriority);

    if (totalWeighting > 100) {
      setErrorMessage(`La somme des pondérations pour "${currentPriority.name}" ne peut pas dépasser 100%. Actuel: ${totalWeighting}%`);
      setOpenSnackbar(true);
      return false;
    }

    for (const [index, objective] of (currentPriority.objectives || []).entries()) {
      const isObjectivePartiallyFilled = objective.description || objective.weighting || objective.resultIndicator;
      const hasDynamicColumns = Array.isArray(objective.dynamicColumns);
      const isAnyDynamicColumnFilled = hasDynamicColumns ? objective.dynamicColumns.some((column) => column.value) : false;

      if (isAnyDynamicColumnFilled && (!objective.description || !objective.weighting || !objective.resultIndicator)) {
        setErrorMessage(
          `Tous les champs obligatoires doivent être remplis pour l'objectif ${index + 1} dans "${currentPriority.name}".`
        );
        setOpenSnackbar(true);
        return false;
      }

      if (isObjectivePartiallyFilled) {
        isAnyObjectiveFilled = true;

        if (!objective.description || !objective.weighting || !objective.resultIndicator) {
          setErrorMessage(
            `Tous les champs obligatoires doivent être remplis pour l'objectif ${index + 1} dans "${currentPriority.name}".`
          );
          setOpenSnackbar(true);
          return false;
        }
      }
    }

    if (!isAnyObjectiveFilled) {
      setErrorMessage(`Veuillez remplir au moins un objectif pour "${currentPriority.name}".`);
      setOpenSnackbar(true);
      return false;
    }

    return true;
  };

  const steps = template.templateStrategicPriorities.map((priority) => priority.name);

  const validateUserObjectives = async () => {
  try {
    // Validate total weightings for all priorities
    for (const priority of template.templateStrategicPriorities) {
      const totalWeighting = calculateTotalWeighting(priority);
      if (totalWeighting > 100) {
        setErrorMessage(`La somme des pondérations pour "${priority.name}" ne peut pas dépasser 100%. Actuel: ${totalWeighting}%`);
        setOpenSnackbar(true);
        return;
      }
    }

    const objectivesData = template.templateStrategicPriorities.flatMap((priority) =>
      (priority.objectives || []).map((objective) => ({
        priorityId: priority.templatePriorityId,
        priorityName: priority.name,
        description: objective.description || '',
        weighting: parseFloat(objective.weighting) || 0,
        resultIndicator: objective.resultIndicator || '',
        result: parseFloat(objective.result) || 0,
        dynamicColumns:
          objective.dynamicColumns?.map((col) => ({
            columnName: col.columnName,
            value: col.value
          })) || []
      }))
    );

    if (!objectivesData.some((obj) => obj.description && obj.weighting && obj.resultIndicator)) {
      setErrorMessage('Veuillez remplir au moins un objectif avec tous les champs requis.');
      setOpenSnackbar(true);
      return;
    }

    const hasSignature = await checkUserSignature(userId);

    if (hasSignature && signatureFile) {
      const fileReader = new FileReader();
      fileReader.onloadend = async () => {
        const base64String = fileReader.result;
        const imageBase64 = base64String.split(',')[1];

        try {
          const compareResponse = await authInstance.post(
            `/Signature/compare-user-signature/${userId}`,
            { imageBase64 },
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (!compareResponse.data.isMatch) {
            setErrorMessage('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
            setOpenSnackbar(true);
            handleOpenSignatureModal();
            return;
          }

          const response = await formulaireInstance.post('/Evaluation/validateUserObjectives', objectivesData, {
            params: { userId, type: userType }
          });

          // Add audit logging
          await AuditService.logAction(
            userId,
            `Validation des objectifs pour l'évaluation avec evalId: ${evalId}`,
            'Create',
            null,
            null,
            { objectives: objectivesData }
          );

          alert(response.data.message || 'Objectifs validés avec succès !');
          window.location.reload();
        } catch (error) {
          setErrorMessage(error.response?.data?.message || 'Une erreur est survenue lors de la validation.');
          setOpenSnackbar(true);
          console.error('Erreur lors de la validation des objectifs :', error);
        }
      };

      fileReader.onerror = () => {
        setErrorMessage('Impossible de lire le fichier de signature. Veuillez réessayer.');
        setOpenSnackbar(true);
      };

      fileReader.readAsDataURL(signatureFile);
    } else {
      const response = await formulaireInstance.post('/Evaluation/validateUserObjectives', objectivesData, {
        params: { userId, type: userType }
      });

      // Add audit logging
      await AuditService.logAction(
        userId,
        `Validation des objectifs pour l'évaluation avec evalId: ${evalId}`,
        'Create',
        null,
        null,
        { objectives: objectivesData }
      );

      alert(response.data.message || 'Objectifs validés avec succès !');
      window.location.reload();
    }
  } catch (error) {
    console.error('Erreur lors de la validation des objectifs :', error);
    setErrorMessage('Une erreur imprévue est survenue.');
    setOpenSnackbar(true);
  }
};

  const updateUserObjectives = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user.id;

      // Validate total weightings for all priorities
      for (const priority of template.templateStrategicPriorities) {
        const totalWeighting = calculateTotalWeighting(priority);
        if (totalWeighting > 100) {
          setErrorMessage(`La somme des pondérations pour "${priority.name}" ne peut pas dépasser 100%. Actuel: ${totalWeighting}%`);
          setOpenSnackbar(true);
          return;
        }
      }

      // Fetch current objectives for oldValues
      const currentObjectives = await fetchUserObjectives(evalId, userId);
      const oldValues = currentObjectives
        ? currentObjectives.map((objective) => ({
            objectiveId: objective.objectiveId,
            description: objective.description || '',
            weighting: parseFloat(objective.weighting) || 0,
            resultIndicator: objective.resultIndicator || '',
            result: parseFloat(objective.result) || 0,
            templateStrategicPriority: {
              templatePriorityId: objective.templateStrategicPriority?.templatePriorityId || null,
              name: objective.templateStrategicPriority?.name || '',
              maxObjectives: objective.templateStrategicPriority?.maxObjectives || 0
            },
            objectiveColumnValues:
              objective.objectiveColumnValues?.map((col) => ({
                columnName: col.columnName,
                value: col.value || ''
              })) || []
          }))
        : null;

      const objectivesData = template.templateStrategicPriorities.flatMap((priority) =>
        (priority.objectives || []).map((objective) => ({
          objectiveId: objective.objectiveId,
          description: objective.description || '',
          weighting: parseFloat(objective.weighting) || 0,
          resultIndicator: objective.resultIndicator || '',
          result: parseFloat(objective.result) || 0,
          templateStrategicPriority: {
            templatePriorityId: priority.templatePriorityId,
            name: priority.name,
            maxObjectives: priority.maxObjectives || 0
          },
          objectiveColumnValues:
            objective.dynamicColumns?.map((col) => ({
              columnName: col.columnName,
              value: col.value
            })) || []
        }))
      );

      const hasSignature = await checkUserSignature(userId);

      if (hasSignature && signatureFile) {
        const convertFileToBase64 = (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };

        const base64Signature = await convertFileToBase64(signatureFile);

        const compareResponse = await authInstance.post(`/Signature/compare-user-signature/${userId}`, {
          ImageBase64: base64Signature
        });

        if (!compareResponse.data.isMatch) {
          setErrorMessage('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
          setOpenSnackbar(true);
          handleOpenSignatureModal();
          return;
        }
      }

      const response = await formulaireInstance.put('/Evaluation/userObjectif', objectivesData, {
        params: { evalId, userId }
      });

      // Add audit logging
      await AuditService.logAction(
        userId,
        `Mise à jour des objectifs pour l'évaluation avec evalId: ${evalId}`,
        'Update',
        null,
        { objectives: oldValues },
        { objectives: objectivesData }
      );

      alert(response.data.Message || 'Objectifs mis à jour avec succès !');
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des objectifs :', error);
      setErrorMessage(error.response?.data?.Message || 'Une erreur est survenue lors de la mise à jour.');
      setOpenSnackbar(true);
    }
  };
  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  if (!hasOngoingEvaluation) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '70vh'
        }}
      >
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
          <Card
            sx={{
              boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}
          >
            <CardContent
              sx={{
                padding: 4,
                textAlign: 'center',
                backgroundColor: 'background.paper',
                color: 'text.primary'
              }}
            >
              <Box
                sx={{
                  marginBottom: 3,
                  padding: 2,
                  borderRadius: '12px',
                  backgroundColor: 'primary.lighter',
                  border: '1px solid',
                  borderColor: 'primary.main'
                }}
              >
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  Aucune évaluation en cours
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ marginTop: 1 }}>
                  Vous serez informé dès le commencement d'une nouvelle évaluation.
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => navigate('/dashboard/default')}
                sx={{
                  padding: '10px 32px',
                  borderRadius: '8px',
                  textTransform: 'none',
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)'
                  }
                }}
              >
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    );
  }

  return (
    <>
      <Paper>
        <MainCard>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="subtitle2">Évaluation</Typography>
              <Typography variant="h3">
                Période actuelle: <span style={{ color: '#3949AB' }}>{currentPeriod}</span>
              </Typography>
            </Grid>
            <Grid item>
              <Tooltip title="Besoin d'aide ?" arrow>
                <IconButton aria-label="aide" onClick={handleOpenHelpModal}>
                  <HelpIcon sx={{ fontSize: 20, color: 'black' }} />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </MainCard>

        {currentPeriod === 'Fixation Objectif' && (
          <Box p={3}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {template.templateStrategicPriorities.length > 0 && activeStep < steps.length && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  style={{ marginTop: '2rem' }}
                >
                  <Card>
                    <CardContent>
                      <Typography
                        variant="h5"
                        gutterBottom
                        sx={{
                          marginBottom: '20px',
                          backgroundColor: '#fafafa',
                          padding: 3,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        {template.templateStrategicPriorities[activeStep].name}
                        <IconTargetArrow style={{ color: '#3F51B5' }} />
                      </Typography>

                      <Grid container spacing={3}>
                        {Array.from({ length: template.templateStrategicPriorities[activeStep].maxObjectives }).map((_, objIndex) => {
                          const objective = template.templateStrategicPriorities[activeStep].objectives[objIndex] || {};

                          return (
                            <Grid item xs={12} key={objIndex}>
                              <Paper sx={{ p: 3, backgroundColor: '#e8eaf6' }}>
                                <Typography variant="h6" sx={{ mb: '20px' }} gutterBottom>
                                  Objectif {objIndex + 1}
                                </Typography>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={12}>
                                    <TextField
                                      label={
                                        <span>
                                          Description de l'Objectif <span style={{ color: 'red' }}>*</span>
                                        </span>
                                      }
                                      fullWidth
                                      variant="outlined"
                                      multiline
                                      minRows={2}
                                      value={objective.description || ''}
                                      onChange={(e) =>
                                        handleObjectiveChange(
                                          template.templateStrategicPriorities[activeStep].name,
                                          objIndex,
                                          'description',
                                          e.target.value
                                        )
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12}>
                                    <TextField
                                      label={
                                        <span>
                                          Pondération <span style={{ color: 'red' }}>*</span>
                                        </span>
                                      }
                                      fullWidth
                                      variant="outlined"
                                      type="number"
                                      inputProps={{ min: 0, max: 100, step: 0.01 }}
                                      value={objective.weighting || ''}
                                      onChange={(e) =>
                                        handleObjectiveChange(
                                          template.templateStrategicPriorities[activeStep].name,
                                          objIndex,
                                          'weighting',
                                          e.target.value
                                        )
                                      }
                                      error={parseFloat(objective.weighting) > 100}
                                      helperText={parseFloat(objective.weighting) > 100 ? 'Maximum 100%' : ''}
                                      InputProps={{
                                        endAdornment: <InputAdornment position="end">%</InputAdornment>
                                      }}
                                    />
                                  </Grid>

                                  <Grid item xs={12}>
                                    <TextField
                                      label={
                                        <span>
                                          Indicateur de résultat <span style={{ color: 'red' }}>*</span>
                                        </span>
                                      }
                                      fullWidth
                                      variant="outlined"
                                      multiline
                                      minRows={2}
                                      value={objective.resultIndicator || ''}
                                      onChange={(e) =>
                                        handleObjectiveChange(
                                          template.templateStrategicPriorities[activeStep].name,
                                          objIndex,
                                          'resultIndicator',
                                          e.target.value
                                        )
                                      }
                                    />
                                  </Grid>

                                  {Array.isArray(objective.dynamicColumns) &&
                                    objective.dynamicColumns.map((column, colIndex) => (
                                      <Grid item xs={12} key={colIndex}>
                                        <Box sx={{ mb: 2 }}>
                                          <Typography variant="subtitle3" gutterBottom>
                                            {column.columnName || `Colonne ${colIndex + 1}`}
                                          </Typography>
                                          <TextField
                                            fullWidth
                                            variant="outlined"
                                            multiline
                                            minRows={2}
                                            value={column.value || ''}
                                            onChange={(e) =>
                                              handleObjectiveChange(
                                                template.templateStrategicPriorities[activeStep].name,
                                                objIndex,
                                                'dynamicColumns',
                                                e.target.value,
                                                colIndex
                                              )
                                            }
                                          />
                                        </Box>
                                      </Grid>
                                    ))}
                                </Grid>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                variant="contained"
                color="primary"
                startIcon={<KeyboardArrowLeft />}
              >
                Précédent
              </Button>

              {activeStep === steps.length - 1 ? (
                isValidated ? (
                  <Button variant="contained" color="secondary" disabled>
                    Déjà validé
                  </Button>
                ) : userObjectives && userObjectives.length > 0 ? (
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={() => {
                      if (validateStep()) {
                        updateUserObjectives();
                      }
                    }}
                    disabled={template.templateStrategicPriorities.some((p) => calculateTotalWeighting(p) > 100)}
                  >
                    Mettre à jour
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => {
                      if (validateStep()) {
                        validateUserObjectives();
                      }
                    }}
                    disabled={template.templateStrategicPriorities.some((p) => calculateTotalWeighting(p) > 100)}
                  >
                    Valider
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
                  disabled={calculateTotalWeighting(template.templateStrategicPriorities[activeStep]) > 100}
                >
                  Suivant
                </Button>
              )}
            </Box>

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
                    if (userObjectives && userObjectives.length > 0) {
                      updateUserObjectives();
                    } else {
                      validateUserObjectives();
                    }
                  }}
                  variant="contained"
                  color="primary"
                  disabled={!signatureFile}
                >
                  Confirmer
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={openSignatureRecommendationModal}
              onClose={handleContinueWithoutSignature}
              aria-labelledby="signature-recommendation-title"
            >
              <DialogTitle id="signature-recommendation-title">Signature Manquante</DialogTitle>
              <DialogContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Nous vous recommandons d’ajouter une signature avant de commencer. Cela évitera de devoir tout retaper après validation.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button variant="outlined" onClick={handleContinueWithoutSignature}>
                  Continuer sans signature
                </Button>
                <Button variant="contained" color="primary" onClick={() => navigate('/collab/profile')} sx={{ ml: 2 }}>
                  Ajouter une signature
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        <Dialog open={openHelpModal} onClose={handleCloseHelpModal} aria-labelledby="help-dialog-title">
          <DialogTitle id="help-dialog-title">Aide</DialogTitle>
          <DialogContent dividers>
            {currentPeriod === 'Fixation Objectif' && (
              <>
                <Typography variant="h6" gutterBottom>
                  Pendant cette période
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Vous devez compléter, pour chaque Priorité Stratégique, au moins un objectif, sa pondération et le résultat attendu.
                  Suivez les étapes ci-dessous pour y parvenir :
                </Typography>
                <Box component="ol" sx={{ pl: 3, mt: 2 }}>
                  <Typography component="li" variant="body2" gutterBottom>
                    Cliquez sur <strong>"Suivant"</strong> pour accéder à chaque priorité stratégique à remplir.
                  </Typography>
                  <Typography component="li" variant="body2" gutterBottom>
                    Pour chaque priorité stratégique, complétez au moins un objectif, sa pondération, et le résultat attendu. Une fois que
                    vous avez terminé, cliquez sur le bouton <strong>"Valider"</strong> pour finaliser le processus.
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 2 }} color="textSecondary">
                  Note: La somme des pondérations pour chaque priorité stratégique ne doit pas dépasser 100%.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }} color="textSecondary">
                  Vous pouvez modifier les champs remplis à tout moment{' '}
                  <span style={{ color: 'red' }}>tant que l'évaluateur n’a pas encore validé à son tour.</span>
                </Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Important :</strong> Une fois que l’évaluateur aura validé, le bouton de validation sera désactivé, et aucune
                  modification ne sera possible, sauf par votre évaluateur.
                </Typography>
              </>
            )}

            {currentPeriod === 'Mi-Parcours' && (
              <>
                <Typography variant="h6" gutterBottom>
                  Pendant cette période
                </Typography>
                <Box component="ol" sx={{ pl: 3, mt: 2 }}>
                  <Typography component="li" variant="body2" gutterBottom>
                    Veuillez consulter chaque résultats saisis par votre évaluateur.
                  </Typography>
                  <Typography component="li" variant="body2" gutterBottom>
                    Une fois terminé, validez-les en cliquant sur le bouton <strong>"Valider"</strong>.
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Important :</strong> Une fois que vous avez validé, votre évaluateur ne pourra plus apporter de modifications,
                  sauf sur les résultats durant la période d’évaluation finale.
                </Typography>
              </>
            )}

            {currentPeriod === 'Évaluation Finale' && (
              <>
                <Typography variant="h6" gutterBottom>
                  Pendant cette période
                </Typography>
                <Box component="ol" sx={{ pl: 3, mt: 2 }}>
                  <Typography component="li" variant="body2" gutterBottom>
                    Veuillez consulter les résultats modifiés par votre évaluateur.
                  </Typography>
                  <Typography component="li" variant="body2" gutterBottom>
                    Une fois terminé, validez-les en cliquant sur le bouton <strong>"Valider"</strong>.
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Important :</strong> Une fois que vous avez validé, votre évaluateur ne pourra plus apporter de modifications.
                </Typography>
              </>
            )}

            {!['Fixation Objectif', 'Mi-Parcours', 'Évaluation Finale'].includes(currentPeriod) && (
              <Typography variant="body1" gutterBottom>
                Voici quelques informations pour vous aider à utiliser cette section :
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseHelpModal} color="primary">
              Fermer
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>

        {currentPeriod === 'Mi-Parcours' && <CollabMp />}
        {currentPeriod === 'Évaluation Finale' && <CollabFi />}
      </Paper>
    </>
  );
}

export default CollabFo;