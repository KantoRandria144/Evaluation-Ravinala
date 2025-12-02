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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider // Ajout de Divider qui était utilisé mais non importé
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { IconTargetArrow } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import CollabMp from './CollabMp';
import CollabFi from './CollabFi';
import HelpIcon from '@mui/icons-material/Help';
import HistoryIcon from '@mui/icons-material/History';

function CollabFo() {
  const user = JSON.parse(localStorage.getItem('user'));
  const userType = user.typeUser;
  const userId = user.id;

  const [evalId, setEvalId] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [evaluationYear, setEvaluationYear] = useState('2025');
  const [hasOngoingEvaluation, setHasOngoingEvaluation] = useState(false);
  const [template, setTemplate] = useState({ templateStrategicPriorities: [] });
  const [activeStep, setActiveStep] = useState(0);
  const [userObjectives, setUserObjectives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidated, setIsValidated] = useState(false);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [validationHistory, setValidationHistory] = useState([]);
  const [enrichedValidationHistory, setEnrichedValidationHistory] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const navigate = useNavigate();

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

  const calculateTotalWeighting = (priority) => {
    return (priority.objectives || []).reduce((sum, obj) => {
      const weighting = parseFloat(obj.weighting) || 0;
      return sum + weighting;
    }, 0);
  };

  const calculateOverallTotal = () => {
    return template.templateStrategicPriorities.reduce((sum, priority) => sum + calculateTotalWeighting(priority), 0);
  };

  // Fetch fonctions...
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
        const evaluationId = response.data[0].evalId;
        setEvalId(evaluationId);
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
      console.log('Template:', response.data.template);
      setTemplate(response.data.template || { templateStrategicPriorities: [] });

      const periodResponse = await formulaireInstance.get('/Periode/periodeActel', { params: { type: 'Cadre' } });
      if (periodResponse.data?.length > 0) {
        setCurrentPeriod(periodResponse.data[0].currentPeriod);
        setEvaluationYear(periodResponse.data[0].year || '2025');
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
        params: {
          evalId,
          userId
        }
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des objectifs de l'utilisateur :", error);
      return null;
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
          } else {
            console.log('Aucun objectif utilisateur trouvé.');
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
        params: {
          userId,
          type: userType
        }
      });

      if (response.data && response.data.historyCFos && response.data.historyCFos.length > 0) {
        const uniqueValidatorMap = new Map();
        const history = response.data.historyCFos.filter(entry => entry.validatedBy !== null);
        history.forEach((entry) => {
          if (!uniqueValidatorMap.has(entry.validatedBy)) {
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
              status: 'Validé'
            };
          })
        );
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
      setIsValidated(false);
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
    
    const overallTotal = calculateOverallTotal();
    if (overallTotal > 100) {
      setErrorMessage(`Le total global des pondérations ne peut pas dépasser 100%. Actuel: ${overallTotal.toFixed(1)}%`);
      setOpenSnackbar(true);
      return false;
    }
    return true;
  };

  const steps = template.templateStrategicPriorities.map((priority) => priority.name);

  const validateUserObjectives = async () => {
    try {
      for (const priority of template.templateStrategicPriorities) {
        const totalWeighting = calculateTotalWeighting(priority);
        if (totalWeighting > 100) {
          setErrorMessage(`La somme des pondérations pour "${priority.name}" ne peut pas dépasser 100%. Actuel: ${totalWeighting}%`);
          setOpenSnackbar(true);
          return;
        }
      }
      
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
      
      const overallTotal = calculateOverallTotal();
      if (overallTotal > 100) {
        setErrorMessage(`Le total global des pondérations ne peut pas dépasser 100%. Actuel: ${overallTotal.toFixed(1)}%`);
        setOpenSnackbar(true);
        return;
      }

      const objectivesData = template.templateStrategicPriorities.flatMap((priority) =>
        priority.objectives.map((objective) => ({
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

      try {
        const response = await formulaireInstance.post('/Evaluation/validateUserObjectives', objectivesData, {
          params: {
            userId: userId,
            type: userType
          }
        });

        alert(response.data.message || 'Objectifs validés avec succès !');
        window.location.reload();
      } catch (error) {
        if (error.response?.data?.message) {
          setErrorMessage(error.response.data.message);
          setOpenSnackbar(true);
        } else {
          setErrorMessage('Une erreur est survenue lors de la validation.');
          setOpenSnackbar(true);
        }
        console.error('Erreur lors de la validation des objectifs :', error);
      }
    } catch (error) {
      console.error('Erreur lors de la validation des objectifs :', error);
      setErrorMessage('Une erreur imprévue est survenue.');
      setOpenSnackbar(true);
    }
  };

  const updateUserObjectives = async () => {
    try {
      for (const priority of template.templateStrategicPriorities) {
        const totalWeighting = calculateTotalWeighting(priority);
        if (totalWeighting > 100) {
          setErrorMessage(`La somme des pondérations pour "${priority.name}" ne peut pas dépasser 100%. Actuel: ${totalWeighting}%`);
          setOpenSnackbar(true);
          return;
        }
      }
      
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
      
      const overallTotal = calculateOverallTotal();
      if (overallTotal > 100) {
        setErrorMessage(`Le total global des pondérations ne peut pas dépasser 100%. Actuel: ${overallTotal.toFixed(1)}%`);
        setOpenSnackbar(true);
        return;
      }

      const objectivesData = template.templateStrategicPriorities.flatMap((priority) =>
        priority.objectives.map((objective) => ({
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

      const response = await formulaireInstance.put('/Evaluation/userObjectif', objectivesData, {
        params: {
          evalId,
          userId
        }
      });

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
      <Paper sx={{ position: 'relative' }}>
        <MainCard sx={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'background.paper' }}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item xs={12} md={8}>
              {/* MODIFICATION ICI: Changement du titre */}
              <Typography variant="h3">
                Fixation Objectif - {evaluationYear}
              </Typography>
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

        {currentPeriod === 'Mi-Parcours' && <CollabMp />}

        {currentPeriod === 'Évaluation Finale' && <CollabFi />}
      </Paper>
    </>
  );
}

export default CollabFo;