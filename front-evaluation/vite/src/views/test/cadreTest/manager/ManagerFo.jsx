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
  Alert,
  CircularProgress,
  Backdrop,
  Avatar,
  Stack,
  Container,
  Tooltip,
  IconButton
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { IconTargetArrow, IconUser } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import ManagerMp from './ManagerMp';
import ManagerFi from './ManagerFi';
import HelpIcon from '@mui/icons-material/Help';

function ManagerFo() {
  const { subordinateId, typeUser } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const managerId = user.id;

  const [evalId, setEvalId] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [hasOngoingEvaluation, setHasOngoingEvaluation] = useState(false);
  const [template, setTemplate] = useState({ templateStrategicPriorities: [] });
  const [activeStep, setActiveStep] = useState(0);
  const [userObjectives, setUserObjectives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingObjectives, setLoadingObjectives] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [openSignatureModal, setOpenSignatureModal] = useState(false);
  const [openNoSignatureModal, setOpenNoSignatureModal] = useState(false);
  const [openSignatureRecommendationModal, setOpenSignatureRecommendationModal] = useState(false);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const [noObjectivesFound, setNoObjectivesFound] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [collaboratorInfo, setCollaboratorInfo] = useState(null);

  // *** Fonctions pour les modals
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

  // *** Vérifier si l'utilisateur a une signature
  const checkUserSignature = async (userId) => {
    try {
      const response = await authInstance.get(`/Signature/get-user-signature/${userId}`);
      return !!response.data.signature;
    } catch (error) {
      return false;
    }
  };

  // *** Fetch fonctions...
  const fetchCadreTemplateId = async () => {
    try {
      const response = await formulaireInstance.get('/Template/CadreTemplate');
      if (response.data?.templateId) setTemplateId(response.data.templateId);
    } catch (error) {
      console.error('Erreur lors de la récupération du Template ID:', error);
      setIsLoading(false);
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
      setIsLoading(false);
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
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du Template:', error);
      setIsLoading(false);
    }
  };

  // *** Fonction pour récupérer les informations du collaborateur
  const fetchCollaboratorInfo = async () => {
    try {
      // Adaptez cette URL à votre endpoint réel
      const response = await formulaireInstance.get(`/User/${subordinateId}`);
      if (response.data) {
        setCollaboratorInfo({
          nom: response.data.nom || 'Nom non disponible',
          matricule: response.data.matricule || 'Matricule non disponible',
          poste: response.data.poste || 'Poste non disponible',
          photo: response.data.photo
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des informations du collaborateur:', error);
      setCollaboratorInfo({
        nom: 'Nom non disponible',
        matricule: 'Matricule non disponible',
        poste: 'Poste non disponible',
        photo: null
      });
    }
  };

  const fetchUserObjectives = async (evalId, userId) => {
    setLoadingObjectives(true);
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
    } finally {
      setLoadingObjectives(false);
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
            setNoObjectivesFound(false);
          } else {
            console.log('Aucun objectif utilisateur trouvé.');
            setNoObjectivesFound(true);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des objectifs.', error);
        }
      }
    };

    loadUserObjectives();
  }, [evalId, subordinateId]);

  const handleObjectiveChange = (priorityName, objectiveIndex, field, value, columnIndex = null) => {
    setTemplate((prevTemplate) => {
      const updatedPriorities = prevTemplate.templateStrategicPriorities.map((priority) => {
        if (priority.name !== priorityName) return priority;

        const updatedObjectives = [...priority.objectives];

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
          objective[field] = value;
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
          userId: subordinateId,
          type: typeUser
        }
      });

      if (response.data && response.data.historyCFos && response.data.historyCFos.length > 0) {
        const validatedEntry = response.data.historyCFos.find((entry) => entry.validatedBy);
        if (validatedEntry) {
          setIsValidated(true);
          console.log('Validation existante :', validatedEntry);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la validation :', error);
      setIsValidated(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchCadreTemplateId(),
          checkOngoingEvaluation(),
          checkIfValidated(),
          fetchCollaboratorInfo()
        ]);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des données:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  useEffect(() => {
    const recommendAddingSignature = async () => {
      try {
        const hasSignature = await checkUserSignature(managerId);
        if (!hasSignature) {
          setOpenSignatureRecommendationModal(true);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de la signature :', error);
      }
    };

    recommendAddingSignature();
  }, [managerId]);

  const handleContinueWithoutSignature = () => {
    setOpenSignatureRecommendationModal(false);
  };

  // *** Fonction pour rendre le loader
  const renderLoader = () => (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
      open={isLoading || loadingObjectives}
    >
      <CircularProgress color="inherit" />
      <Typography variant="h6">
        {isLoading ? 'Chargement des données...' : 'Récupération des objectifs du collaborateur...'}
      </Typography>
    </Backdrop>
  );

  const validateStep = () => {
    const currentPriority = template.templateStrategicPriorities[activeStep];
    if (!currentPriority) return false;

    let isAnyObjectiveFilled = false;

    for (const [index, objective] of currentPriority.objectives.entries()) {
      const isObjectivePartiallyFilled = objective.description || objective.weighting || objective.resultIndicator;

      const hasDynamicColumns = Array.isArray(objective.dynamicColumns);
      const isAnyDynamicColumnFilled = hasDynamicColumns ? objective.dynamicColumns.some((column) => column.value) : false;

      if (isAnyDynamicColumnFilled && (!objective.description || !objective.weighting || !objective.resultIndicator)) {
        alert(`Tous les champs obligatoires doivent être remplis pour l'objectif ${index + 1} dans "${currentPriority.name}".`);
        return false;
      }

      if (isObjectivePartiallyFilled) {
        isAnyObjectiveFilled = true;

        if (!objective.description || !objective.weighting || !objective.resultIndicator) {
          alert(`Tous les champs obligatoires doivent être remplis pour l'objectif ${index + 1} dans "${currentPriority.name}".`);
          return false;
        }
      }
    }

    if (!isAnyObjectiveFilled) {
      alert(`Veuillez remplir au moins un objectif pour "${currentPriority.name}".`);
      return false;
    }

    return true;
  };

  const steps = template.templateStrategicPriorities.map((priority) => priority.name);

  const validateHistoryUserObjectives = async () => {
    if (isValidated) {
      alert('Vous avez déjà validé les objectifs.');
      return;
    }

    try {
      const objectivesData = template.templateStrategicPriorities.flatMap((priority) =>
        priority.objectives.map((objective) => ({
          objectiveId: objective.objectiveId,
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

      console.log(objectivesData);

      // Vérifier si au moins un objectif est valide
      if (!objectivesData.some((obj) => obj.description && obj.weighting && obj.resultIndicator)) {
        alert('Veuillez remplir au moins un objectif avec tous les champs requis.');
        return;
      }

      // Si un fichier de signature est fourni, on vérifie la signature
      if (signatureFile) {
        const hasSignature = await checkUserSignature(managerId);
        if (!hasSignature) {
          setOpenNoSignatureModal(true);
          return;
        }

        // Lire le fichier en Base64
        const fileReader = new FileReader();
        fileReader.onloadend = async () => {
          const base64String = fileReader.result;
          const imageBase64 = base64String.split(',')[1];

          try {
            // Comparer et valider la signature
            const compareResponse = await authInstance.post(
              `/Signature/compare-user-signature/${managerId}`,
              { imageBase64 },
              { headers: { 'Content-Type': 'application/json' } }
            );

            if (!compareResponse.data.isMatch) {
              alert('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
              handleOpenSignatureModal();
              return;
            }

            // Valider les objectifs
            await submitValidation(objectivesData);
          } catch (error) {
            handleValidationError(error);
          }
        };

        fileReader.onerror = () => {
          alert('Impossible de lire le fichier de signature. Veuillez réessayer.');
        };

        fileReader.readAsDataURL(signatureFile);
      } else {
        // Validation sans signature
        await submitValidation(objectivesData);
      }
    } catch (error) {
      console.error('Erreur lors de la validation des objectifs :', error);
      alert('Une erreur imprévue est survenue.');
    }
  };

  // Fonction helper pour soumettre la validation
  const submitValidation = async (objectivesData) => {
    try {
      const response = await formulaireInstance.post('/Evaluation/validateUserObjectivesHistory', objectivesData, {
        params: {
          validatorUserId: managerId,
          userId: subordinateId,
          type: typeUser
        }
      });

      alert(response.data.message || 'Objectifs validés avec succès !');
      window.location.reload();
    } catch (error) {
      handleValidationError(error);
    }
  };

  // Fonction helper pour gérer les erreurs de validation
  const handleValidationError = (error) => {
    if (error.response?.data?.message) {
      alert(error.response.data.message);
    } else {
      alert('Une erreur est survenue lors de la validation.');
    }
    console.error('Erreur lors de la validation des objectifs :', error);
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
      {renderLoader()}
      
      <Paper>
        <MainCard>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="subtitle2">Évaluation</Typography>
              {/* *** Section compacte avec informations du collaborateur */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontSize: '1.8rem', fontWeight: 600, mb: 0.5, lineHeight: 1.2 }}>
                    {currentPeriod} - 2025
                  </Typography>
                  
                  {/* *** Affichage compact des informations du collaborateur */}
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                    <Avatar 
                      sx={{ 
                        width: 36, 
                        height: 36, 
                        bgcolor: '#3949AB',
                        fontSize: '0.9rem'
                      }}
                      src={collaboratorInfo?.photo}
                    >
                      {!collaboratorInfo?.photo && <IconUser size={20} />}
                    </Avatar>
                    <Box sx={{ lineHeight: 1.1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                        <strong>Nom:</strong> {collaboratorInfo?.nom || 'Chargement...'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        <strong>Matricule:</strong> {collaboratorInfo?.matricule || 'N/A'} • 
                        <strong> Poste:</strong> {collaboratorInfo?.poste || 'N/A'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Grid>
            <Grid item>
              <Tooltip title="Besoin d'aide ?" arrow>
                <IconButton 
                  aria-label="aide" 
                  onClick={handleOpenHelpModal}
                  size="small"
                  sx={{ mt: -1 }}
                >
                  <HelpIcon sx={{ fontSize: 20, color: 'text.primary' }} />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </MainCard>

        {currentPeriod === 'Fixation Objectif' && (
          <Box p={3}>
            {noObjectivesFound ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                Le collaborateur n'a pas encore validé ses objectifs
              </Alert>
            ) : (
              <>
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
                                          disabled={loadingObjectives}
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
                                          inputProps={{ min: 0, max: 100, step: 0.01, maxLength: 6 }}
                                          value={objective.weighting || ''}
                                          onChange={(e) => {
                                            let value = e.target.value.replace(',', '.');
                                            if (!/^\d{0,3}(\.\d{0,2})?$/.test(value)) return;
                                            handleObjectiveChange(
                                              template.templateStrategicPriorities[activeStep].name,
                                              objIndex,
                                              'weighting',
                                              value
                                            );
                                          }}
                                          disabled={loadingObjectives}
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
                                          disabled={loadingObjectives}
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
                                                disabled={loadingObjectives}
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
                    disabled={activeStep === 0 || loadingObjectives}
                    onClick={handleBack}
                    variant="contained"
                    color="primary"
                    startIcon={<KeyboardArrowLeft />}
                  >
                    Précédent
                  </Button>

                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      color="success"
                      disabled={isValidated || loadingObjectives}
                      onClick={() => {
                        if (validateStep()) {
                          validateHistoryUserObjectives();
                        }
                      }}
                    >
                      {isValidated ? 'Déjà validé' : 'Valider'}
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
                      disabled={loadingObjectives}
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
                        validateHistoryUserObjectives();
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
                      Vous n'avez pas encore de signature enregistrée. Veuillez{' '}
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
                
                <Dialog
                  open={openSignatureRecommendationModal}
                  onClose={handleContinueWithoutSignature}
                  aria-labelledby="signature-recommendation-title"
                >
                  <DialogTitle id="signature-recommendation-title">Signature Manquante</DialogTitle>
                  <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Nous vous recommandons d'ajouter une signature avant de commencer. Cela évitera de devoir tout retaper après validation.
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
              </>
            )}
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
                  <span style={{ color: 'red' }}> tant que l'évalué ne l'a pas encore validé à son tour.</span>
                </Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Important :</strong> Une fois que l'évalué a validé, le bouton de validation sera désactivé. Seuls les résultats
                  pourront être modifiés lors de la période d'évaluation finale.
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
                  <span style={{ color: 'red' }}> tant que l'évalué ne l'a pas encore validé à son tour.</span>
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

        {/* Période Mi-Parcours */}
        {currentPeriod === 'Mi-Parcours' && <ManagerMp subordinateId={subordinateId} typeUser={typeUser} />}

        {/* Période Évaluation Finale */}
        {currentPeriod === 'Évaluation Finale' && <ManagerFi subordinateId={subordinateId} typeUser={typeUser} />}
      </Paper>
    </>
  );
}

export default ManagerFo;