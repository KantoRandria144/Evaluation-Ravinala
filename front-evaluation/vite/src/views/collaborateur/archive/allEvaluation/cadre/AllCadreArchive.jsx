import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Divider,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Icon,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import MainCard from 'ui-component/cards/MainCard';
import { authInstance, formulaireInstance } from '../../../../../axiosConfig';
import { useParams } from 'react-router-dom';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

function AllCadreArchive() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userConnected = user.id;
  const { userId, evalId } = useParams();
  const [historyByPhase, setHistoryByPhase] = useState([]);
  const [activePhase, setActivePhase] = useState('Fixation');
  const [evaluationDetails, setEvaluationDetails] = useState(null);
  const [totalWeightingSum, setTotalWeightingSum] = useState(0);
  const [totalResultSum, setTotalResultSum] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [superiorId, setSuperiorId] = useState(null);
  const [enrichedValidationHistory, setEnrichedValidationHistory] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const printRef = useRef();
  const [canDownload, setCanDownload] = useState(false);
  const HABILITATION_DOWNLOAD = 28;

  const [managerDetail, setManagerDetail] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState(null);

  const checkPermissions = async () => {
    try {
      const addResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userConnected}&requiredHabilitationAdminId=${HABILITATION_DOWNLOAD}`
      );
      setCanDownload(addResponse.data.hasAccess);
    } catch (error) {
      const errorData = error.response?.data;
      setErrorMessage(typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : 'Erreur lors de la vérification des autorisations.');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const supId = await fetchUserDetails();
      await fetchValidationHistory();
      if (supId) {
        await handlePhaseClick('Fixation', supId);
      }
      await fetchEvaluationDetails();
      await checkPermissions();
      await fetchManagerDetail(supId);
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserInfo = async (userId) => {
    try {
      const response = await authInstance.get(`/User/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des infos utilisateur:', error);
      return null;
    }
  };

  const fetchValidationHistory = async () => {
    try {
      const response = await formulaireInstance.get('/Evaluation/getUserObjectivesHistory', {
        params: { userId: userId, type: 'Cadre' }
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
        setEnrichedValidationHistory([]);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des données validées :', error);
      setEnrichedValidationHistory([]);
    }
  };

  const fetchManagerDetail = async (id) => {
    try {
      const response = await authInstance.get(`/User/user/${id}`);
      if (response && response.data) {
        setManagerDetail(response.data);
      } else {
        console.error('Structure de réponse inattendue:', response);
        setUserError('Données utilisateur non disponibles.');
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      setUserError('Erreur lors de la récupération des données utilisateur.');
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchEvaluationDetails = async () => {
    try {
      const response = await formulaireInstance.get(`/Evaluation/${evalId}`);
      if (response && response.data) {
        setEvaluationDetails(response.data);
      } else {
        console.error('Structure de réponse inattendue:', response);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des détails de l'évaluation:", error);
    }
  };

  const fetchUserDetails = async () => {
    try {
      const response = await authInstance.get(`/User/user/${userId}`);
      if (response && response.data) {
        setUserDetails(response.data);
        setSuperiorId(response.data.superiorId);
        return response.data.superiorId;
      } else {
        console.error('Structure de réponse inattendue:', response);
        return null;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des détails utilisateur:', error);
      return null;
    }
  };

  const fetchTotalWeighting = async () => {
    try {
      const response = await formulaireInstance.get(`/archive/priority/totalWeighting/${evalId}/${userId}`);
      if (response && response.data) {
        setTotalWeightingSum(response.data.totalWeightingSum);
        setTotalResultSum(0);
        setHistoryByPhase((prevHistory) => {
          const updatedHistory = [...prevHistory];
          response.data.totalWeightings.forEach((item) => {
            updatedHistory.forEach((objective) => {
              if (objective.priorityName === item.priorityName) {
                objective.totalWeighting = item.totalWeighting;
              }
            });
          });
          return updatedHistory;
        });
      } else {
        console.error('Structure de réponse inattendue:', response);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la pondération totale:', error);
    }
  };

  const fetchTotalWeightingAndResult = async (phase) => {
    try {
      const response = await formulaireInstance.get(`/archive/priority/totalWeightingAndResult/${evalId}/${userId}/${phase}`);
      if (response && response.data) {
        setTotalWeightingSum(response.data.totalWeightingSum);
        setTotalResultSum(response.data.totalResultSum);
        setHistoryByPhase((prevHistory) => {
          const updatedHistory = [...prevHistory];
          response.data.totalWeightingAndResults.forEach((item) => {
            updatedHistory.forEach((objective) => {
              if (objective.priorityName === item.priorityName) {
                objective.totalWeighting = item.totalWeighting;
                objective.totalResult = item.totalResult;
              }
            });
          });
          return updatedHistory;
        });
      } else {
        console.error('Structure de réponse inattendue:', response);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la pondération et des résultats:', error);
    }
  };

  const handlePhaseClick = async (phase, supId) => {
    setActivePhase(phase);
    setErrorMessage('');

    try {
      const response = await formulaireInstance.get(`/archive/historyCadre/${userId}/${evalId}/${phase}`);
      if (response && response.data) {
        if (response.data.message) {
          setHistoryByPhase([]);
          setErrorMessage(response.data.message);
        } else {
          setHistoryByPhase(response.data);
          setErrorMessage('');

          if (phase === 'Fixation') {
            await fetchTotalWeighting();
          } else if (phase === 'Mi-Parcours' || phase === 'Évaluation Finale') {
            await fetchTotalWeightingAndResult(phase);
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique de la phase:", error);
      setErrorMessage('Pas de donnée disponible');
    }
  };

  const groupedData = historyByPhase.reduce((acc, curr) => {
    const { priorityName } = curr;
    if (!acc[priorityName]) {
      acc[priorityName] = [];
    }
    acc[priorityName].push(curr);
    return acc;
  }, {});

  const columnNames = Array.from(
    new Set(historyByPhase.flatMap((objective) => objective.columnValues || []).map((column) => column.columnName))
  );

  const dynamicColumnsCount = columnNames.length;

  const getEvaluationYear = () => {
    if (evaluationDetails?.evalAnnee) {
      return evaluationDetails.evalAnnee;
    }
    const titreMatch = evaluationDetails?.titre?.match(/(\d{4})$/);
    return titreMatch ? titreMatch[1] : 'Année non spécifiée';
  };

  const exportPDF = () => {
    const input = printRef.current;
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('l', 'pt', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
  
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
  
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
  
      const sanitizedUserName = (userDetails?.name || 'utilisateur').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pdf.save(`${sanitizedUserName}_formulaire_Cadre.pdf`);
    }).catch((err) => {
      console.error('Erreur lors de la génération du PDF', err);
    });
  };

  if (isInitialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Grid item>
            <Typography variant="subtitle2">Résultats</Typography>
            <Typography variant="h3" sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              Formulaire d'évaluation
            </Typography>
          </Grid>
          <Grid item>
            {canDownload && (
              <IconButton size="small" onClick={exportPDF}>
                <FileDownloadIcon color="primary" />
              </IconButton>
            )}
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {['Fixation', 'Mi-Parcours', 'Évaluation Finale'].map((phase) => (
            <Grid item xs={12} sm={6} md={4} key={phase}>
              <Card
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  backgroundColor: activePhase === phase ? '#C5CAE9' : '#E8EAF6',
                  '&:hover': activePhase !== phase ? { backgroundColor: '#e3eaf5' } : {}
                }}
                onClick={() => handlePhaseClick(phase, superiorId)}
              >
                <FolderIcon sx={{ fontSize: 24, color: 'rgb(57, 73, 171)', marginRight: '16px' }} />
                <CardContent sx={{ flexGrow: 1, padding: 0 }}>
                  <Typography variant="body1" sx={{ color: '#1a202c' }}>
                    {phase}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box ref={printRef}>
          {errorMessage ? (
            <Alert
              severity="info"
              sx={{
                textAlign: 'center',
                marginBottom: 3
              }}
            >
              {errorMessage}
            </Alert>
          ) : (
            <>
              {evaluationDetails && (
                <Typography variant="h4" align="center" sx={{ backgroundColor: '#e8f2dc', padding: 1, fontWeight: 'bold', mt: 2 }}>
                  {evaluationDetails.titre} ({getEvaluationYear()})
                </Typography>
              )}
              <Grid container spacing={4} sx={{ mb: 3, mt: 2 }}>
                <Grid item xs={6}>
                  <Paper sx={{ padding: 2, borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                      COLLABORATEUR
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Nom: </span> {userDetails?.name || 'N/A'}
                    </Typography>
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Matricule: </span> {userDetails?.matricule || 'N/A'}
                    </Typography>
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Poste: </span> {userDetails?.poste || 'N/A'}
                    </Typography>
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Département: </span> {userDetails?.department || 'N/A'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ padding: 2, borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                      MANAGER
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Nom: </span> {managerDetail?.name || 'N/A'}
                    </Typography>
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Matricule: </span> {managerDetail?.matricule || 'N/A'}
                    </Typography>
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Poste: </span> {managerDetail?.poste || 'N/A'}
                    </Typography>
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Département: </span> {managerDetail?.department || 'N/A'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <TableContainer sx={{ border: '1px solid #ddd', borderRadius: '4px', mt: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ borderRight: '1px solid #ddd', backgroundColor: '#e8eaf6', color: 'black' }}>
                        PRIORITÉS STRATÉGIQUES
                      </TableCell>
                      <TableCell sx={{ borderRight: '1px solid #ddd', backgroundColor: '#e8eaf6', color: 'black' }}>OBJECTIFS</TableCell>
                      <TableCell sx={{ borderRight: '1px solid #ddd', backgroundColor: '#e8eaf6', color: 'black' }}>PONDÉRATION</TableCell>
                      <TableCell sx={{ borderRight: '1px solid #ddd', backgroundColor: '#e8eaf6', color: 'black' }}>
                        INDICATEURS DE RÉSULTAT
                      </TableCell>
                      <TableCell sx={{ backgroundColor: '#e8eaf6', color: 'black' }}>RÉSULTATS en % d'atteinte sur 100%</TableCell>
                      <TableCell sx={{ borderRight: '1px solid #ddd', backgroundColor: '#c5cae9', color: 'black' }}>COMMENTAIRE MANAGER</TableCell>
                      {columnNames.map((columnName) => (
                        <TableCell key={columnName} sx={{ backgroundColor: '#c5cae9', color: 'black' }}>
                          {columnName}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(groupedData).map(([priorityName, objectives]) => (
                      <React.Fragment key={priorityName}>
                        <TableRow>
                          <TableCell
                            rowSpan={objectives.length + 1}
                            sx={{ borderRight: '1px solid #ddd', fontWeight: 'bold', verticalAlign: 'top' }}
                          >
                            {priorityName}
                          </TableCell>
                        </TableRow>
                        {objectives.map((objective) => (
                          <TableRow key={objective.historyId}>
                            <TableCell sx={{ borderRight: '1px solid #ddd' }}>
                              {objective.description && objective.description !== 'N/A' ? objective.description : ' '}
                            </TableCell>
                            <TableCell sx={{ borderRight: '1px solid #ddd' }}>
                              {objective.weighting && objective.weighting !== 0 ? `${objective.weighting}%` : ' '}
                            </TableCell>
                            <TableCell sx={{ borderRight: '1px solid #ddd' }}>
                              {objective.resultIndicator && objective.resultIndicator !== 'N/A' ? objective.resultIndicator : ' '}
                            </TableCell>
                            <TableCell sx={{ borderRight: '1px solid #ddd' }}>
                              {objective.result && objective.result !== 0 ? `${objective.result}%` : ' '}
                            </TableCell>
                            {columnNames.map((columnName) => {
                              const columnValue = (objective.columnValues || []).find(col => col.columnName === columnName);
                              return (
                                <TableCell key={columnName} sx={{ borderRight: '1px solid #ddd' }}>
                                  {columnValue?.value !== 'N/A' ? columnValue?.value : ''}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                        <TableRow sx={{ backgroundColor: '#e8f2dc' }}>
                          <TableCell
                            colSpan={1}
                            sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#000', borderRight: '1px solid #ddd' }}
                          >
                            Sous-total de pondération
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: '#000', borderRight: '1px solid #ddd' }}>
                            {objectives[0]?.totalWeighting || 0} %
                          </TableCell>
                          <TableCell
                            colSpan={2 + dynamicColumnsCount}
                            sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#000' }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Sous-total résultats : {objectives[0]?.totalResult || 0} %</span>
                            </Box>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                    <TableRow>
                      <TableCell colSpan={1} sx={{ backgroundColor: 'transparent' }}></TableCell>
                      <TableCell sx={{ backgroundColor: '#fff9d1' }}>TOTAL PONDÉRATION (100%)</TableCell>
                      <TableCell sx={{ backgroundColor: '#fff9d1' }}>{totalWeightingSum}%</TableCell>
                      <TableCell colSpan={2 + dynamicColumnsCount} sx={{ backgroundColor: '#fff9d1' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>PERFORMANCE du contrat d'objectifs</span>
                          <span>{totalResultSum}%</span>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Grid container sx={{ mt: 4, justifyContent: 'space-between' }}>
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ border: '1px solid #ddd', borderRadius: '8px', padding: 2, backgroundColor: '#f9f9f9' }}>
                        <Grid container alignItems="center">
                          <Grid item>
                            <Icon sx={{ mr: 1 }}>
                              <CalendarTodayIcon />
                            </Icon>
                          </Grid>
                          <Grid item xs>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                              Date de fixation des objectifs :
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'normal' }}>
                              {evaluationDetails?.fixationObjectif
                                ? new Date(evaluationDetails.fixationObjectif).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })
                                : 'N/A'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Box sx={{ border: '1px solid #ddd', borderRadius: '8px', padding: 2, backgroundColor: '#f9f9f9' }}>
                        <Grid container alignItems="center">
                          <Grid item>
                            <Icon sx={{ mr: 1 }}>
                              <CalendarTodayIcon />
                            </Icon>
                          </Grid>
                          <Grid item xs>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                              Date évaluation mi-parcours :
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'normal' }}>
                              {evaluationDetails?.miParcours
                                ? new Date(evaluationDetails.miParcours).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })
                                : 'N/A'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Box sx={{ border: '1px solid #ddd', borderRadius: '8px', padding: 2, backgroundColor: '#f9f9f9' }}>
                        <Grid container alignItems="center">
                          <Grid item>
                            <Icon sx={{ mr: 1 }}>
                              <CalendarTodayIcon />
                            </Icon>
                          </Grid>
                          <Grid item xs>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                              Date de l'entretien final :
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'normal' }}>
                              {evaluationDetails?.final
                                ? new Date(evaluationDetails.final).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })
                                : 'N/A'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              <Grid container sx={{ mt: 2 }} spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Historique de validation</Typography>
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
                                    component="span"
                                    sx={{ display: 'inline', fontWeight: 'bold', mr: 1 }}
                                  >
                                    {entry.user?.name || 'Utilisateur inconnu'}
                                  </Typography>
                                  <Chip label={entry.status} size="small" color="success" />
                                </Box>
                              }
                              secondary={
                                <React.Fragment>
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
                                    sx={{ display: 'block' }}
                                  >
                                    {entry.formattedDate}
                                  </Typography>
                                </React.Fragment>
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
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </MainCard>
    </Paper>
  );
}

export default AllCadreArchive;