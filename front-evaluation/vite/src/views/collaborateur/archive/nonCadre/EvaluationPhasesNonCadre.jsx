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
  styled,
  IconButton,
  Alert,
  Icon
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import MainCard from 'ui-component/cards/MainCard';
import { formulaireInstance, authInstance } from '../../../../axiosConfig'; // Assurez-vous que authInstance est importé
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  padding: '12px'
}));

const HeaderTableCell = styled(StyledTableCell)(({ theme }) => ({
  backgroundColor: '#e8eaf6',
  color: 'black',
  textAlign: 'center'
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover
  }
}));

function EvaluationPhasesNonCadre() {
  const [formTemplate, setFormTemplate] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const { userId, evalId } = useParams();
  const [historyByPhase, setHistoryByPhase] = useState([]);
  const [activePhase, setActivePhase] = useState('Fixation');
  const [indicatorsSum, setIndicatorsSum] = useState([]);
  const [competenceAvg, setCompetenceAvg] = useState([]);
  const [indicatorAvg, setIndicatorAvg] = useState([]);
  const [scoreData, setScoreData] = useState(null);
  const [evaluationDetails, setEvaluationDetails] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userNon = user.name || 'Utilisateur';
  const poste = user.poste || 'N/A';
  const departement = user.department || 'N/A';
  const superiorName = user.superiorName || 'N/A';
  const superiorId = user.superiorId || null; // Assurez-vous que superiorId est disponible

  const printRef = useRef();
  const [canDownload, setCanDownload] = useState(false);
  const HABILITATION_DOWNLOAD = 28;

  const [helpContents, setHelpContents] = useState([]);
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState(''); // Ajouté pour gérer les messages d'erreur

  const [managerDetail, setManagerDetail] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState(null);

  const phases = ['Fixation Objectif', 'Mi-Parcours', 'Finale'];

  const groupedIndicators =
    historyByPhase?.indicators?.reduce((acc, indicator) => {
      if (!acc[indicator.name]) {
        acc[indicator.name] = [];
      }
      acc[indicator.name].push(indicator);
      return acc;
    }, {}) || {};

  const fetchHelpContents = async () => {
    try {
      const response = await formulaireInstance.get(`/Archive/GetHistoryUserHelpContents`, {
        params: { userId: userId, evaluationId: evalId }
      });
      setHelpContents(response.data);
    } catch (err) {
      setErrorMessage(err.response?.data?.Message || "Erreur lors de la récupération des contenus d'aide."); // Utilisation correcte de setErrorMessage
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

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const Templateresponse = await formulaireInstance.get('/Template/NonCadreTemplate');
        const { templateId } = Templateresponse.data;
        setTemplateId(templateId);

        const response = await formulaireInstance.get(`/Template/NonCadreTemplate/${templateId}`);
        console.log('API Response:', response.data);
        setFormTemplate(response.data);
      } catch (error) {
        console.error('Error fetching form template:', error);
        setErrorMessage('Erreur lors du chargement du template.'); // Gestion des erreurs
      }
    };
    fetchTemplate();
  }, [templateId]);

  useEffect(() => {
    const initialize = async () => {
      await handlePhaseClick('Fixation Objectif'); // Charger la phase "Fixation Objectif" par défaut
      await fetchEvaluationDetails();
      await fetchHelpContents();
      await fetchSignatures(); // Récupérer les signatures après l'initialisation
      await checkPermissions();
      await fetchManagerDetail(superiorId);
    };
    initialize();
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

  const fetchEvaluationDetails = async () => {
    try {
      const response = await formulaireInstance.get(`/Evaluation/${evalId}`);
      if (response && response.data) {
        setEvaluationDetails(response.data);
      } else {
        console.error('Unexpected response structure:', response);
        setErrorMessage("Structure de réponse inattendue pour les détails de l'évaluation.");
      }
    } catch (error) {
      console.error('Error fetching evaluation details:', error);
      setErrorMessage("Erreur lors de la récupération des détails de l'évaluation.");
    }
  };

  const fetchSignatures = async () => {
    // Ne pas afficher d'erreur si les IDs sont manquants, juste ne pas récupérer les signatures
    if (!userId || !superiorId) {
      console.log('userId ou superiorId est manquant. Les signatures ne seront pas récupérées.');
      return;
    }

    try {
      // Récupérer la signature de l'utilisateur
      try {
        const userResponse = await authInstance.get(`/Signature/get-user-signature/${userId}`);
        if (userResponse && userResponse.data && userResponse.data.signature) {
          setUserSignature(userResponse.data.signature);
        }
      } catch (error) {
        console.log('Signature du collaborateur non disponible:', error.message);
        // Ne pas définir d'erreur, juste laisser userSignature à null
      }

      // Récupérer la signature du manager
      try {
        const managerResponse = await authInstance.get(`/Signature/get-user-signature/${superiorId}`);
        if (managerResponse && managerResponse.data && managerResponse.data.signature) {
          setManagerSignature(managerResponse.data.signature);
        }
      } catch (error) {
        console.log('Signature du manager non disponible:', error.message);
        // Ne pas définir d'erreur, juste laisser managerSignature à null
      }
    } catch (error) {
      console.log('Erreur générale lors de la récupération des signatures:', error.message);
      // Ne pas définir d'erreur dans l'état
    }
  };

  const handlePhaseClick = async (phase) => {
    setActivePhase(phase);
    setIsContentVisible(false); // Animation de sortie
    setErrorMessage(''); // Réinitialiser le message d'erreur

    setTimeout(async () => {
      try {
        const historyResponse = await formulaireInstance.get(`/archive/historyNonCadre/${userId}/${evalId}/${phase}`);
        const scoreResponse = await formulaireInstance.get(`/archive/calculateScore/${userId}/${evalId}/${phase}`);
        if (historyResponse?.data) {
          setHistoryByPhase(historyResponse.data);
          setIndicatorsSum(historyResponse.data.indicatorsSum || []);
          setCompetenceAvg(historyResponse.data.competenceAvg || []);
          setIndicatorAvg(historyResponse.data.indicatorAvg || []);
        }
        if (scoreResponse?.data) setScoreData(scoreResponse.data);
      } catch (error) {
        console.error('Error fetching phase data:', error);
        setErrorMessage('Pas de donnée disponible');
      } finally {
        setIsContentVisible(true); // Animation d'entrée
      }
    }, 300); // Temps pour l'animation de sortie
  };

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
  //       pdf.save(`${userNon} formulaire_Non_Cadre.pdf`);
  //     })
  //     .catch((err) => {
  //       console.error('Erreur lors de la génération du PDF', err);
  //       setErrorMessage('Erreur lors de la génération du PDF.');
  //     });
  // };

  const exportPDF = () => {
    const input = printRef.current;
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
  
      // Calculer la hauteur de l'image dans le PDF
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
  
      let heightLeft = imgHeight;
      let position = 0;
  
      // Ajouter la première image
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
  
      // Ajouter des pages supplémentaires si nécessaire
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
  
      pdf.save(`${userNon}_formulaire_Non_Cadre.pdf`);
    }).catch((err) => {
      console.error('Erreur lors de la génération du PDF', err);
      setErrorMessage('Erreur lors de la génération du PDF.');
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
          {phases.map((phase) => (
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
            opacity: isContentVisible ? 1 : 0,
            transform: isContentVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            padding: 2
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
                <Typography variant="h4" align="center" sx={{ backgroundColor: '#e8f2dc', padding: 1, fontWeight: 'bold', mt: 5 }}>
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
                    <Typography variant="body1">
                      {' '}
                      <span style={{ fontWeight: 'bold' }}> Matricule: </span> {user.matricule || 'N/A'}
                    </Typography>
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
                    <Typography variant="body1">
                      {' '}
                      <span style={{ fontWeight: 'bold' }}> Matricule: </span> {managerDetail?.matricule || 'N/A'}
                    </Typography>
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Poste: </span> {managerDetail?.poste}
                    </Typography>
                    <Typography variant="body1">
                      <span style={{ fontWeight: 'bold' }}> Département: </span> {managerDetail?.department}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Table des Indicateurs de Capacités et de Compétences */}
              <TableContainer component={Paper} sx={{ mb: 4, borderRadius: 0 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <HeaderTableCell>INDICATEURS de capacités et de compétences</HeaderTableCell>
                      {formTemplate?.levels?.map((level) => (
                        <HeaderTableCell key={level.levelId}>{level.levelName} %</HeaderTableCell>
                      ))}
                      <HeaderTableCell sx={{ backgroundColor: '#c5cae9', color: 'black' }}>Performance en %</HeaderTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyByPhase?.competences?.map((competence) => {
                      // Trouver la compétence correspondante dans le template pour obtenir les niveaux
                      const templateCompetence = formTemplate?.competences?.find(
                        (templateComp) => templateComp.name === competence.competenceName
                      );

                      return (
                        <StyledTableRow key={competence.historyId}>
                          <StyledTableCell sx={{ fontSize: '0.8rem' }}>{competence.competenceName}</StyledTableCell>
                          {formTemplate?.levels?.map((level) => {
                            // Chercher le niveau correspondant pour chaque compétence dans le template
                            const competenceLevel = templateCompetence?.levels?.find((cl) => cl.levelId === level.levelId);
                            return (
                              <StyledTableCell sx={{ fontSize: '0.8rem' }} key={level.levelId}>
                                {competenceLevel ? competenceLevel.description : '-'}
                              </StyledTableCell>
                            );
                          })}
                          <StyledTableCell sx={{ backgroundColor: '#F9F9F9', textAlign: 'center' }}>
                            {competence.performance !== null ? `${competence.performance}%` : '-'}
                          </StyledTableCell>
                        </StyledTableRow>
                      );
                    })}
                    {/* Ligne pour la pondération totale des indicateurs */}
                    <StyledTableRow>
                      <StyledTableCell colSpan={2} sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#eaf3e0' }}>
                        Pondération totale des indicateurs :{' '}
                        {evaluationDetails?.competenceWeightTotal ? `${evaluationDetails.competenceWeightTotal} %` : '-'}
                      </StyledTableCell>
                      <StyledTableCell colSpan={4} sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#eaf3e0' }}>
                        TOTAL de la performance des indicateur
                      </StyledTableCell>
                      <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#eaf3e0' }}>
                        {scoreData?.competenceAvg ?? '-'} %
                      </StyledTableCell>
                    </StyledTableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Table des Indicateurs Métiers */}
              <TableContainer component={Paper} sx={{ mb: 4, borderRadius: 0 }}>
                <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <HeaderTableCell>INDICATEURS METIERS</HeaderTableCell>
                      <HeaderTableCell>RESULTATS ATTENDUS</HeaderTableCell>
                      <HeaderTableCell>RESULTATS en % d'atteinte sur 100%</HeaderTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(groupedIndicators).map(([indicatorName, indicators]) => (
                      <React.Fragment key={indicatorName}>
                        {indicators.map((indicator, index) => (
                          <TableRow key={`${indicatorName}-${index}`}>
                            {index === 0 && <StyledTableCell rowSpan={indicators.length + 1}>{indicatorName}</StyledTableCell>}
                            <StyledTableCell>{indicator.resultText ? indicator.resultText : ' -'}</StyledTableCell>
                            <StyledTableCell>{indicator.result !== null ? `${indicator.result}%` : ' - '}</StyledTableCell>
                          </TableRow>
                        ))}
                        {/* Ligne de somme pour chaque indicatorName */}
                        <TableRow>
                          <StyledTableCell colSpan={1} sx={{ fontWeight: 'bold', backgroundColor: '#E8EAF6' }}>
                            Total
                          </StyledTableCell>
                          <StyledTableCell sx={{ fontWeight: 'bold', backgroundColor: '#E8EAF6' }}>
                            {indicatorsSum.find((sum) => sum.name === indicatorName)?.totalResult !== undefined
                              ? `${indicatorsSum.find((sum) => sum.name === indicatorName).totalResult}%`
                              : '- '}
                          </StyledTableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                    {/* Ligne pour la performance totale */}
                    <StyledTableRow>
                      <StyledTableCell colSpan={1} sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#eaf3e0' }}>
                        TOTAL de la performance des indicateurs :{' '}
                        {evaluationDetails?.indicatorWeightTotal ? `${evaluationDetails.indicatorWeightTotal} %` : '-'}
                      </StyledTableCell>
                      <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#eaf3e0' }}>
                        TOTAL de la performance des indicateur
                      </StyledTableCell>
                      <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#eaf3e0' }}>
                        {scoreData?.indicatorAvg ?? '-'} %
                      </StyledTableCell>
                    </StyledTableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Ligne de Pondération Totale et Performance du Contrat d'Objectifs */}
              <TableContainer component={Paper} sx={{ borderRadius: 0, mt: 5 }}>
                <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <TableBody>
                    <StyledTableRow>
                      <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#fff9d1' }}>
                        TOTAL pondération :{' '}
                        {formTemplate?.competenceWeightTotal != null && formTemplate?.indicatorWeightTotal != null
                          ? `${formTemplate.competenceWeightTotal + formTemplate.indicatorWeightTotal} %`
                          : '-'}
                      </StyledTableCell>
                      <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#fff9d1' }}>
                        PERFORMANCE du contrat d'objectifs
                      </StyledTableCell>
                      <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#eaf3e0' }}>
                        {scoreData?.score ?? '-'} %
                      </StyledTableCell>
                    </StyledTableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Affichage des Contenus d'Aide pour la phase Finale */}
              {activePhase === 'Finale' && helpContents.length > 0 && (
                <MainCard sx={{ mt: 3, p: 2, backgroundColor: '#E8F5E9' }}>
                  <Typography variant="h5" sx={{ color: '#2E7D32', mb: 2 }}>
                    Contenus d'Aides Archivés
                  </Typography>
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    {helpContents.map((help) => (
                      <Box key={help.ContentId} sx={{ border: '1px solid #C8E6C9', borderRadius: 2, p: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#2E7D32', mb: 1 }}>
                          {help.helpName}
                        </Typography>
                        <Typography variant="body2">{help.content || 'Aucun contenu disponible.'}</Typography>
                        <Typography variant="caption" sx={{ color: '#757575' }}>
                          Écrit par : {help.writerUserName}, le{' '}
                          {new Date(help.archivedAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </MainCard>
              )}

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
                                : '-'}
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
                                : '-'}
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
                                : '-'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              {/* Affichage des Signatures */}
              <Grid container sx={{ mt: 2 }} spacing={4}>
                <Grid item xs={6} sx={{ textAlign: 'center' }}>
                  <Typography variant="body1">Signature Collaborateur</Typography>
                  <Box sx={{ height: '100px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption">Signature indisponible</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'center' }}>
                  <Typography variant="body1">Signature Manager</Typography>
                  <Box sx={{ height: '100px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption">Signature indisponible</Typography>
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

export default EvaluationPhasesNonCadre;
