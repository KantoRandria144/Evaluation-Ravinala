import React, { useEffect, useState } from 'react';
import { formulaireInstance, authInstance } from '../../../../axiosConfig';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Grid,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

function CollabNFi() {
  // Récupération des informations de l'utilisateur depuis le localStorage
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user.id;
  const type = user.typeUser;
  const managerId = user.superiorId;

  // États pour les templates et évaluations
  const [templateId, setTemplateId] = useState(null);
  const [evaluationId, setEvaluationId] = useState(null);

  // États pour les indicateurs
  const [indicators, setIndicators] = useState([]);
  const [results, setResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [hasUserData, setHasUserData] = useState(false);
  const [isValidate, setIsValidate] = useState(false);

  // États pour les aides
  const [helpsToFill, setHelpsToFill] = useState([]); // Aides que l'utilisateur doit remplir
  const [managerHelpContents, setManagerHelpContents] = useState([]); // Aides fournies par le manager
  const [loadingHelpsToFill, setLoadingHelpsToFill] = useState(false);
  const [loadingManagerHelps, setLoadingManagerHelps] = useState(false);
  const [errorHelpsToFill, setErrorHelpsToFill] = useState('');
  const [errorManagerHelps, setErrorManagerHelps] = useState('');

  // État pour les commentaires de l'utilisateur sur les aides à remplir
  const [userHelpInputs, setUserHelpInputs] = useState({}); // { helpId: comment }

  // États pour la gestion des signatures
  const [signatureFile, setSignatureFile] = useState(null);
  const [openSignatureModal, setOpenSignatureModal] = useState(false);
  const [openNoSignatureModal, setOpenNoSignatureModal] = useState(false);

  const navigate = useNavigate();

  // Fonctions pour ouvrir et fermer le modal de signature
  const handleOpenSignatureModal = () => {
    setOpenSignatureModal(true);
  };

  const handleCloseSignatureModal = () => {
    setOpenSignatureModal(false);
  };

  // Fonction pour gérer le changement de fichier de signature
  const handleSignatureFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSignatureFile(e.target.files[0]);
    }
  };

  // Fonction pour récupérer les aides que l'utilisateur doit remplir
  const fetchHelpsToFill = async () => {
    setLoadingHelpsToFill(true);
    try {
      const response = await formulaireInstance.get('/Archive/HelpsByAllowedUserLevel/1');
      console.log(response.data);
      setHelpsToFill(response.data);
      setLoadingHelpsToFill(false);
    } catch (error) {
      //   setErrorHelpsToFill('Erreur lors de la récupération des aides à remplir.');
      setLoadingHelpsToFill(false);
    }
  };

  // Fonction pour récupérer les aides fournies par le manager
  const fetchManagerHelpContents = async () => {
    setLoadingManagerHelps(true);
    try {
      const response = await formulaireInstance.get('/Evaluation/GetUserHelpContents', {
        params: {
          userId: userId, // ID de l'utilisateur
          type: type, // Type d'évaluation, par ex. 'NonCadre'
          writerUserId: managerId // ID du manager (WriterUserId)
        }
      });
      const managerHelpContentsData = response.data;
      console.log(managerHelpContentsData);
      setManagerHelpContents(managerHelpContentsData);
      setLoadingManagerHelps(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des contenus d'aide du manager:", error);
      setErrorManagerHelps("Erreur lors de la récupération des contenus d'aide du manager.");
      setLoadingManagerHelps(false);
    }
  };

  // Fonction pour récupérer le template détaillé
  const fetchDetailedTemplate = async (templateId) => {
    try {
      const evaluationResponse = await formulaireInstance.get(`/Evaluation/enCours/${type}`);
      const evalId = evaluationResponse.data;
      setEvaluationId(evalId);

      const response = await formulaireInstance.get(`/Template/NonCadreTemplate/${templateId}`);
      const { indicators: fetchedIndicators } = response.data;
      setIndicators(fetchedIndicators);

      const initialResults = fetchedIndicators.map((indicator) => ({
        indicatorId: indicator.indicatorId,
        userIndicatorId: 0,
        indicatorName: '',
        results: Array.from({ length: indicator.maxResults }, () => ({
          resultId: 0,
          resultText: '',
          result: '' // Initialisé à '' au lieu de 0
        }))
      }));
      setResults(initialResults);
    } catch (error) {
      setErrorMessage('Erreur lors de la récupération des indicateurs.');
    }
  };

  // Fonction pour récupérer la période actuelle
  const fetchCurrentPeriod = async () => {
    try {
      const periodResponse = await formulaireInstance.get('/Periode/periodeActel', {
        params: { type: 'NonCadre' }
      });
      if (periodResponse.data.length > 0) {
        setCurrentPeriod(periodResponse.data[0].currentPeriod);
      }
    } catch (error) {
      setErrorMessage('Erreur lors de la récupération de la période actuelle.');
    }
  };

  // Fonction pour récupérer les indicateurs utilisateur
  const fetchUserIndicators = async () => {
    try {
      const userIndicatorsResponse = await formulaireInstance.get('/Evaluation/IndicatorValidateByUser', {
        params: {
          userId: userId,
          type: type
        }
      });

      const userIndicators = userIndicatorsResponse.data;
      if (userIndicators && userIndicators.length > 0) {
        setHasUserData(true);

        const filledResults = indicators.map((indicator) => {
          const userIndicator = userIndicators.find((ui) => ui.indicatorId === indicator.indicatorId);
          if (userIndicator) {
            return {
              indicatorId: indicator.indicatorId,
              userIndicatorId: userIndicator.userIndicatorId,
              indicatorName: userIndicator.name,
              results: userIndicator.results.map((r) => ({
                resultId: r.resultId,
                resultText: r.resultText,
                result: r.result === 0 || r.result === '0.00' ? '' : r.result.toString()
              }))
            };
          } else {
            return {
              indicatorId: indicator.indicatorId,
              userIndicatorId: 0,
              indicatorName: '',
              results: Array.from({ length: indicator.maxResults }, () => ({
                resultId: 0,
                resultText: '',
                result: ''
              }))
            };
          }
        });

        setResults(filledResults);
      } else {
        setHasUserData(false);
      }
    } catch (err) {
      setHasUserData(false);
      if (err.response && err.response.status !== 404) {
        console.error('Erreur lors de la récupération des indicateurs utilisateur:', err);
      }
    }
  };

  // Fonction pour vérifier si l'utilisateur a validé ses indicateurs
  const checkIfValidated = async () => {
    try {
      const response = await formulaireInstance.get('/Evaluation/GetHistoryUserindicatorFi', {
        params: {
          userId: userId,
          type: type
        }
      });

      if (response.data) {
        const indicators = response.data;
        const hasIndicators = Array.isArray(indicators) && indicators.length > 0;

        if (hasIndicators) {
          setIsValidate(true);
        } else {
          setIsValidate(false);
        }
      } else {
        setIsValidate(false);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setIsValidate(false);
      } else {
        console.error('Erreur lors de la vérification de la validation utilisateur:', err);
      }
    }
  };

  const checkIfUserValidated = async () => {
    await checkIfValidated();
  };

  // Fonction pour initialiser le template et récupérer les données nécessaires
  useEffect(() => {
    const initializeTemplate = async () => {
      try {
        await checkIfUserValidated();

        const response = await formulaireInstance.get('/Template/NonCadreTemplate');
        const tempId = response.data.templateId;
        setTemplateId(tempId);

        await fetchDetailedTemplate(tempId);
        await fetchCurrentPeriod();
        await fetchHelpsToFill();
        await fetchManagerHelpContents(); // Récupérer les contenus d'aide du manager
      } catch (error) {
        setErrorMessage(error.message);
      }
    };

    initializeTemplate();
  }, []);

  // Récupérer les indicateurs utilisateur une fois que les indicateurs du template sont chargés
  useEffect(() => {
    if (indicators.length > 0) {
      fetchUserIndicators();
    }
  }, [indicators]);

  // Fonction pour gérer le changement de nom d'indicateur (si nécessaire)
  const handleIndicatorNameChange = (indicatorId, value) => {
    setResults((prevResults) =>
      prevResults.map((result) => (result.indicatorId === indicatorId ? { ...result, indicatorName: value } : result))
    );
  };

  // Fonction pour gérer le changement de texte de résultat
  const handleResultChange = (indicatorId, index, value) => {
    setResults((prevResults) =>
      prevResults.map((result) =>
        result.indicatorId === indicatorId
          ? {
              ...result,
              results: result.results.map((res, i) => (i === index ? { ...res, resultText: value } : res))
            }
          : result
      )
    );
  };

  // Fonction pour gérer le changement de nombre de résultat
  const handleResultNumberChange = (indicatorId, index, value) => {
    // Valider que la valeur est un nombre ou vide
    if (!/^[0-9.,]*$/.test(value)) {
      return; // Ignore les entrées non numériques
    }

    // Remplacer les virgules par des points pour la compatibilité décimale
    const formattedValue = value.replace(',', '.');

    setResults((prevResults) =>
      prevResults.map((result) =>
        result.indicatorId === indicatorId
          ? {
              ...result,
              results: result.results.map((res, i) => (i === index ? { ...res, result: formattedValue } : res))
            }
          : result
      )
    );
  };

  // Fonction pour gérer le changement de commentaire de l'utilisateur sur une aide à remplir
  const handleUserHelpInputChange = (helpId, value) => {
    setUserHelpInputs((prevInputs) => ({
      ...prevInputs,
      [helpId]: value
    }));
  };

  const validateFinalObjectifHistory = async () => {
    try {
      // Vérifier si le fichier de signature est fourni
      if (!signatureFile) {
        alert('Veuillez fournir un fichier de signature avant de mettre à jour vos objectifs.');
        handleOpenSignatureModal();
        return;
      }

      // Convertir le fichier de signature en base64
      const base64Signature = await convertFileToBase64(signatureFile);

      // Comparer la signature
      const compareResponse = await authInstance.post(`/Signature/compare-user-signature/${userId}`, {
        ImageBase64: base64Signature
      });

      if (!compareResponse.data.isMatch) {
        alert('Votre signature ne correspond pas à celle enregistrée. Veuillez réessayer.');
        handleOpenSignatureModal();
        return;
      }

      // Préparer les données des indicateurs au format requis par le backend
      const indicatorsPayload = results.map((indicator) => ({
        indicatorId: indicator.indicatorId,
        indicatorName: indicator.indicatorName || 'N/A',
        results: indicator.results
          .filter((res) => res.resultText && res.resultText.trim() !== '')
          .map((res) => ({
            resultText: res.resultText,
            result: res.result === '' ? 0 : parseFloat(res.result)
          }))
      }));

      // Préparer le payload pour l'API (seulement les indicateurs)
      const payload = indicatorsPayload;

      console.log('Payload envoyé au backend:', payload);

      // Construire l'URL avec les paramètres
      const validateUrl = `/Evaluation/ValidateIndicatorFiHistory?userId=${userId}&validateUserId=${managerId}&type=${type}`;

      // Envoyer les indicateurs au backend via un seul appel API
      const validateResponse = await formulaireInstance.post(validateUrl, payload);

      console.log('Réponse de la validation:', validateResponse.data);

      // Préparer les données des aides avec les inputs dans le format requis
      const helpContents = helpsToFill.map((help) => ({
        userId: userId,
        writerUserId: managerId,
        type: type,
        helpId: help.helpId,
        content: userHelpInputs[help.helpId] || ''
      }));
      console.log('Aides à envoyer:', helpContents);

      // Envoyer les aides avec les contenus au backend
      if (helpContents.length > 0) {
        const helpResponse = await insertHelpContentsAndArchive(helpContents);
        console.log('Réponse des aides:', helpResponse);
        // Récupérer les contenus d'aide mis à jour depuis le backend
        await fetchManagerHelpContents();
      }

      alert('Objectifs et aides mis à jour avec succès !');
      // window.location.reload(); // Supprimé pour éviter le rechargement
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des objectifs :', error);
      alert(error.response?.data?.Message || error.message || 'Une erreur est survenue lors de la mise à jour.');
    }
  };

  // Fonction pour insérer les aides avec le nouvel endpoint
  const insertHelpContentsAndArchive = async (helpContents) => {
    try {
      const response = await formulaireInstance.post('/Evaluation/InsertHelpContents', helpContents);
      console.log(response);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Erreur lors de l'insertion des aides.");
    }
  };

  // Fonction pour convertir un fichier en base64
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <Box p={3}>
      {/* Affichage d'un message si l'utilisateur n'a pas encore validé ses objectifs */}
      {!hasUserData && <Alert severity="info">Vous n'avez pas encore validé vos objectifs.</Alert>}

      {/* Section des Indicateurs */}
      {indicators.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              Indicateurs
            </Typography>

            {/* Tableau des Indicateurs */}
            <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0' }}>
              <Table>
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
                      <strong>Objectif</strong>
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 'bold',
                        color: '#333333',
                        textAlign: 'left',
                        borderRight: '1px solid rgba(224, 224, 224, 1)',
                        width: '35%'
                      }}
                    >
                      <strong>Résultat (Texte)</strong>
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 'bold',
                        color: '#333333',
                        textAlign: 'left',
                        borderRight: '1px solid rgba(224, 224, 224, 1)',
                        width: '5%'
                      }}
                    >
                      <strong>Valeur</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((indicator) => {
                    // Filtrer les résultats avec un resultText non vide
                    const filteredResults = indicator.results.filter((res) => res.resultText && res.resultText.trim() !== '');

                    // Si aucun résultat valide, afficher une ligne avec 'N/A'
                    if (filteredResults.length === 0) {
                      return (
                        <TableRow key={indicator.indicatorId}>
                          <TableCell>{indicator.indicatorName || 'N/A'}</TableCell>
                          <TableCell>N/A</TableCell>
                          <TableCell>N/A</TableCell>
                        </TableRow>
                      );
                    }

                    return filteredResults.map((res, idx) => (
                      <TableRow key={`${indicator.indicatorId}-${res.resultId || idx}`}>
                        {/* La cellule de l'indicateur ne s'affiche que sur la première ligne de résultat */}
                        {idx === 0 && (
                          <TableCell
                            rowSpan={filteredResults.length}
                            sx={{
                              borderRight: '1px solid rgba(224, 224, 224, 1)',
                              width: '25%'
                            }}
                          >
                            {indicator.indicatorName || 'N/A'}
                          </TableCell>
                        )}
                        <TableCell
                          sx={{
                            borderRight: '1px solid rgba(224, 224, 224, 1)',
                            width: '35%'
                          }}
                        >
                          {res.resultText}
                        </TableCell>
                        <TableCell
                          sx={{
                            borderRight: '1px solid rgba(224, 224, 224, 1)',
                            width: '5%'
                          }}
                        >
                          <Box
                            sx={{
                              backgroundColor: res.result ? (res.result >= 50 ? '#E8EAF6' : 'rgba(244, 67, 54, 0.1)') : 'transparent',
                              color: res.result ? (res.result >= 50 ? 'primary.main' : 'error.main') : 'inherit',
                              padding: res.result ? '8px 16px' : '0',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}
                          >
                            <Typography>{res.result ? `${res.result} %` : ''}</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Section des Aides Fournies par le Manager */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Aides Fournies par le Manager
          </Typography>

          {/* Tableau des Aides Fournies par le Manager */}
          <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell
                    sx={{
                      fontWeight: 'bold',
                      color: '#333333',
                      textAlign: 'left',
                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                      width: '37%'
                    }}
                  >
                    Label
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 'bold',
                      color: '#333333',
                      textAlign: 'left',
                      borderRight: '1px solid rgba(224, 224, 224, 1)',
                      width: '62%'
                    }}
                  >
                    Contenue
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingManagerHelps ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : errorManagerHelps ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="error">{errorManagerHelps}</Typography>
                    </TableCell>
                  </TableRow>
                ) : managerHelpContents.length > 0 ? (
                  managerHelpContents.map((helpContent) => (
                    <TableRow key={helpContent.helpId}>
                      <TableCell
                        sx={{
                          borderRight: '1px solid rgba(224, 224, 224, 1)',
                          width: '37%'
                        }}
                      >
                        {helpContent.name || 'N/A'}
                      </TableCell>
                      <TableCell>{helpContent.content || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Aucune aide fournie par le manager.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Section des Aides à Remplir */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Aides à Remplir
          </Typography>

          {/* Tableau des Aides à Remplir */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nom de l'Aide</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Commentaire</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingHelpsToFill ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : errorHelpsToFill ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography color="error">{errorHelpsToFill}</Typography>
                    </TableCell>
                  </TableRow>
                ) : helpsToFill.length > 0 ? (
                  helpsToFill.map((help) => (
                    <TableRow key={help.helpId}>
                      <TableCell>{help.name}</TableCell>
                      <TableCell>{help.description}</TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          label="Commentaire"
                          value={userHelpInputs[help.helpId] || ''}
                          onChange={(e) => handleUserHelpInputChange(help.helpId, e.target.value)}
                          variant="outlined"
                          multiline
                          rows={3}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      Aucune aide à remplir pour le moment.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Afficher les messages d'erreur si présents */}
      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      )}
      {(errorHelpsToFill || errorManagerHelps) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorHelpsToFill || errorManagerHelps}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          color="success"
          disabled={isValidate}
          onClick={() => {
              if (!signatureFile) {
                handleOpenSignatureModal();
              } else {
                validateFinalObjectifHistory();
              }
          }}
          sx={{ textTransform: 'none', fontWeight: 'bold' }}
        >
          {isValidate ? 'Déjà validé' : 'Valider'}
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
              handleCloseSignatureModal();
              // Appeler la validation finale
              validateFinalObjectifHistory();
            }}
            variant="contained"
            color="primary"
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal pour la signature manquante */}
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
    </Box>
  );
}

export default CollabNFi;
