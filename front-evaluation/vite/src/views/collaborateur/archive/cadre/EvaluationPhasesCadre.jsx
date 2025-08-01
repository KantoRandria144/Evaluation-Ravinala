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
  Icon
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import MainCard from 'ui-component/cards/MainCard';
import { formulaireInstance, authInstance } from '../../../../axiosConfig';
import { useParams } from 'react-router-dom';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

function EvaluationPhasesCadre() {
  const { userId, evalId } = useParams();
  const [historyByPhase, setHistoryByPhase] = useState([]);
  const [activePhase, setActivePhase] = useState('Fixation');
  const [evaluationDetails, setEvaluationDetails] = useState(null);
  const [totalWeightingSum, setTotalWeightingSum] = useState(0);
  const [totalResultSum, setTotalResultSum] = useState(0);
  const [errorMessage, setErrorMessage] = useState(''); 
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userMatricule = user.matricule || 'N/A';
  const userNon = user.name || 'Utilisateur';
  const poste = user.poste || 'N/A';
  const departement = user.department || 'N/A';
  const superiorName = user.superiorName || 'N/A';
  const superiorId = user.superiorId;

  const [isContentVisible, setIsContentVisible] = useState(true);

  const printRef = useRef();
  const [canDownload, setCanDownload] = useState(false);
  const HABILITATION_DOWNLOAD = 28;

  const [userSignature, setUserSignature] = useState(null); // Signature du collaborateur
  const [managerSignature, setManagerSignature] = useState(null); // Signature du manager

  const [managerDetail, setManagerDetail] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState(null);

  const fetchEvaluationDetails = async () => {
    try {
      const response = await formulaireInstance.get(`/Evaluation/${evalId}`);
      if (response && response.data) {
        setEvaluationDetails(response.data);
        console.log(response.data);
      } else {
        console.error('Structure de réponse inattendue:', response);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des détails de l'évaluation:", error);
    }
  };

  useEffect(() => {
    handlePhaseClick('Fixation');
    fetchEvaluationDetails();
    checkPermissions();
    fetchManagerDetail(superiorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

  const fetchManagerDetail = async (id) => {
    try {
      const response = await authInstance.get(`/User/user/${id}`);
      if (response && response.data) {
        setManagerDetail(response.data);
        console.log(response.data.matricule);
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

  const checkPermissions = async () => {
    try {
      const addResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${HABILITATION_DOWNLOAD}`
      );
      setCanDownload(addResponse.data.hasAccess);
    } catch (error) {
      const errorData = error.response?.data;
      setError(typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : 'Erreur lors de la vérification des autorisations.');
    }
  };

  const fetchUserAndManagerSignatures = async (userId, managerId) => {
    try {
      // Récupérer la signature de l'utilisateur
      try {
        const userResponse = await authInstance.get(`/Signature/get-user-signature/${userId}`);
        if (userResponse && userResponse.data && userResponse.data.signature) {
          setUserSignature(userResponse.data.signature);
        } else {
          setUserSignature(null);
        }
      } catch (userError) {
        console.log('Signature utilisateur non disponible:', userError.message);
        setUserSignature(null);
      }

      // Récupérer la signature du manager
      try {
        const managerResponse = await authInstance.get(`/Signature/get-user-signature/${managerId}`);
        if (managerResponse && managerResponse.data && managerResponse.data.signature) {
          setManagerSignature(managerResponse.data.signature);
        } else {
          setManagerSignature(null);
        }
      } catch (managerError) {
        console.log('Signature manager non disponible:', managerError.message);
        setManagerSignature(null);
      }
    } catch (error) {
      console.log('Erreur lors de la récupération des signatures:', error.message);
      setUserSignature(null);
      setManagerSignature(null);
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

  const handlePhaseClick = async (phase) => {
    setActivePhase(phase);
    setIsContentVisible(false);
    setErrorMessage('');

    setTimeout(async () => {
      try {
        const response = await formulaireInstance.get(`/archive/historyCadre/${userId}/${evalId}/${phase}`);
        if (response && response.data) {
          if (response.data.message) {
            setHistoryByPhase([]);
            setErrorMessage(response.data.message);
          } else {
            setHistoryByPhase(response.data);
            setErrorMessage('');

            // Appeler les pondérations et résultats selon la phase
            if (phase === 'Fixation') {
              await fetchTotalWeighting();
            } else if (phase === 'Mi-Parcours' || phase === 'Évaluation Finale') {
              await fetchTotalWeightingAndResult(phase);
            }

            // Appeler les signatures uniquement lorsque les données sont disponibles
            if (response.data.length > 0) {
              if (userId && superiorId) {
                // Ne pas attendre les signatures pour éviter de bloquer l'interface
                fetchUserAndManagerSignatures(userId, superiorId).catch(error => {
                  console.log('Erreur lors de la récupération des signatures, mais continuons:', error.message);
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'historique de la phase:", error);
        setErrorMessage('Pas de donnée disponible');
      } finally {
        setIsContentVisible(true);
      }
    }, 400);
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

  // const exportPDF = () => {
  //   const input = printRef.current;
  //   html2canvas(input, { scale: 2 })
  //     .then((canvas) => {
  //       const imgData = canvas.toDataURL('image/png');
  //       const pdf = new jsPDF({
  //         orientation: 'portrait',
  //         unit: 'pt',
  //         format: 'a4'
  //       });

  //       const imgProps = pdf.getImageProperties(imgData);
  //       const pdfWidth = pdf.internal.pageSize.getWidth();
  //       const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  //       pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  //       const sanitizedUserName = userNon.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  //       pdf.save(`${sanitizedUserName}_formulaire_Cadre.pdf`);
  //     })
  //     .catch((err) => {
  //       console.error('Erreur lors de la génération du PDF:', err);
  //     });
  // };

  const exportPDF = () => {
    const input = printRef.current;
    const opt = {
      margin:       0.5, // Marges en pouces
      filename:     `${userNon.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_formulaire_Cadre.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] } // Gestion des sauts de page
    };
  
    html2pdf().set(opt).from(input).save().catch((err) => {
      console.error('Erreur lors de la génération du PDF:', err);
    });
  };  
  

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Grid item>
            <Typography variant="subtitle2">Archive</Typography>
            <Typography variant="h3" sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              Formulaire d’évaluation
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
                onClick={() => handlePhaseClick(phase)}
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

        <Box
          sx={{
            padding: 2,
            opacity: isContentVisible ? 1 : 0,
            transform: isContentVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
            willChange: 'opacity, transform'
          }}
          ref={printRef}
        >
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
                  {evaluationDetails.titre}
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
                    <span style={{ fontWeight: 'bold' }}> Nom: </span> {userNon}
                    </Typography> 
                    <Typography variant="body1"> <span style={{ fontWeight: 'bold' }}> Matricule: </span> {userMatricule || 'N/A'}</Typography>
                    <Typography variant="body1">
                    <span style={{ fontWeight: 'bold' }}> Poste: </span> {poste}
                    </Typography>
                    <Typography variant="body1">
                    <span style={{ fontWeight: 'bold' }}> Département: </span> {departement}
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
                    <span style={{ fontWeight: 'bold' }}> Nom: </span> {superiorName}
                    </Typography> 
                    <Typography variant="body1"> <span style={{ fontWeight: 'bold' }}> Matricule: </span> {managerDetail?.matricule || 'N/A'}</Typography>
                    <Typography variant="body1">
                    <span style={{ fontWeight: 'bold' }}> Poste: </span> {managerDetail?.poste}
                    </Typography>
                    <Typography variant="body1">
                    <span style={{ fontWeight: 'bold' }}> Département: </span> {managerDetail?.department}
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
                      <TableCell sx={{ backgroundColor: '#e8eaf6', color: 'black' }}>RÉSULTATS en % d’atteinte sur 100%</TableCell>
                      {columnNames?.length > 0 &&
                        columnNames.map((columnName) => (
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
                            rowSpan={objectives.length + 2}
                            sx={{ borderRight: '1px solid #ddd', fontWeight: 'bold', verticalAlign: 'top' }}
                          >
                            {priorityName}
                            <Typography variant="caption" display="block">
                              {/* Vous pouvez décommenter et ajuster si nécessaire */}
                              {/* ({objectives[0].weighting}% / {objectives[0].totalWeighting || 0}%) */}
                            </Typography>
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
                            {objective.columnValues &&
                              objective.columnValues.length > 0 &&
                              objective.columnValues.map((column) => (
                                <TableCell key={column.columnName} sx={{ borderRight: '1px solid #ddd' }}>
                                  {column.value !== 'N/A' ? column.value : ''}
                                </TableCell>
                              ))}
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
                            {objectives[0].totalWeighting || 0} %
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#000', borderRight: '1px solid #ddd' }}>
                            Sous-total résultats
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: '#000' }}>{objectives[0].totalResult || 0} %</TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                    <TableRow>
                      <TableCell colSpan={1} sx={{ backgroundColor: 'transparent' }}></TableCell>
                      <TableCell sx={{ backgroundColor: '#fff9d1' }}>TOTAL PONDÉRATION (100%)</TableCell>
                      <TableCell sx={{ backgroundColor: '#fff9d1' }}>{totalWeightingSum}%</TableCell>
                      <TableCell sx={{ backgroundColor: '#fff9d1' }}>PERFORMANCE du contrat d'objectifs</TableCell>
                      <TableCell sx={{ backgroundColor: '#fff9d1' }}>{totalResultSum}%</TableCell>
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

              <Grid container sx={{ mt: 2 }} spacing={4}>
                <Grid item xs={6} sx={{ textAlign: 'center' }}>
                  <Typography variant="body1">Signature Collaborateur</Typography>
                  <Box sx={{ height: '100px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {userSignature ? (
                      <img
                        src={`data:image/png;base64,${userSignature}`}
                        alt="Signature Collaborateur"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                        onError={(e) => {
                          console.log('Erreur de chargement de la signature utilisateur');
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%' }} />
                    )}
                  </Box>
                </Grid>

                <Grid item xs={6} sx={{ textAlign: 'center' }}>
                  <Typography variant="body1">Signature Manager</Typography>
                  <Box sx={{ height: '100px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {managerSignature ? (
                      <img
                        src={`data:image/png;base64,${managerSignature}`}
                        alt="Signature Manager"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                        onError={(e) => {
                          console.log('Erreur de chargement de la signature manager');
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%' }} />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </MainCard>
    </Paper>
  );
}

export default EvaluationPhasesCadre;
