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
import { authInstance, formulaireInstance } from '../../../../../axiosConfig';
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

function AllNonCadreArchive() {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userConnected = user.id;
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

  const [userDetails, setUserDetails] = useState(null);

  const [helpContents, setHelpContents] = useState([]);

  const phases = ['Fixation Objectif', 'Mi-Parcours', 'Finale'];
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [superiorId, setSuperiorId] = useState(null);

  const [canDownload, setCanDownload] = useState(false);
  const HABILITATION_DOWNLOAD = 28;

  const printRef = useRef();

  const groupedIndicators =
    historyByPhase?.indicators?.reduce((acc, indicator) => {
      if (!acc[indicator.name]) {
        acc[indicator.name] = [];
      }
      acc[indicator.name].push(indicator);
      return acc;
    }, {}) || {};

  // Ajout des états pour les messages d'erreur et les signatures
  const [errorMessage, setErrorMessage] = useState('');
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
      setError(typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : 'Erreur lors de la vérification des autorisations.');
    }
  };

  const fetchHelpContents = async () => {
    try {
      const response = await formulaireInstance.get(`/Archive/GetHistoryUserHelpContents`, {
        params: { userId: userId, evaluationId: evalId }
      });
      setHelpContents(response.data);
    } catch (err) {
      setErrorMessage(err.response?.data?.Message || "Erreur lors de la récupération des contenus d'aide.");
    }
  };

  // Correction de l'utilisation de useEffect pour éviter la boucle infinie
  useEffect(() => {
    const fetchTemplateId = async () => {
      try {
        const Templateresponse = await formulaireInstance.get('/Template/NonCadreTemplate');
        const { templateId } = Templateresponse.data;
        setTemplateId(templateId);
      } catch (error) {
        console.error('Error fetching template ID:', error);
        setErrorMessage('Erreur lors du chargement du template.');
      }
    };
    fetchTemplateId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Exécuter une seule fois lors du montage

  useEffect(() => {
    if (templateId) {
      const fetchTemplateDetails = async () => {
        try {
          const response = await formulaireInstance.get(`/Template/NonCadreTemplate/${templateId}`);
          console.log('API Response:', response.data);
          setFormTemplate(response.data);
        } catch (error) {
          console.error('Error fetching form template:', error);
          setErrorMessage('Erreur lors du chargement des détails du template.');
        }
      };
      fetchTemplateDetails();
    }
  }, [templateId]);

  const fetchUserDetails = async () => {
    try {
      const response = await authInstance.get(`/User/user/${userId}`);
      if (response && response.data) {
        setUserDetails(response.data); // Mettre à jour les détails utilisateur
        setSuperiorId(response.data.superiorId);
        console.log(response.data);
        return response.data.superiorId; // Retourner le superiorId
      } else {
        console.error('Unexpected response structure:', response);
        setErrorMessage('Structure de réponse inattendue pour les détails utilisateur.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setErrorMessage('Erreur lors de la récupération des détails utilisateur.');
      return null;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const supId = await fetchUserDetails();
      if (supId) {
        await handlePhaseClick('Fixation Objectif');
        await fetchEvaluationDetails();
        await fetchHelpContents();
        // Supprimer cette ligne : await fetchSignatures(supId);
        await checkPermissions();
        await fetchManagerDetail(supId);
      }
    };
    initialize();
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

  // Modification de fetchSignatures pour accepter superiorId en paramètre
  // const fetchSignatures = async (supId) => {
  //   if (!userId || !supId) {
  //     console.error('userId ou supId est manquant.');
  //     setErrorMessage('Informations utilisateur manquantes pour récupérer les signatures.');
  //     return;
  //   }
  //   try {
  //     // Récupérer la signature de l'utilisateur
  //     const userResponse = await authInstance.get(`/Signature/get-user-signature/${userId}`);
  //     if (userResponse && userResponse.data) {
  //       setUserSignature(userResponse.data.signature);
  //     } else {
  //       console.error("Structure de réponse inattendue pour la signature de l'utilisateur:", userResponse);
  //       setErrorMessage('Signature du collaborateur indisponible.');
  //     }

  //     // Récupérer la signature du manager
  //     const managerResponse = await authInstance.get(`/Signature/get-user-signature/${supId}`);
  //     if (managerResponse && managerResponse.data) {
  //       setManagerSignature(managerResponse.data.signature);
  //     } else {
  //       console.error('Structure de réponse inattendue pour la signature du manager:', managerResponse);
  //       setErrorMessage('Signature du manager indisponible.');
  //     }
  //   } catch (error) {
  //     console.error('Erreur lors de la récupération des signatures:', error);
  //     setErrorMessage('Erreur lors de la récupération des signatures.');
  //   }
  // };

  // const handlePhaseClick = async (phase) => {
  //   setActivePhase(phase);
  //   setIsContentVisible(false); // Animation de sortie
  //   setErrorMessage(''); // Réinitialiser le message d'erreur

  //   setTimeout(async () => {
  //     try {
  //       const historyResponse = await formulaireInstance.get(`/archive/historyNonCadre/${userId}/${evalId}/${phase}`);
  //       const scoreResponse = await formulaireInstance.get(`/archive/calculateScore/${userId}/${evalId}/${phase}`);
  //       if (historyResponse?.data) {
  //         setHistoryByPhase(historyResponse.data);
  //         setIndicatorsSum(historyResponse.data.indicatorsSum || []);
  //         setCompetenceAvg(historyResponse.data.competenceAvg || []);
  //         setIndicatorAvg(historyResponse.data.indicatorAvg || []);
  //       }
  //       if (scoreResponse?.data) setScoreData(scoreResponse.data);
  //     } catch (error) {
  //       console.error('Error fetching phase data:', error);
  //       setErrorMessage('Pas encore de donnée disponible');
  //     } finally {
  //       setIsContentVisible(true); // Animation d'entrée
  //     }
  //   }, 300); // Temps pour l'animation de sortie
  // };

  const handlePhaseClick = async (phase) => {
    setActivePhase(phase);
    setIsContentVisible(false); // Animation de sortie
    setErrorMessage(''); // Réinitialiser le message d'erreur

    setTimeout(async () => {
      try {
        const historyResponse = await formulaireInstance.get(`/archive/historyNonCadre/${userId}/${evalId}/${phase}`);
        const scoreResponse = await formulaireInstance.get(`/archive/calculateScore/${userId}/${evalId}/${phase}`);

        // Vérifier si historyResponse contient des données et si indicatorsSum est disponible
        if (historyResponse?.data) {
          const { indicatorsSum, competenceAvg, indicatorAvg } = historyResponse.data;

          // Vérifier si indicatorsSum existe et n'est pas vide
          if (indicatorsSum && indicatorsSum.length > 0) {
            setHistoryByPhase(historyResponse.data);
            setIndicatorsSum(indicatorsSum);
            setCompetenceAvg(competenceAvg || []);
            setIndicatorAvg(indicatorAvg || []);
          } else {
            // Si indicatorsSum n'est pas disponible, définir le message d'erreur
            setErrorMessage('Pas de donnée disponible');
            // Optionnel : Réinitialiser les états liés aux données précédentes
            setHistoryByPhase([]);
            setIndicatorsSum([]);
            setCompetenceAvg([]);
            setIndicatorAvg([]);
          }
        } else {
          // Si historyResponse.data n'existe pas, définir le message d'erreur
          setErrorMessage('Pas de donnée disponible');
        }

        // Vérifier scoreResponse indépendamment
        if (scoreResponse?.data) {
          setScoreData(scoreResponse.data);
        } else {
          // Si scoreResponse.data n'existe pas, vous pouvez également définir un message d'erreur si nécessaire
          // setErrorMessage('Score non disponible');
        }
      } catch (error) {
        console.error('Error fetching phase data:', error);
        setErrorMessage('Pas encore de donnée disponible');
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
  //       pdf.save(`${userDetails?.name || 'utilisateur'}_formulaire_Non_Cadre.pdf`);
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
  
      // Calculer le ratio entre le canvas et le PDF
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const totalPages = Math.ceil(imgHeight / pdfHeight);
  
      for (let page = 0; page < totalPages; page++) {
        const sourceY = page * pdfHeight * (canvas.height / imgHeight);
        const destY = 0;
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = pdfHeight * (canvas.width / imgWidth);
        const ctx = pageCanvas.getContext('2d');
  
        // Dessiner la portion du canvas original dans le nouveau canvas
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          pageCanvas.height,
          0,
          destY,
          canvas.width,
          pageCanvas.height
        );
  
        const pageImgData = pageCanvas.toDataURL('image/png');
  
        if (page > 0) {
          pdf.addPage();
        }
  
        pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, (pageCanvas.height * imgWidth) / pageCanvas.width);
      }
  
      const sanitizedUserName = (userDetails?.name || 'utilisateur').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pdf.save(`${sanitizedUserName}_formulaire_Non_Cadre.pdf`);
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
          {/* Affichage des messages d'erreur */}
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
                      <span style={{ fontWeight: 'bold' }}> Nom: </span> {userDetails?.name || 'N/A'}
                    </Typography>
                    <Typography variant="body1">
                      {' '}
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
                      <span style={{ fontWeight: 'bold' }}> Nom: </span> {userDetails?.superiorName || 'N/A'}
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
                        TOTAL de la performance des indicateurs
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
                        TOTAL de la performance des indicateurs
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
                    {/* Case vide - pas de signature */}
                  </Box>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'center' }}>
                  <Typography variant="body1">Signature Manager</Typography>
                  <Box sx={{ height: '100px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Case vide - pas de signature */}
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

export default AllNonCadreArchive;
