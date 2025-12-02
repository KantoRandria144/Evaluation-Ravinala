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
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Chip
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { IconTargetArrow } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import ManagerMp from './ManagerMp';
import ManagerFi from './ManagerFi';
import HelpIcon from '@mui/icons-material/Help';
import HistoryIcon from '@mui/icons-material/History';
import AuditService from '../../../../services/AuditService';

function ManagerFo() {
  const { subordinateId, typeUser } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const managerId = user.id;

  const [evalId, setEvalId] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [evaluationYear, setEvaluationYear] = useState('');
  const [hasOngoingEvaluation, setHasOngoingEvaluation] = useState(false);
  const [template, setTemplate] = useState({ templateStrategicPriorities: [] });
  const [activeStep, setActiveStep] = useState(0);
  const [userObjectives, setUserObjectives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidated, setIsValidated] = useState(false);
  const [validationHistory, setValidationHistory] = useState([]);
  const [enrichedValidationHistory, setEnrichedValidationHistory] = useState([]);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [subordinate, setSubordinate] = useState({});

  const handleOpenHelpModal = () => {
    setOpenHelpModal(true);
  };

  const handleCloseHelpModal = () => {
    setOpenHelpModal(false);
  };

  const handleOpenHistoryModal = () => {
    setOpenHistoryModal(true);
  };

  const handleCloseHistoryModal = () => {
    setOpenHistoryModal(false);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage('');
  };

  const getRequiredPercentage = (priority) => {
    return parseFloat(priority.ponderation) || 0;
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
        // Assuming the API response includes a 'year' field; fallback to current year if not
        setEvaluationYear(periodResponse.data[0].year || new Date().getFullYear().toString());
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

  const fetchSubordinate = async () => {
    if (!subordinateId) return;
    try {
      const response = await authInstance.get(`/User/user/${subordinateId}`);
      setSubordinate(response.data || {});
    } catch (error) {
      console.error('Erreur lors de la récupération des infos du collaborateur:', error);
      setErrorMessage('Erreur lors de la récupération des informations du collaborateur.');
      setOpenSnackbar(true);
    }
  };

  const fetchUserInfo = async (userId) => {
    try {
      const response = await authInstance.get(`/User/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des infos utilisateur:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadUserObjectives = async () => {
      if (evalId && subordinateId) {
        try {
          const objectives = await fetchUserObjectives(evalId, subordinateId);
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
  }, [evalId, subordinateId]);

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
        params: { userId: subordinateId, type: typeUser }
      });
      if (response.data && response.data.historyCFos && response.data.historyCFos.length > 0) {
        // Use a Set-like approach (Map) to deduplicate by validatedBy (unique validators only)
        const uniqueValidatorMap = new Map();
        const history = response.data.historyCFos.filter(entry => entry.validatedBy !== null); // Only validated entries
        history.forEach((entry) => {
          if (!uniqueValidatorMap.has(entry.validatedBy)) {
            // Take the latest entry for this validator
            uniqueValidatorMap.set(entry.validatedBy, entry);
          } else {
            const existing = uniqueValidatorMap.get(entry.validatedBy);
            if (new Date(entry.createdAt) > new Date(existing.createdAt)) {
              uniqueValidatorMap.set(entry.validatedBy, entry);
            }
          }
        });
        const uniqueHistory = Array.from(uniqueValidatorMap.values());
        setValidationHistory(uniqueHistory);
        const enriched = await Promise.all(
          uniqueHistory.map(async (entry) => {
            const userInfo = await fetchUserInfo(entry.validatedBy);
            const formattedDate = entry.date || entry.createdAt ? new Date(entry.date || entry.createdAt).toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Date non disponible';
            return {
              ...entry,
              user: userInfo,
              formattedDate,
              status: 'Validé' // Add status since validatedBy is not null
            };
          })
        );
        // Sort by date descending (latest first)
        const sortedEnriched = enriched.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
        setEnrichedValidationHistory(sortedEnriched);
        setIsValidated(uniqueHistory.length > 0);
      } else {
        setValidationHistory([]);
        setEnrichedValidationHistory([]);
        setIsValidated(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des données validées :', error);
      setValidationHistory([]);
      setEnrichedValidationHistory([]);
      if (error.response?.status === 404) {
        // Endpoint might not exist or no data, treat as not validated
        setValidationHistory([]);
        setEnrichedValidationHistory([]);
        setIsValidated(false);
      } else if (error.response?.status >= 500) {
        setErrorMessage('Erreur serveur lors de la vérification des données validées.');
        setOpenSnackbar(true);
      }
    }
  };

  useEffect(() => {
    fetchCadreTemplateId();
    checkOngoingEvaluation();
    checkIfValidated();
    fetchSubordinate();
  }, [subordinateId]);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const calculateTotalWeighting = (priority) => {
    return (priority.objectives || []).reduce((sum, obj) => {
      const weighting = parseFloat(obj.weighting) || 0;
      return sum + weighting;
    }, 0);
  };

  const calculateOverallTotal = () => {
    return template.templateStrategicPriorities.reduce((sum, priority) => sum + calculateTotalWeighting(priority), 0);
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

    // Vérification du minimum pour la priorité actuelle uniquement
    const required = getRequiredPercentage(currentPriority);
    if (totalWeighting <= required) {
      setErrorMessage(`La pondération pour "${currentPriority.name}" doit être supérieure à ${required}%. Actuel: ${totalWeighting.toFixed(1)}%`);
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

    // Vérification du total global
    const overallTotal = calculateOverallTotal();
    if (overallTotal > 100) {
      setErrorMessage(`Le total global des pondérations ne peut pas dépasser 100%. Actuel: ${overallTotal.toFixed(1)}%`);
      setOpenSnackbar(true);
      return false;
    }

    return true;
  };

  const steps = template.templateStrategicPriorities.map((priority) => priority.name);

  const validateHistoryUserObjectives = async () => {
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

      // Vérification des minima pour toutes les priorités
      for (let i = 0; i < template.templateStrategicPriorities.length; i++) {
        const priority = template.templateStrategicPriorities[i];
        const priorityTotal = calculateTotalWeighting(priority);
        const required = getRequiredPercentage(priority);
        if (priorityTotal <= required) {
          setErrorMessage(`La pondération pour "${priority.name}" doit être supérieure à ${required}%. Actuel: ${priorityTotal.toFixed(1)}%`);
          setOpenSnackbar(true);
          return;
        }
      }

      // Vérification du total global
      const overallTotal = calculateOverallTotal();
      if (overallTotal > 100) {
        setErrorMessage(`Le total global des pondérations ne peut pas dépasser 100%. Actuel: ${overallTotal.toFixed(1)}%`);
        setOpenSnackbar(true);
        return;
      }
      // if (overallTotal < 100) {
      //   setErrorMessage(`Attention : Le total global des pondérations est inférieur à 100%. Actuel: ${overallTotal.toFixed(1)}%`);
      //   setOpenSnackbar(true);
      //   // Ne pas bloquer la validation : continuer vers la validation
      // }

      let objectivesData = template.templateStrategicPriorities.flatMap((priority) =>
        (priority.objectives || []).map((objective) => ({
          objectiveId: objective.objectiveId || null,
          indicatorName: priority.name,
          description: objective.description || '',
          weighting: parseFloat(objective.weighting) || 0,
          resultIndicator: objective.resultIndicator || '',
          result: parseFloat(objective.result) || 0,
          objectiveColumnValues:
            objective.dynamicColumns?.map((col) => ({
              columnName: col.columnName,
              value: col.value
            })) || []
        }))
      );

      // Filter out completely empty objectives
      objectivesData = objectivesData.filter(obj => obj.description.trim() || obj.weighting > 0 || obj.objectiveId !== null);

      if (!objectivesData.some((obj) => obj.description && obj.weighting && obj.resultIndicator)) {
        setErrorMessage('Veuillez remplir au moins un objectif avec tous les champs requis.');
        setOpenSnackbar(true);
        return;
      }

      // Debug: Log payload (remove in production)
      console.log('Payload for validateUserObjectivesHistory:', objectivesData);

      const response = await formulaireInstance.post('/Evaluation/validateUserObjectivesHistory', objectivesData, {
        params: { validatorUserId: managerId, userId: subordinateId, type: typeUser }
      });

      // Add audit logging
      await AuditService.logAction(
        managerId,
        `Validation des objectifs pour l'évaluation avec evalId: ${evalId} du collaborateur ${subordinateId}`,
        'Create',
        null,
        null,
        { objectives: objectivesData }
      );

      alert(response.data.message || 'Objectifs validés avec succès !');
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la validation des objectifs :', error);
      // Handle specific validation error
      if (error.response?.status === 400 && error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat().join(', ');
        setErrorMessage(`Erreur de validation: ${errors}`);
      } else {
        setErrorMessage(error.response?.data?.message || 'Une erreur est survenue lors de la validation.');
      }
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
      <Paper sx={{ position: 'relative' }}>
        <MainCard sx={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'background.paper' }}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item xs={12} md={8}>
              <Typography variant="subtitle2">Évaluation ({evaluationYear})</Typography>
              <Typography variant="h3">
                Période actuelle{evaluationYear ? ` (${evaluationYear})` : ''}: <span style={{ color: '#3949AB' }}>{currentPeriod}</span>
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }} alignItems="center">
                <Grid item xs={12}>
                  <Box sx={{ p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                      Nom: {subordinate.name || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Matricule: {subordinate.matricule || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Poste: {subordinate.poste || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
            <Grid item sx={{ display: 'flex', gap: 1 }}>
              {currentPeriod === 'Fixation Objectif' && (
                <Tooltip title="Historique de validation" arrow>
                  <IconButton aria-label="historique" onClick={handleOpenHistoryModal}>
                    <HistoryIcon sx={{ fontSize: 20, color: 'black' }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Besoin d'aide ?" arrow>
                <IconButton aria-label="aide" onClick={handleOpenHelpModal}>
                  <HelpIcon sx={{ fontSize: 20, color: 'black' }} />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </MainCard>

        {currentPeriod === 'Fixation Objectif' && (
          <Box sx={{ p: 1, position: 'relative' }}>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ 
              fontSize: '0.75rem', 
              mb: 0.5,
              '& .MuiStepLabel-root': { fontSize: '0.75rem' },
              '& .MuiStep-root': { minHeight: 'auto' },
              height: 'auto'
            }}>
              {steps.map((label, index) => {
                const priority = template.templateStrategicPriorities[index];
                const total = calculateTotalWeighting(priority).toFixed(1);
                return (
                  <Step key={label}>
                    <StepLabel>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block' }}>{label}</Typography>
                        <Typography variant="caption" color="primary" sx={{ fontSize: '0.6rem', display: 'block' }}>{total}%</Typography>
                      </Box>
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>

            {/* Affichage du total global des pondérations */}
            <Typography 
              variant="body1" 
              sx={{ 
                textAlign: 'center', 
                mt: 1, 
                fontWeight: 'bold',
                color: calculateOverallTotal() > 100 ? 'error.main' : calculateOverallTotal() < 100 ? 'warning.main' : 'success.main'
              }}
            >
              Total global des pondérations : {calculateOverallTotal().toFixed(1)}%
            </Typography>

            {template.templateStrategicPriorities.length > 0 && activeStep < steps.length && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  style={{ marginTop: '0' }}
                >
                  <Card>
                    <CardContent sx={{ p: 1 }}>
                      <Typography
                        variant="h5"
                        gutterBottom
                        sx={{
                          marginBottom: '5px',
                          backgroundColor: '#fafafa',
                          padding: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Box>
                          {template.templateStrategicPriorities[activeStep].name} - Requis : {getRequiredPercentage(template.templateStrategicPriorities[activeStep])}%
                        </Box>
                        <IconTargetArrow style={{ color: '#3F51B5' }} />
                      </Typography>

                      <Grid container spacing={1}>
                        {Array.from({ length: template.templateStrategicPriorities[activeStep].maxObjectives }).map((_, objIndex) => {
                          const objective = template.templateStrategicPriorities[activeStep].objectives[objIndex] || {};

                          return (
                            <Grid item xs={12} key={objIndex}>
                              <Paper sx={{ p: 1, backgroundColor: '#e8eaf6' }}>
                                <Typography variant="h6" sx={{ mb: '5px' }} gutterBottom>
                                  Objectif {objIndex + 1}
                                </Typography>
                                <Grid container spacing={1}>
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
                                      type="text"
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
                                        <Box sx={{ mb: 0.5 }}>
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

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
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
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => {
                      if (validateStep()) {
                        validateHistoryUserObjectives();
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

            <Dialog open={openHelpModal} onClose={handleCloseHelpModal} aria-labelledby="help-dialog-title">
              <DialogTitle id="help-dialog-title">Aide</DialogTitle>
              <DialogContent dividers>
                {currentPeriod === 'Fixation Objectif' && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Pendant cette période
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      Vous devez valider les objectifs, les pondérations et les résultats attendus saisis par l'évalué. Vous pouvez également les modifier ou en ajouter de nouveaux si nécessaire.
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 3 }} gutterBottom>
                      Suivez les étapes ci-dessous :
                    </Typography>
                    <Box component="ol" sx={{ pl: 3, mt: 2 }}>
                      <Typography component="li" variant="body2" gutterBottom>
                        Consultez les objectifs, les pondérations et les résultats attendus proposés par l'évalué.
                      </Typography>
                      <Typography component="li" variant="body2" gutterBottom>
                        Si nécessaire, modifiez-les ou ajoutez-en de nouveaux.
                      </Typography>
                      <Typography component="li" variant="body2" gutterBottom>
                        Cliquez sur <strong>"Suivant"</strong> pour examiner chaque élément un par un.
                      </Typography>
                      <Typography component="li" variant="body2" gutterBottom>
                        Une fois toutes les étapes terminées, cliquez sur le bouton <strong>"Valider"</strong> pour finaliser le processus.
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 2 }} color="textSecondary">
                      Note : Une fois validés, vous ne pourrez plus apporter de modifications avant la période d'évaluation de mi-parcours.
                    </Typography>
                  </>
                )}

                {currentPeriod === 'Mi-Parcours' && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Pendant cette période
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 3 }} gutterBottom>
                      Suivez les étapes :
                    </Typography>
                    <Box component="ol" sx={{ pl: 3, mt: 2 }}>
                      <Typography component="li" variant="body2" gutterBottom>
                        Remplissez les résultats pour chaque résultat attendu.
                      </Typography>
                      <Typography component="li" variant="body2" gutterBottom>
                      Si nécessaire, modifiez les objectifs, les pondérations et les résultats attendus saisis lors de la période de fixation des objectifs.          
                      </Typography>
                      <Typography component="li" variant="body2" gutterBottom>
                        Passez en revue chaque élément en cliquant sur <strong>"Suivant"</strong>.
                      </Typography>
                      <Typography component="li" variant="body2" gutterBottom>
                        Une fois terminé, cliquez sur le bouton <strong>"Valider"</strong> pour finaliser.
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mt: 3 }} gutterBottom>
                      Note: Vous pouvez toujours modifier les champs remplis
                      <span style={{ color: 'red' }}> tant que l'évalué ne l’a pas encore validé à son tour.</span>
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      <strong>Important :</strong> Une fois que l'évalué a validé, le bouton de validation sera désactivé. Seuls les résultats
                      pourront être modifiés lors de la période d’évaluation finale.
                    </Typography>
                  </>
                )}

                {currentPeriod === 'Évaluation Finale' && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Pendant cette période
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      Revoyez les résultats pour chaque résultat attendu que vous avez renseigné.
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 3 }} gutterBottom>
                      Note: Vous pouvez toujours modifier uniquement les résultats
                      <span style={{ color: 'red' }}> tant que l'évalué ne l’a pas encore validé à son tour.</span>
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      <strong>Important :</strong> Une fois que l'évalué a validé, le bouton de validation sera désactivé.
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
            <Dialog open={openHistoryModal} onClose={handleCloseHistoryModal} aria-labelledby="history-dialog-title" maxWidth="sm" fullWidth>
              <DialogTitle id="history-dialog-title">Historique de validation</DialogTitle>
              <DialogContent dividers sx={{ p: 0 }}>
                {enrichedValidationHistory.length > 0 ? (
                  <List sx={{ width: '100%', bgcolor: 'background.paper', maxHeight: 400, overflow: 'auto' }}>
                    {enrichedValidationHistory.map((entry, index) => (
                      <React.Fragment key={index}>
                        <ListItem alignItems="flex-start" sx={{ p: 2 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
                              {entry.user?.name?.charAt(0) || 'U'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Typography
                                  sx={{ display: 'inline', fontWeight: 'bold', mr: 1 }}
                                >
                                  {entry.user?.name || 'Utilisateur inconnu'}
                                </Typography>
                                <Chip label={entry.status} size="small" color="success" />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                  sx={{ display: 'block', mb: 0.5 }}
                                >
                                  Matricule: {entry.user?.matricule || 'N/A'}
                                </Typography>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.primary"
                                  sx={{ display: 'block', mb: 0.5 }}
                                >
                                  Poste: {entry.user?.poste || 'N/A'}
                                </Typography>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {entry.formattedDate}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < enrichedValidationHistory.length - 1 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      Aucun historique de validation pour le moment.
                    </Typography>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseHistoryModal} color="primary">
                  Fermer
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>

        {currentPeriod === 'Mi-Parcours' && <ManagerMp subordinateId={subordinateId} typeUser={typeUser} />}
        {currentPeriod === 'Évaluation Finale' && <ManagerFi subordinateId={subordinateId} typeUser={typeUser} />}
      </Paper>
    </>
  );
}

export default ManagerFo;