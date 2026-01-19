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
  Chip,
  Divider
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
  const userType = user?.typeUser || '';
  const userId = user?.id || '';

  const [evalId, setEvalId] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [evaluationYear, setEvaluationYear] = useState('2025');
  const [hasOngoingEvaluation, setHasOngoingEvaluation] = useState(false);
  const [template, setTemplate] = useState({ 
    templateStrategicPriorities: [] 
  });
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
    if (!priority) return 0;
    return parseFloat(priority.ponderation) || 0;
  };

  const calculateTotalWeighting = (priority) => {
    if (!priority || !priority.objectives || !Array.isArray(priority.objectives)) {
      return 0;
    }
    return priority.objectives.reduce((sum, obj) => {
      const weighting = parseFloat(obj.weighting) || 0;
      return sum + weighting;
    }, 0);
  };

  const calculateOverallTotal = () => {
    if (!template || !template.templateStrategicPriorities || !Array.isArray(template.templateStrategicPriorities)) {
      return 0;
    }
    return template.templateStrategicPriorities.reduce((sum, priority) => sum + calculateTotalWeighting(priority), 0);
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
      setTemplate(response.data.template || { templateStrategicPriorities: [] });
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
              const currentPriorities = prevTemplate?.templateStrategicPriorities || [];
              
              const updatedPriorities = currentPriorities.map((priority) => {
                if (!priority) return priority;
                
                const priorityObjectives = objectives.filter((obj) => 
                  obj.templateStrategicPriority?.name === priority.name
                );

                return {
                  ...priority,
                  objectives: priorityObjectives.map((obj) => ({
                    objectiveId: obj.objectiveId,
                    description: obj.description || '',
                    weighting: obj.weighting || '',
                    resultIndicator: obj.resultIndicator || '',
                    collaboratorComment: obj.collaboratorComment || '',
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
      const currentPriorities = prevTemplate?.templateStrategicPriorities || [];
      
      const updatedPriorities = currentPriorities.map((priority) => {
        if (!priority || priority.name !== priorityName) return priority;

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
    // UTILISEZ SEULEMENT L'ENDPOINT QUI EXISTE
    const response = await formulaireInstance.get('/Evaluation/getUserObjectivesHistory', {
      params: {
        userId: userId,        // Notez: "userId" pas "UserId"
        type: userType         // Notez: "type" pas "userType"
      }
    });

    if (response.data) {
      // Vérifiez la structure de la réponse
      let historyData = [];
      
      if (Array.isArray(response.data)) {
        historyData = response.data;
      } else if (response.data.historyCFos) {
        historyData = response.data.historyCFos;
      } else if (response.data.data) {
        historyData = response.data.data;
      } else if (response.data.HistoryCFos) {
        historyData = response.data.HistoryCFos;
      }
      
      if (historyData && historyData.length > 0) {
        const uniqueValidatorMap = new Map();
        const history = historyData.filter(entry => entry.validatedBy !== null);
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
        
        if (uniqueHistory.length > 0) {
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
          setIsValidated(true);
        } else {
          setEnrichedValidationHistory([]);
          setIsValidated(false);
        }
      } else {
        setValidationHistory([]);
        setEnrichedValidationHistory([]);
        setIsValidated(false);
      }
    } else {
      setValidationHistory([]);
      setEnrichedValidationHistory([]);
      setIsValidated(false);
    }
  } catch (error) {
    console.log('Aucune donnée validée trouvée (normal si pas encore validé):', error.message);
    setValidationHistory([]);
    setEnrichedValidationHistory([]);
    setIsValidated(false);
    
    // Ne pas afficher d'erreur pour les 404 ou 400
    if (error.response?.status >= 500) {
      setErrorMessage('Erreur serveur lors de la vérification des données validées.');
      setOpenSnackbar(true);
    }
  }
};

useEffect(() => {
  const initData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchCadreTemplateId(),
        checkOngoingEvaluation()
      ]);
      
      // Gérer checkIfValidated avec try-catch séparé
      try {
        await checkIfValidated();
      } catch (error) {
        console.log('checkIfValidated a échoué (normal si pas encore validé):', error.message);
        // Ne pas bloquer le chargement pour cette erreur
      }
      
      const periodResponse = await formulaireInstance.get(
        '/Periode/periodeActel',
        { params: { type: 'Cadre' } }
      );

      if (periodResponse.data?.length > 0) {
        setCurrentPeriod(periodResponse.data[0].currentPeriod);
        setEvaluationYear(periodResponse.data[0].evalAnnee?.toString() ?? '');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des données:', error);
      // Afficher seulement les erreurs critiques
      if (error.response?.status >= 500) {
        setErrorMessage('Erreur lors du chargement des données.');
        setOpenSnackbar(true);
      }
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

  const validateStep = () => {
    if (!template || !template.templateStrategicPriorities || !Array.isArray(template.templateStrategicPriorities)) {
      return false;
    }
    
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

    const currentObjectives = currentPriority.objectives || [];
    for (let index = 0; index < currentObjectives.length; index++) {
      const objective = currentObjectives[index];
      if (!objective) continue;

      const isObjectivePartiallyFilled = objective.description || objective.weighting || objective.resultIndicator;

      const hasDynamicColumns = Array.isArray(objective.dynamicColumns);
      const isAnyDynamicColumnFilled = hasDynamicColumns ? objective.dynamicColumns.some((column) => column?.value) : false;

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

  const steps = template?.templateStrategicPriorities?.map((priority) => priority?.name || '') || [];

const validateUserObjectives = async () => {
  try {
    const priorities = template?.templateStrategicPriorities || [];
    
    // Validation des pondérations
    for (const priority of priorities) {
      if (!priority) continue;
      
      const totalWeighting = calculateTotalWeighting(priority);
      if (totalWeighting > 100) {
        setErrorMessage(`La somme des pondérations pour "${priority.name}" ne peut pas dépasser 100%. Actuel: ${totalWeighting}%`);
        setOpenSnackbar(true);
        return;
      }
    }
    
    for (let i = 0; i < priorities.length; i++) {
      const priority = priorities[i];
      if (!priority) continue;
      
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

    // PRÉPARATION DES DONNÉES SELON LE BACKEND
    const objectivesData = priorities.flatMap((priority) => {
      if (!priority || !priority.objectives) return [];
      
      return priority.objectives
        .filter((objective) => objective.description && objective.weighting && objective.resultIndicator)
        .map((objective) => {
          const weighting = parseFloat(objective.weighting) || 0;
          
          if (isNaN(weighting) || weighting <= 0) {
            return null;
          }

          // STRUCTURE EXACTE ATTENDUE PAR LE BACKEND (ObjectiveDto)
          const baseData = {
            priorityId: priority.templatePriorityId || 0,
            priorityName: priority.name || '',
            description: objective.description || '',
            weighting: weighting,
            resultIndicator: objective.resultIndicator || '',
            collaboratorComment: objective.collaboratorComment || '',
            result: parseFloat(objective.result) || 0,
            dynamicColumns: [] // OBLIGATOIRE: tableau vide par défaut
          };

          // Transformer les dynamicColumns existants
          if (Array.isArray(objective.dynamicColumns) && objective.dynamicColumns.length > 0) {
            baseData.dynamicColumns = objective.dynamicColumns
              .filter(col => col && col.columnName)
              .map((col) => ({
                columnName: col.columnName || '',
                value: col.value || ''
              }));
          }

          return baseData;
        })
        .filter(obj => obj !== null);
    });

    if (objectivesData.length === 0) {
      setErrorMessage('Veuillez remplir au moins un objectif avec tous les champs requis.');
      setOpenSnackbar(true);
      return;
    }

    console.log('=== DONNÉES ENVOYÉES ===');
    console.log(JSON.stringify(objectivesData, null, 2));

    try {
      const response = await formulaireInstance.post('/Evaluation/validateUserObjectives', objectivesData, {
        params: {
          userId: userId,
          type: userType
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Réponse:', response.data);

      if (response.data && response.data.message) {
        alert(response.data.message || 'Objectifs validés avec succès !');
        window.location.reload();
      } else {
        alert('Objectifs validés avec succès !');
        window.location.reload();
      }

    } catch (error) {
      console.error('Erreur API:', error.response?.data || error.message);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        let errorMsg = 'Erreur lors de la validation.';
        
        if (typeof errorData === 'string') {
          errorMsg = errorData;
        } else if (errorData.message) {
          errorMsg = errorData.message;
        } else if (errorData.Message) {
          errorMsg = errorData.Message;
        } else if (errorData.errors) {
          // Gestion des erreurs de validation .NET
          const validationErrors = [];
          for (const [field, messages] of Object.entries(errorData.errors)) {
            if (Array.isArray(messages)) {
              validationErrors.push(`${field}: ${messages.join(', ')}`);
            } else {
              validationErrors.push(`${field}: ${messages}`);
            }
          }
          errorMsg = validationErrors.join('; ');
        }
        
        setErrorMessage(errorMsg);
      } else {
        setErrorMessage('Une erreur est survenue lors de la validation.');
      }
      setOpenSnackbar(true);
    }
  } catch (error) {
    console.error('Erreur lors de la validation des objectifs :', error);
    setErrorMessage('Une erreur imprévue est survenue.');
    setOpenSnackbar(true);
  }
};

const updateUserObjectives = async () => {
  try {
    const priorities = template?.templateStrategicPriorities || [];
    
    // ... validation code (le même que dans validateUserObjectives) ...

    const objectivesData = priorities.flatMap((priority) => {
      if (!priority || !priority.objectives) return [];
      
      return priority.objectives.map((objective) => ({
        objectiveId: objective.objectiveId, // Important: Inclure l'ID pour la mise à jour
        priorityId: priority.templatePriorityId || 0, // IMPORTANT
        priorityName: priority.name || '',
        description: objective.description || '',
        weighting: parseFloat(objective.weighting) || 0,
        resultIndicator: objective.resultIndicator || '',
        result: parseFloat(objective.result) || 0,
        collaboratorComment: objective.collaboratorComment || '',
        // PAS de ManagerComment ici - ce n'est pas attendu par l'endpoint PUT
        objectiveColumnValues: objective.dynamicColumns?.map((col) => ({
          columnName: col.columnName,
          value: col.value || ''
        })) || []
      }));
    });

    console.log('Update data:', JSON.stringify(objectivesData, null, 2));
    
    const response = await formulaireInstance.put('/Evaluation/userObjectif', objectivesData, {
      params: {
        evalId: evalId,  // Notez: "evalId" pas "EvalId"
        userId: userId   // Notez: "userId" pas "UserId"
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    alert(response.data.Message || 'Objectifs mis à jour avec succès !');
    window.location.reload();
  } catch (error) {
    console.error('Erreur lors de la mise à jour des objectifs :', error);
    
    if (error.response?.data) {
      const errorData = error.response.data;
      let errorMsg = errorData.Message || 'Une erreur est survenue lors de la mise à jour.';
      
      if (errorData.errors) {
        const validationErrors = [];
        for (const [field, messages] of Object.entries(errorData.errors)) {
          validationErrors.push(`${field}: ${messages.join(', ')}`);
        }
        errorMsg = validationErrors.join('; ');
      }
      
      setErrorMessage(errorMsg);
    } else {
      setErrorMessage('Une erreur est survenue lors de la mise à jour.');
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
            Récupération des informations de l'évaluation
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

  if (!template || !template.templateStrategicPriorities) {
    return (
      <Container>
        <Typography>Données du template non disponibles</Typography>
      </Container>
    );
  }

  return (
    <>
      <Paper>
        <MainCard sx={{ mb: 2 }}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item xs={12} md={8}>
              <Typography variant="h3">
                {/* TITRE DYNAMIQUE MODIFIÉ */}
                {currentPeriod === 'Mi-Parcours' && !isValidated 
                  ? `Fixation Objectif - ${evaluationYear}` 
                  : `${currentPeriod} - ${evaluationYear}`
                }
              </Typography>
              {/* SOUS-TITRE EXPLICATIF */}
              {currentPeriod === 'Mi-Parcours' && !isValidated && (
                <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
                  Période de Mi-Parcours - Validation des objectifs en cours
                </Typography>
              )}
            </Grid>
            <Grid item sx={{ display: 'flex', gap: 1 }}>
              {/* HISTORIQUE POUR FIXATION OBJECTIF ET MI-PARCOURS NON VALIDÉ */}
              {(currentPeriod === 'Fixation Objectif' || (currentPeriod === 'Mi-Parcours' && !isValidated)) && (
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

        {/* FORMULAIRE DE FIXATION D'OBJECTIFS */}
        {(currentPeriod === 'Fixation Objectif' || (currentPeriod === 'Mi-Parcours' && !isValidated)) && (
          <Box sx={{ p: 1 }}>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ 
              fontSize: '0.75rem', 
              mb: 2,
              '& .MuiStepLabel-root': { fontSize: '0.75rem' },
              '& .MuiStep-root': { minHeight: 'auto' },
              height: 'auto'
            }}>
              {steps.map((label, index) => {
                const priority = template.templateStrategicPriorities[index];
                if (!priority) return null;
                
                const total = calculateTotalWeighting(priority).toFixed(1);
                return (
                  <Step key={label || index}>
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
                mb: 2, 
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
                          {template.templateStrategicPriorities[activeStep]?.name || 'Priorité'} - Requis : {getRequiredPercentage(template.templateStrategicPriorities[activeStep])}%
                        </Box>
                        <IconTargetArrow style={{ color: '#3F51B5' }} />
                      </Typography>

                      <Grid container spacing={2}>
                        {Array.from({ length: template.templateStrategicPriorities[activeStep]?.maxObjectives || 0 }).map((_, objIndex) => {
                          const objective = template.templateStrategicPriorities[activeStep]?.objectives?.[objIndex] || {};

                          return (
                            <Grid item xs={12} key={objIndex}>
                              <Paper sx={{ p: 2, backgroundColor: '#e8eaf6', borderRadius: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2 }} gutterBottom>
                                  Objectif {objIndex + 1}
                                </Typography>
                                <Grid container spacing={2}>
                                  <Grid item xs={12}>
                                    <TextField
                                      label={
                                        <span>
                                          Description de l'Objectif <span style={{ color: 'red' }}>*</span>
                                        </span>
                                      }
                                      fullWidth
                                      variant="outlined"
                                      multiline
                                      minRows={3}
                                      value={objective.description || ''}
                                      onChange={(e) =>
                                        handleObjectiveChange(
                                          template.templateStrategicPriorities[activeStep]?.name || '',
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
                                          template.templateStrategicPriorities[activeStep]?.name || '',
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
                                      minRows={3}
                                      value={objective.resultIndicator || ''}
                                      onChange={(e) =>
                                        handleObjectiveChange(
                                          template.templateStrategicPriorities[activeStep]?.name || '',
                                          objIndex,
                                          'resultIndicator',
                                          e.target.value
                                        )
                                      }
                                    />
                                  </Grid>

                                  <Grid item xs={12}>
                                    <TextField
                                      label="Commentaire collaborateur (optionnel)"
                                      fullWidth
                                      variant="outlined"
                                      multiline
                                      minRows={2}
                                      value={objective.collaboratorComment || ''}
                                      onChange={(e) =>
                                        handleObjectiveChange(
                                          template.templateStrategicPriorities[activeStep]?.name || '',
                                          objIndex,
                                          'collaboratorComment',
                                          e.target.value
                                        )
                                      }
                                      placeholder="Ajoutez vos remarques, précisions ou contextes sur cet objectif..."
                                      helperText="Ce commentaire sera visible par votre manager"
                                    />
                                  </Grid>

                                  {Array.isArray(objective.dynamicColumns) &&
                                    objective.dynamicColumns.map((column, colIndex) => (
                                      <Grid item xs={12} key={colIndex}>
                                        <Box sx={{ mb: 1 }}>
                                          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                                            {column?.columnName || `Colonne ${colIndex + 1}`}
                                          </Typography>
                                          <TextField
                                            fullWidth
                                            variant="outlined"
                                            multiline
                                            minRows={2}
                                            value={column?.value || ''}
                                            onChange={(e) =>
                                              handleObjectiveChange(
                                                template.templateStrategicPriorities[activeStep]?.name || '',
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
                isValidated ? (
                  <Button variant="contained" color="secondary" disabled sx={{ minWidth: 120 }}>
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
                    sx={{ minWidth: 120 }}
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
                    sx={{ minWidth: 120 }}
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
                  sx={{ minWidth: 120 }}
                >
                  Suivant
                </Button>
              )}
            </Box>

            <Dialog open={openHelpModal} onClose={handleCloseHelpModal} aria-labelledby="help-dialog-title">
              <DialogTitle id="help-dialog-title">Aide</DialogTitle>
              <DialogContent dividers>
                {currentPeriod === 'Fixation Objectif' || (currentPeriod === 'Mi-Parcours' && !isValidated) ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      {currentPeriod === 'Mi-Parcours' && !isValidated 
                        ? 'Fixation des objectifs - Période de Mi-Parcours' 
                        : 'Fixation des objectifs'
                      }
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {currentPeriod === 'Mi-Parcours' && !isValidated 
                        ? 'Vous êtes actuellement en période de Mi-Parcours mais n\'avez pas encore validé vos objectifs. Vous devez d\'abord compléter et valider vos objectifs avant de pouvoir saisir vos résultats mi-parcours.'
                        : 'Vous devez compléter, pour chaque Priorité Stratégique, au moins un objectif, sa pondération et le résultat attendu.'
                      }
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
                      <span style={{ color: 'red' }}>tant que l'évaluateur n'a pas encore validé à son tour.</span>
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      <strong>Important :</strong> Une fois que l'évaluateur aura validé, le bouton de validation sera désactivé, et aucune
                      modification ne sera possible, sauf par votre évaluateur.
                    </Typography>
                  </>
                ) : currentPeriod === 'Mi-Parcours' && isValidated ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Mi-Parcours
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
                      sauf sur les résultats durant la période d'évaluation finale.
                    </Typography>
                  </>
                ) : currentPeriod === 'Évaluation Finale' ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Évaluation Finale
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
                ) : (
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

        {/* MI-PARCOURS - DÉJÀ VALIDÉ */}
        {currentPeriod === 'Mi-Parcours' && isValidated && <CollabMp />}

        {/* ÉVALUATION FINALE */}
        {currentPeriod === 'Évaluation Finale' && <CollabFi />}

        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>
      </Paper>
    </>
  );
}

export default CollabFo;