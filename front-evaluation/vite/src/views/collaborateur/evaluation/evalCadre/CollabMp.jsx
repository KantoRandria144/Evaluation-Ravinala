import React, { useEffect, useState } from 'react';
import { formulaireInstance } from '../../../../axiosConfig';
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
  Alert,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableBody,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { IconTargetArrow } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

function CollabMp() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user.id;
  const typeUser = user.typeUser;

  const [evalId, setEvalId] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [hasOngoingEvaluation, setHasOngoingEvaluation] = useState(false);
  const [template, setTemplate] = useState({ templateStrategicPriorities: [] });
  const [activeStep, setActiveStep] = useState(0);
  const [userObjectives, setUserObjectives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noObjectivesFound, setNoObjectivesFound] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [openSignatureModal, setOpenSignatureModal] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);

  // Nouveau state pour gérer l'affichage tableau vs formulaire
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'form'
  const [allResultsAreZero, setAllResultsAreZero] = useState(false);

  const steps = template.templateStrategicPriorities.map((priority) => priority.name);

  // Fetch fonctions...
  const fetchCadreTemplateId = async () => {
    try {
      const response = await formulaireInstance.get('/Template/CadreTemplate');
      if (response.data?.templateId) setTemplateId(response.data.templateId);
    } catch (error) {
      console.error('Erreur lors de la récupération du Template ID:', error);
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

  useEffect(() => {
    const loadUserObjectives = async () => {
      if (evalId && userId) {
        try {
          const objectives = await fetchUserObjectives(evalId, userId);
          if (objectives && objectives.length > 0) {
            setUserObjectives(objectives);
            
            // Vérifier si tous les résultats sont à 0
            const allZero = objectives.every((obj) => {
              const result = parseFloat(obj.result);
              return isNaN(result) || result === 0;
            });
            setAllResultsAreZero(allZero);
            
            // Si tous les résultats sont à 0, passer en mode formulaire
            if (allZero) {
              setViewMode('form');
            }
            
            setTemplate((prevTemplate) => {
              const updatedPriorities = prevTemplate.templateStrategicPriorities.map((priority) => {
                const priorityObjectives = objectives.filter((obj) => obj.templateStrategicPriority?.name === priority.name);

                return {
                  ...priority,
                  objectives: priorityObjectives.map((obj) => ({
                    objectiveId: obj.objectiveId,
                    description: obj.description || '',
                    weighting: obj.weighting || '',
                    resultIndicator: obj.resultIndicator || '',
                    result: obj.result || '0', // Initialiser à "0" si vide
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
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadUserObjectives();
  }, [evalId, userId]);

  // Handle objective change - version formulaire pour la saisie des résultats
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
            result: '0',
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
            // Valider le format du résultat (pourcentage entre 0 et 100)
            let parsedValue = value.replace(',', '.');
            if (parsedValue === '' || parsedValue === '-') {
              objective[field] = parsedValue;
            } else if (/^\d{0,3}(\.\d{0,2})?$/.test(parsedValue)) {
              const numValue = parseFloat(parsedValue);
              if (numValue >= 0 && numValue <= 100) {
                objective[field] = parsedValue;
              }
            }
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
      const response = await formulaireInstance.get('/Evaluation/getHistoryMidtermeByUser', {
        params: {
          userId: userId,
          type: typeUser
        }
      });

      if (response.data && response.data.length > 0) {
        const hasValidatedEntry = response.data.some((entry) => entry.validatedBy);
        setIsValidated(hasValidatedEntry);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la validation :', error);
    }
  };

  useEffect(() => {
    fetchCadreTemplateId();
    checkOngoingEvaluation();
    checkIfValidated();
  }, []);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  // Valider les résultats saisis
  const validateResults = async () => {
    try {
      // Vérifier que tous les résultats sont valides
      let hasError = false;
      
      template.templateStrategicPriorities.forEach((priority) => {
        priority.objectives?.forEach((objective, index) => {
          const result = parseFloat(objective.result);
          if (isNaN(result) || result < 0 || result > 100) {
            alert(`Veuillez entrer un résultat valide (entre 0 et 100) pour l'objectif ${index + 1} de "${priority.name}"`);
            hasError = true;
          }
        });
      });
      
      if (hasError) return;

      // Préparer les données pour l'envoi
      const objectivesData = template.templateStrategicPriorities.flatMap((priority) =>
        (priority.objectives || []).map((objective) => ({
          objectiveId: objective.objectiveId,
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

      // Envoyer les résultats
      const response = await formulaireInstance.post('/Evaluation/validateMitermObjectifHistory', objectivesData, {
        params: {
          userId: userId,
          type: typeUser
        }
      });

      alert(response.data.message || 'Résultats validés avec succès !');
      window.location.reload();
    } catch (error) {
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('Une erreur est survenue lors de la validation.');
      }
      console.error('Erreur lors de la validation des résultats :', error);
    }
  };

  // Mettre à jour les résultats (sans validation finale)
  const updateResults = async () => {
    try {
      // Vérifier que tous les résultats sont valides
      let hasError = false;
      
      template.templateStrategicPriorities.forEach((priority) => {
        priority.objectives?.forEach((objective, index) => {
          const result = parseFloat(objective.result);
          if (isNaN(result) || result < 0 || result > 100) {
            alert(`Veuillez entrer un résultat valide (entre 0 et 100) pour l'objectif ${index + 1} de "${priority.name}"`);
            hasError = true;
          }
        });
      });
      
      if (hasError) return;

      const objectivesData = template.templateStrategicPriorities.flatMap((priority) =>
        (priority.objectives || []).map((objective) => ({
          objectiveId: objective.objectiveId,
          result: parseFloat(objective.result) || 0,
          objectiveColumnValues:
            objective.dynamicColumns?.map((col) => ({
              columnName: col.columnName,
              value: col.value
            })) || []
        }))
      );

      const response = await formulaireInstance.put('/Evaluation/updateMidtermResults', objectivesData, {
        params: {
          userId: userId
        }
      });

      alert(response.data.message || 'Résultats mis à jour avec succès !');
      setAllResultsAreZero(false);
      setViewMode('table');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des résultats :', error);
      alert(error.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  // Fonction pour vérifier si un objectif est vide ou non défini
  const isObjectiveValid = (objective) => {
    return (
      objective &&
      objective.description && 
      objective.description.trim() !== '' &&
      objective.description !== 'Non défini' &&
      objective.weighting &&
      parseFloat(objective.weighting) > 0
    );
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Fonctions pour la modal de signature
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

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Chargement...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {noObjectivesFound ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Vous n'avez pas encore validé vos objectifs
        </Alert>
      ) : userObjectives.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Aucun objectif trouvé
        </Alert>
      ) : (
        <>
          {/* Boutons pour changer de mode d'affichage */}
          {!isValidated && (
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('table')}
              >
                Vue Tableau
              </Button>
              <Button
                variant={viewMode === 'form' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('form')}
                color="primary"
              >
                Saisir les Résultats
              </Button>
            </Box>
          )}

          {viewMode === 'table' ? (
            // AFFICHAGE TABLEAU (Lecture seule)
            template.templateStrategicPriorities.map((priority, priorityIndex) => {
              // Filtrer les objectifs valides pour cette priorité
              const validObjectives = (priority.objectives || []).filter(isObjectiveValid);
              
              // Si aucun objectif valide, ne pas afficher cette priorité
              if (validObjectives.length === 0) {
                return null;
              }

              return (
                <Card key={priorityIndex} sx={{ mb: 4 }}>
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
                      {priority.name}
                      <IconTargetArrow style={{ color: '#3f51b5' }} />
                    </Typography>

                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TableContainer component="div">
                          <Table aria-label={`tableau pour ${priority.name}`} sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 'bold', color: '#333333', textAlign: 'left', borderRight: '1px solid rgba(224, 224, 224, 1)', width: '25%' }}>
                                  Objectif
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#333333', textAlign: 'left', borderRight: '1px solid rgba(224, 224, 224, 1)', width: '10%' }}>
                                  Pondération
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#333333', textAlign: 'left', borderRight: '1px solid rgba(224, 224, 224, 1)', width: '25%' }}>
                                  Indicateur de Résultat
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#333333', textAlign: 'left', borderRight: '1px solid rgba(224, 224, 224, 1)', width: '10%' }}>
                                  Résultat
                                </TableCell>
                                {validObjectives[0]?.dynamicColumns?.map((column, colIndex) => (
                                  <TableCell key={colIndex} sx={{ fontWeight: 'bold', color: '#333333', textAlign: 'left', width: '10%' }}>
                                    {column.columnName || `Colonne ${colIndex + 1}`}
                                  </TableCell>
                                ))}
                              </TableRow>
                            </TableHead>

                            <TableBody>
                              {validObjectives.map((objective, objIndex) => (
                                <TableRow key={objIndex}>
                                  <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', width: '25%' }}>
                                    {objective.description || ''}
                                  </TableCell>
                                  <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', width: '10%' }}>
                                    <Box sx={{ color: 'primary.main', padding: '8px 16px', borderRadius: '8px', textAlign: 'center' }}>
                                      <Typography>{objective.weighting || ''} %</Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', width: '25%' }}>
                                    {objective.resultIndicator || ''}
                                  </TableCell>
                                  <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', width: '10%' }}>
                                    <Box sx={{
                                      backgroundColor: parseFloat(objective.result) >= 50 ? '#E8EAF6' : 'rgba(244, 67, 54, 0.1)',
                                      color: parseFloat(objective.result) >= 50 ? 'primary.main' : 'error.main',
                                      padding: '8px 16px',
                                      borderRadius: '8px',
                                      textAlign: 'center'
                                    }}>
                                      <Typography>{objective.result || '0'} %</Typography>
                                    </Box>
                                  </TableCell>
                                  {objective.dynamicColumns?.map((column, colIndex) => (
                                    <TableCell key={colIndex} sx={{ width: '10%' }}>
                                      {column.value || ''}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            // AFFICHAGE FORMULAIRE (pour saisie des résultats)
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
                          {template.templateStrategicPriorities[activeStep].objectives
                            .filter(isObjectiveValid)
                            .map((objective, objIndex) => (
                              <Grid item xs={12} key={objIndex}>
                                <Paper sx={{ p: 3, backgroundColor: '#e8eaf6' }}>
                                  <Typography variant="h6" sx={{ mb: '20px' }} gutterBottom>
                                    Objectif {objIndex + 1}
                                  </Typography>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} sm={12}>
                                      <TextField
                                        label="Description de l'Objectif"
                                        fullWidth
                                        variant="outlined"
                                        multiline
                                        minRows={2}
                                        value={objective.description || ''}
                                        InputProps={{
                                          readOnly: true
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label="Pondération"
                                        fullWidth
                                        variant="outlined"
                                        value={objective.weighting || ''}
                                        InputProps={{
                                          readOnly: true,
                                          endAdornment: <InputAdornment position="end">%</InputAdornment>
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label={
                                          <span>
                                            Résultat <span style={{ color: 'red' }}>*</span>
                                          </span>
                                        }
                                        fullWidth
                                        variant="outlined"
                                        type="text"
                                        value={objective.result || '0'}
                                        onChange={(e) =>
                                          handleObjectiveChange(
                                            template.templateStrategicPriorities[activeStep].name,
                                            objIndex,
                                            'result',
                                            e.target.value
                                          )
                                        }
                                        helperText="Entre 0 et 100%"
                                        InputProps={{
                                          endAdornment: <InputAdornment position="end">%</InputAdornment>
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <TextField
                                        label="Indicateur de Résultat"
                                        fullWidth
                                        variant="outlined"
                                        multiline
                                        minRows={2}
                                        value={objective.resultIndicator || ''}
                                        InputProps={{
                                          readOnly: true
                                        }}
                                      />
                                    </Grid>
                                    {Array.isArray(objective.dynamicColumns) &&
                                      objective.dynamicColumns.map((column, colIndex) => (
                                        <Grid item xs={12} key={colIndex}>
                                          <TextField
                                            label={column.columnName || `Colonne ${colIndex + 1}`}
                                            fullWidth
                                            variant="outlined"
                                            multiline
                                            minRows={2}
                                            value={column.value || ''}
                                            InputProps={{
                                              readOnly: true
                                            }}
                                          />
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
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={updateResults}
                      disabled={isValidated}
                    >
                      Enregistrer les résultats
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={validateResults}
                      disabled={isValidated}
                    >
                      {isValidated ? 'Déjà validé' : 'Valider définitivement'}
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
                    endIcon={<KeyboardArrowRight />}
                  >
                    Suivant
                  </Button>
                )}
              </Box>
            </>
          )}

          {viewMode === 'table' && !isValidated && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              {allResultsAreZero ? (
                <Alert severity="info" sx={{ mb: 2, width: '100%' }}>
                  Votre manager n'a pas encore validé vos résultats. Vous pouvez saisir vos résultats estimés.
                </Alert>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  onClick={validateResults}
                  disabled={isValidated}
                >
                  {isValidated ? 'Déjà validé' : 'Valider les résultats'}
                </Button>
              )}
            </Box>
          )}

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
                  validateResults();
                }}
                variant="contained"
                color="primary"
              >
                Confirmer
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}

export default CollabMp;