import React, { useEffect, useState } from 'react';
import { formulaireInstance, authInstance } from '../../../../axiosConfig';
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
import { useNavigate } from 'react-router-dom';
import HelpIcon from '@mui/icons-material/Help';
import HistoryIcon from '@mui/icons-material/History';

function ManagerFi({ subordinateId, typeUser, showHeader = false }) {
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
  const [noObjectivesFound, setNoObjectivesFound] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isManagerValidation, setIsManagerValidation] = useState(false);
  const [validationHistory, setValidationHistory] = useState([]);
  const [enrichedValidationHistory, setEnrichedValidationHistory] = useState([]);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [openValidationModal, setOpenValidationModal] = useState(false);
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

  const handleOpenValidationModal = () => {
    if (isValidated || isManagerValidation) {
      setErrorMessage('Les objectifs ont déjà été validés.');
      setOpenSnackbar(true);
      return;
    }
    
    if (!validateStep()) {
      return;
    }
    
    if (calculateOverallTotal() !== 100) {
      setErrorMessage('La pondération totale doit être exactement de 100% avant validation.');
      setOpenSnackbar(true);
      return;
    }
    
    setOpenValidationModal(true);
  };

  const handleCloseValidationModal = () => {
    setOpenValidationModal(false);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage('');
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
      const evaluationId = response.data[0].evalId;
      setEvalId(evaluationId);
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
                    collaboratorResult: obj.collaboratorResult ?? obj.result ?? 0,
                    managerResult: obj.managerResult ?? '',
                    managerComment: obj.managerComment ?? '',
                    result: obj.result ?? obj.collaboratorResult ?? 0,
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
            setNoObjectivesFound(false);
          } else {
            setNoObjectivesFound(true);
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
    if (isValidated || isManagerValidation) {
      return;
    }
    
    setTemplate((prevTemplate) => {
      const updatedPriorities = prevTemplate.templateStrategicPriorities.map((priority) => {
        if (priority.name !== priorityName) return priority;

        const updatedObjectives = [...priority.objectives];

        if (!updatedObjectives[objectiveIndex]) {
          updatedObjectives[objectiveIndex] = {
            description: '',
            weighting: '',
            resultIndicator: '',
            result: '',
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
          if (field === 'result') {
            let parsedValue = value.replace(',', '.');
            if (!/^\d{0,3}(\.\d{0,2})?$/.test(parsedValue)) return priority;
            const numericValue = parseFloat(parsedValue);
            if (numericValue > 100) {
              setErrorMessage('La valeur ne peut pas dépasser 100%.');
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
      const response = await formulaireInstance.get('/Evaluation/getHistoryFinale', {
        params: {
          userId: subordinateId,
          type: typeUser
        }
      });

      if (response.data && response.data.length > 0) {
        const hasValidatedEntry = response.data.some((entry) => entry.validatedBy);
        setIsValidated(hasValidatedEntry);
        
        // Enrichir l'historique
        const uniqueValidatorMap = new Map();
        const history = response.data.filter(entry => entry.validatedBy !== null);
        
        history.forEach((entry) => {
          if (!uniqueValidatorMap.has(entry.validatedBy)) {
            uniqueValidatorMap.set(entry.validatedBy, entry);
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
      } else {
        setValidationHistory([]);
        setEnrichedValidationHistory([]);
        setIsValidated(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la validation :', error);
      setValidationHistory([]);
      setEnrichedValidationHistory([]);
      setIsValidated(false);
      if (error.response?.status >= 500) {
        setErrorMessage('Erreur serveur lors de la vérification des données validées.');
        setOpenSnackbar(true);
      }
    }
  };

  const checkManagerValidationStatus = async () => {
    try {
      const response = await formulaireInstance.get('/Evaluation/getHistoryFinaleByUser', {
        params: {
          userId: subordinateId,
          type: typeUser
        }
      });

      if (response.data && response.data.length > 0) {
        const managerValidation = response.data.find((entry) => 
          entry.validatedBy && entry.validatedBy !== subordinateId
        );
        setIsManagerValidation(!!managerValidation);
      } else {
        setIsManagerValidation(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la validation manager :', error);
      setIsManagerValidation(false);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchCadreTemplateId(),
          checkOngoingEvaluation(),
          checkIfValidated(),
          checkManagerValidationStatus(),
          fetchSubordinate()
        ]);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des données:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const calculateTotalWeighting = (priority) => {
    return (priority.objectives || []).reduce((sum, obj) => {
      const weighting = parseFloat(obj.weighting) || 0;
      return sum + weighting;
    }, 0);
  };

  const calculateAverageResult = (priority) => {
    const objectives = priority.objectives || [];
    if (objectives.length === 0) return 0;
    
    const totalResult = objectives.reduce((sum, obj) => {
      const result = parseFloat(obj.managerResult ?? 0) || 0;
      const weighting = parseFloat(obj.weighting) || 0;
      return sum + (result * weighting / 100);
    }, 0);
    
    const totalWeighting = calculateTotalWeighting(priority);
    return totalWeighting > 0 ? (totalResult / totalWeighting * 100) : 0;
  };

  const calculateOverallTotal = () => {
    return template.templateStrategicPriorities.reduce((sum, priority) => sum + calculateTotalWeighting(priority), 0);
  };

  const calculateOverallAverage = () => {
    const priorities = template.templateStrategicPriorities;
    if (priorities.length === 0) return 0;
    
    let totalWeightedResult = 0;
    let totalWeighting = 0;
    
    priorities.forEach(priority => {
      const priorityObjectives = priority.objectives || [];
      priorityObjectives.forEach(obj => {
        const result = parseFloat(obj.result) || 0;
        const weighting = parseFloat(obj.weighting) || 0;
        totalWeightedResult += (result * weighting / 100);
        totalWeighting += weighting;
      });
    });
    
    return totalWeighting > 0 ? (totalWeightedResult / totalWeighting * 100) : 0;
  };

  const validateStep = () => {
    if (isValidated || isManagerValidation) {
      return true;
    }
    
    const currentPriority = getFilteredPriorities()[activeStep];
    if (!currentPriority) return false;

    let isAnyObjectiveFilled = false;

    for (const [index, objective] of (currentPriority.objectives || []).entries()) {
      const isObjectivePartiallyFilled = objective.description || objective.weighting || objective.resultIndicator || objective.result;
      const hasDynamicColumns = Array.isArray(objective.dynamicColumns);
      const isAnyDynamicColumnFilled = hasDynamicColumns ? objective.dynamicColumns.some((column) => column.value) : false;

      if (isAnyDynamicColumnFilled && (!objective.description || !objective.weighting || !objective.resultIndicator || !objective.managerResult )) {
        setErrorMessage(
          `Tous les champs obligatoires doivent être remplis pour l'objectif ${index + 1} dans "${currentPriority.name}".`
        );
        setOpenSnackbar(true);
        return false;
      }

      if (isObjectivePartiallyFilled) {
        isAnyObjectiveFilled = true;

        if (!objective.description || !objective.weighting || !objective.resultIndicator || !objective.managerResult ) {
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

  const getFilteredPriorities = () => {
    return template.templateStrategicPriorities.filter(priority => 
      priority.objectives && priority.objectives.some(obj => 
        obj.description && obj.description.trim() !== ''
      )
    );
  };

  const getActivePriority = () => {
    const filteredPriorities = getFilteredPriorities();
    return filteredPriorities[activeStep];
  };

  const steps = getFilteredPriorities().map((priority) => priority.name);

  const validateFinalObjectifHistory = async () => {
    if (isManagerValidation) {
      setErrorMessage('Vous avez déjà effectué la validation finale.');
      setOpenSnackbar(true);
      return;
    }

    try {
      // D'abord, effectuer la validation finale (première validation)
      const filteredPriorities = getFilteredPriorities();
      const objectivesData = filteredPriorities.flatMap((priority) =>
        priority.objectives
          .filter(obj => obj.description && obj.description.trim() !== '')
          .map((objective) => ({
            objectiveId: objective.objectiveId,
            indicatorName: priority.name,
            description: objective.description || '',
            weighting: parseFloat(objective.weighting) || 0,
            resultIndicator: objective.resultIndicator || '',
            result: parseFloat(objective.managerResult) || 0,
            managerComment: objective.managerComment || '',
            objectiveColumnValues:
              objective.dynamicColumns?.map((col) => ({
                columnName: col.columnName,
                value: col.value
              })) || []
          }))
      );

      // Validation finale (première validation)
      const firstValidationResponse = await formulaireInstance.post('/Evaluation/validateFinale', objectivesData, {
        params: {
          validatorUserId: managerId,
          userId: subordinateId,
          type: typeUser
        }
      });

      console.log('Première validation réussie:', firstValidationResponse.data);

      // Ensuite, effectuer la validation finale (seconde validation)
      const historyObjectivesData = filteredPriorities.flatMap((priority) =>
        priority.objectives
          .filter(obj => obj.description && obj.description.trim() !== '')
          .map((objective) => ({
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

      // Validation finale (seconde validation)
      const finalValidationResponse = await formulaireInstance.post('/Evaluation/validateFinaleHistory', historyObjectivesData, {
        params: {
          userId: subordinateId,
          type: typeUser,
          validatedBy: managerId
        }
      });

      console.log('Validation finale réussie:', finalValidationResponse.data);

      alert('Validation finale effectuée avec succès ! Les objectifs ont été validés définitivement.');
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la validation finale:', error);
      
      if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage('Une erreur est survenue lors de la validation finale. Veuillez réessayer.');
      }
      setOpenSnackbar(true);
    }
  };

  const handleConfirmValidation = () => {
    handleCloseValidationModal();
    validateFinalObjectifHistory();
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  if (isLoading) {
    return (
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh',
          gap: 2
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h6" align="center" gutterBottom>
            Chargement des données...
          </Typography>
          <LinearProgress />
          <Typography variant="body2" align="center" sx={{ mt: 2, color: 'text.secondary' }}>
            Récupération des informations de l'évaluation et du collaborateur
          </Typography>
        </Box>
      </Container>
    );
  }

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
        {showHeader && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item xs={12} md={8}>
                <Typography variant="h3">
                  <span>{currentPeriod} - {evaluationYear}</span>
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
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        <strong>Statut :</strong> 
                        <Box component="span" sx={{ 
                          ml: 1,
                          color: isManagerValidation ? 'success.main' : 
                                 isValidated ? 'info.main' : 'warning.main',
                          fontWeight: 'bold'
                        }}>
                          {isManagerValidation ? 'Validation finale ✓' : 
                           isValidated ? 'Première validation ✓' : 'À valider'}
                        </Box>
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Historique de validation" arrow>
                  <IconButton aria-label="historique" onClick={handleOpenHistoryModal}>
                    <HistoryIcon sx={{ fontSize: 20, color: 'black' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Besoin d'aide ?" arrow>
                  <IconButton aria-label="aide" onClick={handleOpenHelpModal}>
                    <HelpIcon sx={{ fontSize: 20, color: 'black' }} />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Box>
        )}

        <Box sx={{ p: 1 }}>
          {noObjectivesFound ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Le collaborateur n'a pas encore validé ses objectifs
            </Alert>
          ) : (
            <>
              {isValidated ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  L'évaluation finale a déjà été validée. Aucune modification n'est possible.
                </Alert>
              ) : null}

              <Stepper activeStep={activeStep} alternativeLabel sx={{ 
                fontSize: '0.75rem', 
                mb: 2,
                '& .MuiStepLabel-root': { fontSize: '0.75rem' },
                '& .MuiStep-root': { minHeight: 'auto' },
                height: 'auto'
              }}>
                {steps.map((label, index) => {
                  const priority = getFilteredPriorities()[index];
                  const totalWeight = calculateTotalWeighting(priority).toFixed(1);
                  const averageResult = calculateAverageResult(priority).toFixed(1);
                  return (
                    <Step key={label}>
                      <StepLabel>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block' }}>{label}</Typography>
                          <Typography variant="caption" color="primary" sx={{ fontSize: '0.6rem', display: 'block' }}>
                            Pond: {totalWeight}%
                          </Typography>
                          <Typography variant="caption" color="secondary" sx={{ fontSize: '0.6rem', display: 'block' }}>
                            Résultat: {averageResult}%
                          </Typography>
                        </Box>
                      </StepLabel>
                    </Step>
                  );
                })}
              </Stepper>

              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: 2, 
                mb: 3,
                flexWrap: 'wrap'
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 1.5,
                  minWidth: '140px'
                }}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5
                  }}>
                    <Box sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: calculateOverallTotal() === 100 ? '#4caf50' : 
                                      calculateOverallTotal() > 100 ? '#f44336' : '#ff9800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {calculateOverallTotal() === 100 ? '✓' : 
                      calculateOverallTotal() > 100 ? '✗' : '!'}
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                      Pondération
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: calculateOverallTotal() === 100 ? '#4caf50' : 
                            calculateOverallTotal() > 100 ? '#f44336' : '#ff9800'
                    }}
                  >
                    {calculateOverallTotal().toFixed(1)}%
                  </Typography>
                </Box>

                <Divider orientation="vertical" flexItem sx={{ height: 'auto' }} />

                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 1.5,
                  minWidth: '140px'
                }}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5
                  }}>
                    <Box sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: calculateOverallAverage() >= 80 ? '#4caf50' : 
                                      calculateOverallAverage() >= 60 ? '#ff9800' : '#f44336',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {calculateOverallAverage() >= 80 ? '✓' : 
                      calculateOverallAverage() >= 60 ? '⚠' : '✗'}
                    </Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                      Moyenne
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: calculateOverallAverage() >= 80 ? '#4caf50' : 
                            calculateOverallAverage() >= 60 ? '#ff9800' : '#f44336'
                    }}
                  >
                    {calculateOverallAverage().toFixed(1)}%
                  </Typography>
                </Box>
              </Box>

              {getFilteredPriorities().length > 0 && activeStep < steps.length && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card sx={{ mb: 2 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography
                          variant="h5"
                          gutterBottom
                          sx={{
                            marginBottom: 2,
                            backgroundColor: '#fafafa',
                            padding: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderRadius: 1
                          }}
                        >
                          <Box>
                            {getActivePriority()?.name}
                            <Typography variant="body2" color="text.secondary">
                              Pondération totale: {calculateTotalWeighting(getActivePriority()).toFixed(1)}%
                              | Résultat moyen: {calculateAverageResult(getActivePriority()).toFixed(1)}%
                            </Typography>
                          </Box>
                          <IconTargetArrow style={{ color: '#3F51B5' }} />
                        </Typography>

                        <Grid container spacing={2}>
                          {(getActivePriority()?.objectives || [])
                            .filter(obj => obj.description && obj.description.trim() !== '')
                            .map((objective, objIndex) => (
                              <Grid item xs={12} key={objIndex}>
                                <Paper sx={{ p: 2, backgroundColor: '#e8eaf6', borderRadius: 2 }}>
                                  <Typography variant="h6" sx={{ mb: 2 }} gutterBottom>
                                    Objectif {objIndex + 1}
                                    <Typography variant="body2" component="span" sx={{ ml: 1, color: 'red', fontStyle: 'italic' }}>
                                      (Seuls les résultats sont modifiables)
                                    </Typography>
                                  </Typography>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                      <TextField
                                        label="Description de l'Objectif"
                                        fullWidth
                                        variant="outlined"
                                        multiline
                                        minRows={3}
                                        value={objective.description || ''}
                                        disabled
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <TextField
                                        label="Pondération"
                                        fullWidth
                                        variant="outlined"
                                        type="text"
                                        value={objective.weighting || ''}
                                        InputProps={{
                                          endAdornment: <InputAdornment position="end">%</InputAdornment>
                                        }}
                                        disabled
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label="Résultat"
                                        fullWidth
                                        variant="outlined"
                                        type="text"
                                        value={objective.collaboratorResult ?? ''}
                                        onChange={(e) =>
                                          handleObjectiveChange(
                                            getActivePriority().name,
                                            objIndex,
                                            'result',
                                            e.target.value
                                          )
                                        }
                                        error={parseFloat(objective.result) > 100}
                                        helperText={parseFloat(objective.result) > 100 ? 'Maximum 100%' : ''}
                                        InputProps={{
                                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                          sx: {
                                            backgroundColor: (isValidated || isManagerValidation) ? '#f5f5f5' : 'inherit'
                                          }
                                        }}
                                        disabled={isValidated || isManagerValidation}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            label="Résultat final manager"
                                            fullWidth
                                            variant="outlined"
                                            value={objective.managerResult ?? ''}
                                            onChange={(e) =>
                                              handleObjectiveChange(
                                                getActivePriority().name,
                                                objIndex,
                                                'managerResult',
                                                e.target.value
                                              )
                                            }
                                            error={parseFloat(objective.managerResult) > 100}
                                            helperText={parseFloat(objective.managerResult) > 100 ? 'Maximum 100%' : ''}
                                            InputProps={{
                                              endAdornment: <InputAdornment position="end">%</InputAdornment>
                                            }}
                                            disabled={isValidated}
                                          />
                                    </Grid>

                                    <Grid item xs={12}>
                                      <TextField
                                        label="Indicateur de résultat"
                                        fullWidth
                                        variant="outlined"
                                        multiline
                                        minRows={3}
                                        value={objective.resultIndicator || ''}
                                        disabled
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <TextField
                                        label="Commentaire du manager"
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        value={objective.managerComment || ''}
                                        onChange={(e) =>
                                          handleObjectiveChange(
                                            getActivePriority().name,
                                            objIndex,
                                            'managerComment',
                                            e.target.value
                                          )
                                        }
                                        placeholder="Commentaire d’évaluation du manager"
                                        disabled={isValidated || isManagerValidation}
                                      />
                                    </Grid>


                                    {Array.isArray(objective.dynamicColumns) &&
                                      objective.dynamicColumns.map((column, colIndex) => (
                                        <Grid item xs={12} key={colIndex}>
                                          <Box sx={{ mb: 1 }}>
                                            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                                              {column.columnName || `Colonne ${colIndex + 1}`}
                                            </Typography>
                                            <TextField
                                              fullWidth
                                              variant="outlined"
                                              multiline
                                              minRows={2}
                                              value={column.value || ''}
                                              disabled={isValidated || isManagerValidation}
                                            />
                                          </Box>
                                        </Grid>
                                      ))}
                                  </Grid>
                                </Paper>
                              </Grid>
                            ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  variant="contained"
                  color="primary"
                  startIcon={<KeyboardArrowLeft />}
                  sx={{ minWidth: 120 }}
                >
                  Précédent
                </Button>

                {activeStep === steps.length - 1 ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="success"
                      disabled={isManagerValidation || isValidated}
                      onClick={handleOpenValidationModal}
                      sx={{ minWidth: 140 }}
                    >
                      Valider définitivement
                    </Button>
                  </Box>
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
                    sx={{ minWidth: 120 }}
                  >
                    Suivant
                  </Button>
                )}
              </Box>

              <Dialog open={openValidationModal} onClose={handleCloseValidationModal} aria-labelledby="validation-dialog-title">
                <DialogTitle id="validation-dialog-title">
                  Confirmer la validation définitive
                </DialogTitle>
                <DialogContent dividers>
                  <Typography variant="body1" gutterBottom>
                    Êtes-vous sûr de vouloir effectuer la validation définitive des objectifs ?
                  </Typography>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Attention :</strong> Cette validation est définitive et effectuera les deux étapes suivantes :
                    </Typography>
                    <Box component="ol" sx={{ pl: 2, mt: 1 }}>
                      <Typography component="li" variant="body2">
                        Validation des objectifs et résultats (première validation)
                      </Typography>
                      <Typography component="li" variant="body2">
                        Validation finale définitive
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Le collaborateur ne pourra plus modifier ses objectifs après cette validation.
                    </Typography>
                  </Alert>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Cette action est irréversible pour la période d'évaluation en cours.
                  </Typography>
                  <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#f3e5f5', borderRadius: 1, border: '1px solid #ba68c8' }}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Collaborateur :</strong> {subordinate.name || 'N/A'} ({subordinate.matricule || 'N/A'})
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                      <strong>Période :</strong> {currentPeriod} - {evaluationYear}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                      <strong>Total pondération :</strong> {calculateOverallTotal().toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                      <strong>Moyenne globale :</strong> {calculateOverallAverage().toFixed(1)}%
                    </Typography>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseValidationModal} color="primary">
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleConfirmValidation} 
                    variant="contained"
                    color="success"
                    autoFocus
                  >
                    Confirmer la validation définitive
                  </Button>
                </DialogActions>
              </Dialog>

              <Dialog open={openHelpModal} onClose={handleCloseHelpModal} aria-labelledby="help-dialog-title" maxWidth="md">
                <DialogTitle id="help-dialog-title">Aide - Évaluation Finale</DialogTitle>
                <DialogContent dividers>
                  <Typography variant="h6" gutterBottom>
                    Processus de validation finale
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    Vous devez examiner les objectifs fixés et les résultats saisis par le collaborateur :
                  </Typography>
                  <Box component="ol" sx={{ pl: 3, mt: 2 }}>
                    <Typography component="li" variant="body2" gutterBottom>
                      <strong>Validation unique :</strong> Une seule validation effectue les deux étapes (première validation + validation finale)
                    </Typography>
                    <Typography component="li" variant="body2" gutterBottom>
                      Vous pouvez modifier uniquement les <strong>résultats</strong> des objectifs
                    </Typography>
                    <Typography component="li" variant="body2" gutterBottom>
                      Les descriptions, pondérations et indicateurs sont verrouillés en lecture seule
                    </Typography>
                    <Typography component="li" variant="body2" gutterBottom>
                      Cliquez sur <strong>"Suivant"</strong> pour examiner chaque priorité stratégique
                    </Typography>
                    <Typography component="li" variant="body2" gutterBottom>
                      La pondération totale doit être exactement de <strong>100%</strong> avant validation
                    </Typography>
                  </Box>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Note :</strong> Seuls les champs de résultat sont modifiables. Les autres champs sont verrouillés car ils ont été validés précédemment.
                    </Typography>
                  </Alert>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Important :</strong> La validation est définitive. Après cette validation, le collaborateur ne pourra plus modifier ses objectifs.
                    </Typography>
                  </Alert>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseHelpModal} color="primary">
                    Fermer
                  </Button>
                </DialogActions>
              </Dialog>

              <Dialog open={openHistoryModal} onClose={handleCloseHistoryModal} aria-labelledby="history-dialog-title" maxWidth="sm" fullWidth>
                <DialogTitle id="history-dialog-title">Historique de validation finale</DialogTitle>
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
                        Aucun historique de validation finale pour le moment.
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
            </>
          )}
        </Box>

        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>
      </Paper>
    </>
  );
}

export default ManagerFi;