import React, { useEffect, useState } from 'react';
import { formulaireInstance } from '../../../../axiosConfig';
import {
  Box,
  TextField,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import { IconTargetArrow, IconEdit, IconCheck, IconX } from '@tabler/icons-react';
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
  const [userObjectives, setUserObjectives] = useState([]);
  const [noObjectivesFound, setNoObjectivesFound] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResults, setEditedResults] = useState({});
  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [openValidationConfirmModal, setOpenValidationConfirmModal] = useState(false);
  const [isManagerValidation, setIsManagerValidation] = useState(false);

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

  // Fonction pour rafraîchir les objectifs
  const refreshUserObjectives = async () => {
    if (evalId && userId) {
      try {
        const objectives = await fetchUserObjectives(evalId, userId);
        if (objectives && objectives.length > 0) {
          setUserObjectives(objectives);
          
          const initialEditedResults = {};
          objectives.forEach(obj => {
            if (obj.objectiveId) {
              initialEditedResults[obj.objectiveId] = obj.result !== null && obj.result !== undefined ? obj.result.toString() : '';
            }
          });
          setEditedResults(initialEditedResults);

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
          setNoObjectivesFound(true);
        }
      } catch (error) {
        console.error('Erreur lors du rafraîchissement des objectifs.', error);
      }
    }
  };

  // Fonction pour vérifier si le manager a validé
  const checkManagerValidationStatus = async () => {
    try {
      const response = await formulaireInstance.get('/Evaluation/getHistoryMidtermeByUser', {
        params: {
          userId: userId,
          type: typeUser
        }
      });

      if (response.data && response.data.length > 0) {
        const managerValidation = response.data.find((entry) => 
          entry.validatedBy && entry.validatedBy !== userId
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
    const loadUserObjectives = async () => {
      if (evalId && userId) {
        await refreshUserObjectives();
      }
    };

    loadUserObjectives();
  }, [evalId, userId]);

  const handleResultChange = (objectiveId, value) => {
    setEditedResults(prev => ({
      ...prev,
      [objectiveId]: value
    }));
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    const originalResults = {};
    userObjectives.forEach(obj => {
      if (obj.objectiveId) {
        originalResults[obj.objectiveId] = obj.result !== null && obj.result !== undefined ? obj.result.toString() : '';
      }
    });
    setEditedResults(originalResults);
    setIsEditing(false);
  };

  const handleSaveResults = async () => {
    try {
      // Déterminer si c'est une évaluation Cadre ou NonCadre
      const isCadreEvaluation = typeUser === "Cadre" || typeUser === "cadre";
      
      // Préparer la requête selon le type d'évaluation
      let requestData;
      
      if (isCadreEvaluation) {
        // Format pour les cadres
        requestData = {
          userId: userId,
          type: "Cadre",
          objectives: userObjectives.map(obj => ({
            objectiveId: obj.objectiveId,
            description: obj.description || '',
            weighting: obj.weighting || 0,
            resultIndicator: obj.resultIndicator || '',
            result: editedResults[obj.objectiveId] === '' ? 0 : parseFloat(editedResults[obj.objectiveId]) || obj.result,
            dynamicColumns: obj.objectiveColumnValues?.map(col => ({
              columnName: col.columnName,
              value: col.value || ''
            })) || []
          })),
          indicators: [] // Champ requis mais vide pour les cadres
        };
      } else {
        // Format pour les non-cadres (si jamais vous avez besoin de cette fonctionnalité)
        requestData = {
          userId: userId,
          type: "NonCadre",
          objectives: [], // Champ requis mais vide pour les non-cadres
          indicators: [] // Vous devrez remplir ceci si vous gérez les non-cadres
        };
      }

      const response = await formulaireInstance.post('/Evaluation/updateResults', requestData);

      if (response.status === 200) {
        const message = response.data?.Message || 'Résultats mis à jour avec succès !';
        alert(message);
        
        // Rafraîchir les données depuis l'API pour s'assurer que tout est synchronisé
        await refreshUserObjectives();
        
        setIsEditing(false);
        setOpenConfirmModal(false);
        
      } else {
        alert('Réponse inattendue du serveur.');
      }
      
    } catch (error) {
      console.error('Erreur détaillée:', error);
      
      // Gestion améliorée des erreurs
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 400) {
          if (data.errors) {
            // Erreurs de validation ASP.NET
            const validationErrors = Object.entries(data.errors)
              .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
              .join('\n');
            alert(`Erreurs de validation:\n${validationErrors}`);
          } else {
            alert(data.title || `Erreur ${status}: Requête invalide`);
          }
        } else if (status === 404) {
          alert('Évaluation non trouvée. Vérifiez que l\'évaluation est en cours.');
        } else if (status === 500) {
          alert('Erreur serveur. Contactez l\'administrateur.');
        } else {
          alert(`Erreur ${status}: ${data?.message || 'Erreur inconnue'}`);
        }
      } else if (error.request) {
        alert('Aucune réponse du serveur. Vérifiez votre connexion réseau.');
      } else {
        alert('Erreur de configuration de la requête.');
      }
    }
  };

  const handleConfirmSave = () => {
    // Valider que tous les résultats sont des nombres valides ou vides
    const invalidEntries = Object.entries(editedResults).filter(([id, value]) => {
      if (value === '' || value === null || value === undefined) {
        return false; // Vide est acceptable
      }
      
      // Remplacer les virgules par des points
      const normalizedValue = value.toString().replace(',', '.');
      
      // Vérifier le format numérique
      const numValue = parseFloat(normalizedValue);
      if (isNaN(numValue)) {
        return true;
      }
      
      // Vérifier la plage
      return numValue < 0 || numValue > 100;
    });

    if (invalidEntries.length > 0) {
      alert('Veuillez entrer des valeurs numériques valides entre 0 et 100 (ou laisser vide).');
      return;
    }

    setOpenConfirmModal(true);
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
        const hasValidatedEntry = response.data.some((entry) => entry.validatedBy === userId);
        setIsValidated(hasValidatedEntry);
      } else {
        setIsValidated(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la validation :', error);
      setIsValidated(false);
    }
  };

  useEffect(() => {
    fetchCadreTemplateId();
    checkOngoingEvaluation();
    checkIfValidated();
    checkManagerValidationStatus();
  }, []);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const validateMitermObjectifHistory = async () => {
    if (isValidated) {
      alert('Vous avez déjà validé les objectifs.');
      return;
    }

    // Vérifier si des résultats sont manquants
    const missingResults = userObjectives.filter(obj => 
      !obj.result && obj.result !== 0
    );

    if (missingResults.length > 0) {
      alert('Veuillez d\'abord ajouter vos résultats avant de valider.');
      return;
    }

    // Vérifier si tous les résultats sont dans la plage 0-100
    const invalidResults = userObjectives.filter(obj => {
      const result = parseFloat(obj.result);
      return isNaN(result) || result < 0 || result > 100;
    });

    if (invalidResults.length > 0) {
      alert('Certains résultats ne sont pas dans la plage valide (0-100). Veuillez corriger avant de valider.');
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

      if (!objectivesData.some((obj) => obj.description && obj.weighting && obj.resultIndicator && (obj.result || obj.result === 0))) {
        alert('Veuillez remplir au moins un objectif avec tous les champs requis (y compris les résultats).');
        return;
      }

      const response = await formulaireInstance.post('/Evaluation/validateMitermObjectifHistory', objectivesData, {
        params: {
          userId: userId,
          type: typeUser
        }
      });

      alert(response.data.message || 'Objectifs validés avec succès !');
      window.location.reload();
    } catch (error) {
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('Une erreur est survenue lors de la validation.');
      }
      console.error('Erreur lors de la validation des objectifs :', error);
    }
  };

  const isObjectiveUndefined = (objective) => {
    return (
      (!objective.description || objective.description === 'Non défini') &&
      (!objective.weighting || objective.weighting === 0) &&
      (!objective.resultIndicator || objective.resultIndicator === 'Non défini') &&
      (!objective.result && objective.result !== 0) &&
      (!objective.dynamicColumns || objective.dynamicColumns.every((column) => !column.value || column.value === 'Non défini'))
    );
  };

  const isResultDefined = (result) => {
    return result !== undefined && result !== null && result !== '';
  };

  // Fonction pour formater la valeur d'entrée
  const formatInputValue = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    
    const strValue = value.toString();
    // Remplacer la virgule par un point pour le parsing
    const normalized = strValue.replace(',', '.');
    
    // Vérifier si c'est un nombre
    if (/^-?\d*\.?\d*$/.test(normalized)) {
      // Limiter à 2 décimales
      const parts = normalized.split('.');
      if (parts[1] && parts[1].length > 2) {
        return parts[0] + '.' + parts[1].substring(0, 2);
      }
      return normalized;
    }
    return value;
  };

  const renderResultCell = (objective) => {
    if (isEditing) {
      return (
        <TextField
          type="text"
          inputProps={{ 
            style: { 
              textAlign: 'center',
              padding: '8px'
            }
          }}
          value={formatInputValue(editedResults[objective.objectiveId] || '')}
          onChange={(e) => {
            let value = e.target.value;
            // Permettre les nombres, points et virgules
            if (value === '' || /^[\d,.]*$/.test(value)) {
              handleResultChange(objective.objectiveId, value);
            }
          }}
          onBlur={(e) => {
            let value = e.target.value.trim();
            if (value === '') {
              handleResultChange(objective.objectiveId, '');
              return;
            }
            
            // Remplacer la virgule par un point
            value = value.replace(',', '.');
            
            // Vérifier si c'est un nombre valide
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              // Limiter à la plage 0-100 et 2 décimales
              const clampedValue = Math.min(100, Math.max(0, numValue));
              const formattedValue = clampedValue.toFixed(2);
              handleResultChange(objective.objectiveId, formattedValue);
            }
          }}
          variant="outlined"
          size="small"
          sx={{
            width: '100px',
            '& .MuiOutlinedInput-root': {
              height: '40px'
            }
          }}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
          placeholder="0-100"
        />
      );
    } else {
      const resultValue = objective.result;
      const hasResult = resultValue !== undefined && resultValue !== null && resultValue !== '';
      const numericResult = parseFloat(resultValue);
      const isHigh = !isNaN(numericResult) && numericResult >= 50;
      
      return (
        <Box
          sx={{
            backgroundColor: hasResult ? (isHigh ? '#E8EAF6' : 'rgba(244, 67, 54, 0.1)') : '#f5f5f5',
            color: hasResult ? (isHigh ? 'primary.main' : 'error.main') : 'text.secondary',
            padding: '8px 16px',
            borderRadius: '8px',
            textAlign: 'center',
            display: 'inline-block',
            minWidth: '80px',
            border: hasResult ? 'none' : '1px dashed #ccc'
          }}
        >
          <Typography>
            {hasResult ? `${resultValue} %` : 'Non saisi'}
          </Typography>
        </Box>
      );
    }
  };

  return (
    <>
      <Box p={3}>
        {noObjectivesFound ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Vous n'avez pas encore validé vos objectifs
          </Alert>
        ) : (
          <>
            {/* Afficher le bouton "Modifier mes résultats" seulement si l'utilisateur n'a pas encore validé ET si le manager n'a pas validé */}
            {!isValidated && !isManagerValidation && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, gap: 2 }}>
                {!isEditing ? (
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<IconEdit />}
                    onClick={handleStartEditing}
                  >
                    Modifier mes résultats
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<IconX />}
                      onClick={handleCancelEditing}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<IconCheck />}
                      onClick={handleConfirmSave}
                    >
                      Enregistrer les résultats
                    </Button>
                  </>
                )}
              </Box>
            )}

            {isManagerValidation && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Votre manager a déjà validé vos résultats. Vous pouvez seulement les visualiser.
              </Alert>
            )}

            {template.templateStrategicPriorities.map((priority, priorityIndex) => (
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
                                  width: '15%'
                                }}
                              >
                                Résultat
                                {isEditing && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    (0-100)
                                  </Typography>
                                )}
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
                                      <Typography>
                                        {(objective.weighting !== undefined && objective.weighting !== null && objective.weighting !== '') 
                                          ? `${objective.weighting} %` 
                                          : '0 %'}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                                      width: '25%'
                                    }}
                                  >
                                    {objective.resultIndicator ? objective.resultIndicator : 'Non défini'}
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                                      width: '15%'
                                    }}
                                  >
                                    {renderResultCell(objective)}
                                  </TableCell>
                                  {objective.dynamicColumns?.map((column, colIndex) => (
                                    <TableCell
                                      key={colIndex}
                                      sx={{
                                        width: '10%'
                                      }}
                                    >
                                      {column.value ? column.value : ''}
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

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body1" color="text.secondary">
                {isValidated 
                  ? 'Vous avez déjà validé vos objectifs et résultats' 
                  : 'Après avoir ajouté tous vos résultats, validez'}
              </Typography>
              
              <Button
                variant="contained"
                color="success"
                disabled={isValidated || isManagerValidation}
                onClick={() => setOpenValidationConfirmModal(true)}
                size="large"
              >
                {isValidated ? 'Déjà validé' : 'Valider'}
              </Button>
            </Box>

            {/* Modal de confirmation pour l'enregistrement des résultats */}
            <Dialog open={openConfirmModal} onClose={() => setOpenConfirmModal(false)}>
              <DialogTitle>Confirmer l'enregistrement</DialogTitle>
              <DialogContent>
                <Typography>
                  Êtes-vous sûr de vouloir enregistrer ces résultats ?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Vous pourrez toujours les modifier avant la validation définitive.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenConfirmModal(false)}>Annuler</Button>
                <Button 
                  onClick={() => {
                    setOpenConfirmModal(false);
                    handleSaveResults();
                  }} 
                  variant="contained" 
                  color="primary"
                >
                  Confirmer
                </Button>
              </DialogActions>
            </Dialog>

            {/* Modal de confirmation pour la validation définitive */}
            <Dialog open={openValidationConfirmModal} onClose={() => setOpenValidationConfirmModal(false)}>
              <DialogTitle>Confirmer la validation</DialogTitle>
              <DialogContent>
                <Typography variant="body1" gutterBottom>
                  Êtes-vous sûr de vouloir valider vos objectifs et résultats ?
                </Typography>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Attention :</strong> Après validation, vous ne pourrez plus modifier vos résultats.
                    Seul votre manager pourra apporter des modifications si nécessaire.
                  </Typography>
                </Alert>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Cette action est irréversible pour la période d'évaluation en cours.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenValidationConfirmModal(false)}>Annuler</Button>
                <Button 
                  onClick={() => {
                    setOpenValidationConfirmModal(false);
                    validateMitermObjectifHistory();
                  }} 
                  variant="contained" 
                  color="success"
                >
                  Confirmer la validation
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