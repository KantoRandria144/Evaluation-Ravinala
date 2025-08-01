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
  Dialog, // ***
  DialogTitle, // ***
  DialogContent, // ***
  DialogActions, // ****
  Alert,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableBody,
  Divider
} from '@mui/material'; // Assurez-vous que ces imports sont corrects
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
  const [signatureFile, setSignatureFile] = useState(null);
  const [openSignatureModal, setOpenSignatureModal] = useState(false);
  const [openNoSignatureModal, setOpenNoSignatureModal] = useState(false);

  const [noObjectivesFound, setNoObjectivesFound] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  // *** Fonctions pour la modal de signature
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
      const evaluationId = response.data[0].evalId;
      setEvalId(evaluationId);
    } catch (error) {
      console.error('Erreur lors de la vérification des évaluations:', error);
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
                    result: obj.result || '',
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
  }, [evalId, userId]);

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
      const response = await formulaireInstance.get('/Evaluation/getHistoryMidtermeByUser', {
        params: {
          userId: userId,
          type: typeUser,
        },
      });
  
      // Vérifier si la réponse contient des données
      if (response.data && response.data.length > 0) {
        // Rechercher une entrée validée
        const hasValidatedEntry = response.data.some((entry) => entry.validatedBy);
  
        if (hasValidatedEntry) {
          setIsValidated(true); // Marquer comme validé
          console.log('Validation existante détectée');
        } else {
          setIsValidated(false); // Pas de validation
          console.log('Aucune validation trouvée');
        }
      } else {
        setIsValidated(false); // Pas de données dans la réponse
        console.log('Aucune donnée trouvée');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la validation :', error);
      setIsValidated(false);
    }
  };

  useEffect(() => {
    fetchCadreTemplateId();
    checkOngoingEvaluation();
    checkIfValidated(); // Vérifie si la validation a déjà été effectuée
  }, []);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

//   const validateStep = () => {
//     const currentPriority = template.templateStrategicPriorities[activeStep];
//     if (!currentPriority) return false;

//     let isAnyObjectiveFilled = false;

//     for (const [index, objective] of currentPriority.objectives.entries()) {
//       const isObjectivePartiallyFilled = objective.description || objective.weighting || objective.resultIndicator;

//       const hasDynamicColumns = Array.isArray(objective.dynamicColumns);
//       const isAnyDynamicColumnFilled = hasDynamicColumns ? objective.dynamicColumns.some((column) => column.value) : false;

//       if (isAnyDynamicColumnFilled && (!objective.description || !objective.weighting || !objective.resultIndicator || !objective.result)) {
//         alert(`Tous les champs obligatoires doivent être remplis pour l'objectif ${index + 1} dans "${currentPriority.name}".`);
//         return false;
//       }

//       if (isObjectivePartiallyFilled) {
//         isAnyObjectiveFilled = true;

//         if (!objective.description || !objective.weighting || !objective.resultIndicator || !objective.result) {
//           alert(`Tous les champs obligatoires doivent être remplis pour l'objectif ${index + 1} dans "${currentPriority.name}".`);
//           return false;
//         }
//       }
//     }

//     if (!isAnyObjectiveFilled) {
//       alert(`Veuillez remplir au moins un objectif pour "${currentPriority.name}".`);
//       return false;
//     }

//     return true;
//   };


  const validateMitermObjectifHistory = async () => {
    if (isValidated) {
      alert('Vous avez déjà validé les objectifs.');
      return;
    }

    try {
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

      console.log(objectivesData);

      // Vérifier si au moins un objectif est valide
      if (!objectivesData.some((obj) => obj.description && obj.weighting && obj.resultIndicator)) {
        alert('Veuillez remplir au moins un objectif avec tous les champs requis.');
        return;
      }

      // Vérifier si un fichier de signature est sélectionné
      if (!signatureFile) {
        alert('Veuillez fournir un fichier de signature avant de valider vos objectifs.');
        handleOpenSignatureModal();
        return;
      }

      // Lire le fichier en Base64
      const fileReader = new FileReader();
      fileReader.onloadend = async () => {
        const base64String = fileReader.result;
        const imageBase64 = base64String.split(',')[1]; // Extraire uniquement la chaîne Base64

        try {
          // Étape 1 : Comparer et valider la signature
          const compareResponse = await authInstance.post(
            `/Signature/compare-user-signature/${userId}`,
            { imageBase64 },
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (!compareResponse.data.isMatch) {
            alert('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
            handleOpenSignatureModal();
            return;
          }

          // Étape 2 : Valider les objectifs
          const response = await formulaireInstance.post('/Evaluation/validateMitermObjectifHistory', objectivesData, {
            params: {
            //   validatorUserId: managerId,
              userId: userId,
              type: typeUser
            }
          });

          alert(response.data.message || 'Objectifs validés avec succès !');
          window.location.reload();
        } catch (error) {
          if (error.response?.data?.message) {
            // Si le backend retourne un message spécifique, on l'affiche
            alert(error.response.data.message);
          } else {
            // Message générique pour d'autres erreurs
            alert('Une erreur est survenue lors de la validation.');
          }
          console.error('Erreur lors de la validation des objectifs :', error);
        }
      };

      fileReader.onerror = () => {
        alert('Impossible de lire le fichier de signature. Veuillez réessayer.');
      };

      fileReader.readAsDataURL(signatureFile);
    } catch (error) {
      console.error('Erreur lors de la validation des objectifs :', error);
      alert('Une erreur imprévue est survenue.');
    }
  };

  const isObjectiveUndefined = (objective) => {
    return (
      (!objective.description || objective.description === 'Non défini') &&
      (!objective.weighting || objective.weighting === 0) &&
      (!objective.resultIndicator || objective.resultIndicator === 'Non défini') &&
      (!objective.result || objective.result === 0) &&
      (!objective.dynamicColumns || objective.dynamicColumns.every((column) => !column.value || column.value === 'Non défini'))
    );
  };


  return (
    <>
      <Box p={3}>
        {noObjectivesFound ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Le collaborateur n'a pas encore validé ses objectifs
          </Alert>
        ) : (
          <>
            {template.templateStrategicPriorities.map((priority, priorityIndex) => (
              <Card key={priorityIndex} sx={{ mb: 4}}>
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
                      <TableContainer component="div" >
                        <Table aria-label={`tableau pour ${priority.name}`} sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
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
                                Objectif
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 'bold',
                                  color: '#333333',
                                  textAlign: 'left',
                                  borderRight: '1px solid rgba(224, 224, 224, 1)',
                                  width: '10%'
                                }}
                              >
                                Pondération
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 'bold',
                                  color: '#333333',
                                  textAlign: 'left',
                                  borderRight: '1px solid rgba(224, 224, 224, 1)',
                                  width: '25%'
                                }}
                              >
                                Indicateur de Résultat
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 'bold',
                                  color: '#333333',
                                  textAlign: 'left',
                                  borderRight: '1px solid rgba(224, 224, 224, 1)',
                                  width: '10%'
                                }}
                              >
                                Résultat
                              </TableCell>
                              {priority.objectives[0]?.dynamicColumns?.map((column, colIndex) => (
                                <TableCell
                                  key={colIndex}
                                  sx={{
                                    fontWeight: 'bold',
                                    color: '#333333',
                                    textAlign: 'left',
                                    width: '10%'
                                  }}
                                >
                                  {column.columnName || `Colonne ${colIndex + 1}`}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {priority.objectives
                              .filter((objective) => !isObjectiveUndefined(objective))
                              .map((objective, objIndex) => (
                                <TableRow key={objIndex}>
                                  <TableCell
                                    sx={{
                                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                                      width: '25%'
                                    }}
                                  >
                                    {objective.description || 'Non défini'}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                                      width: '10%'
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        color: objective.weighting >= 50 ? 'primary.main' : 'error.main',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        textAlign: 'center'
                                      }}
                                    >
                                      <Typography>{objective.weighting || ''} %</Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                                      width: '25%'
                                    }}
                                  >
                                    {objective.resultIndicator || 'Non défini'}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                                      width: '10%'
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        backgroundColor: objective.result >= 50 ? '#E8EAF6' : 'rgba(244, 67, 54, 0.1)',
                                        color: objective.result >= 50 ? 'primary.main' : 'error.main',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        textAlign: 'center'
                                      }}
                                    >
                                      <Typography>{objective.result || ''} %</Typography>
                                    </Box>
                                  </TableCell>
                                  {objective.dynamicColumns?.map((column, colIndex) => (
                                    <TableCell
                                      key={colIndex}
                                      sx={{
                                        width: '10%'
                                      }}
                                    >
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
            ))}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="success"
                disabled={isValidated}
                onClick={() => {
                  if (!signatureFile) {
                    handleOpenSignatureModal(); // Ouvrir la modal pour la signature
                  } else {
                    validateMitermObjectifHistory(); // Valider les objectifs
                  }
                }}
              >
                {isValidated ? 'Déjà validé' : 'Valider'}
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
                    // Une fois qu'on a choisi la signature, on ferme la modal
                    handleCloseSignatureModal();
                    validateMitermObjectifHistory();
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
    </>
  );
}

export default CollabMp;
