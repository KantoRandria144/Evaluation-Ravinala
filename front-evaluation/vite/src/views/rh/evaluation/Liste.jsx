import React, { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Typography,
  Button,
  Alert,
  TablePagination,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';

import { formulaireInstance } from '../../../axiosConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useNavigate } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import AuditService from '../../../services/AuditService';

const Liste = ({ isDataUpdated }) => {
  const creer = 1;
  const en_cours = 2;
  const cloturer = 3;

  // Données générales
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [evalAnneeFilter, setEvalAnneeFilter] = useState('');
  // On utilise un SELECT pour le type
  const [typeFilter, setTypeFilter] = useState('');

  // Pagination (TablePagination)
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(2);

  // Édition
  const [editingEvaluationId, setEditingEvaluationId] = useState(null);
  const [editableEvaluation, setEditableEvaluation] = useState({});

  // Droits
  const [canAdd, setCanAdd] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const HABILITATION_ADD = 12;
  const HABILITATION_EDIT = 13;

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;
  // Vérifier les habilitations
  const checkPermissions = async () => {
    try {
      const addResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${HABILITATION_ADD}`
      );
      setCanAdd(addResponse.data.hasAccess);

      const editResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${HABILITATION_EDIT}`
      );
      setCanEdit(editResponse.data.hasAccess);
    } catch (error) {
      const errorData = error.response?.data;
      setError(typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : 'Erreur lors de la vérification des autorisations.');
    }
  };

  // Récupération des données
  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const response = await formulaireInstance.get('/Periode/AllEvaluation');
      setEvaluations(response.data);
      
    } catch (err) {
      const errorData = err.response?.data;
      setError(typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : 'Erreur lors de la récupération des évaluations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPermissions();
    fetchEvaluations();
  }, [isDataUpdated]);

  // --- Gestion du filtrage local sur la liste
  const filteredEvaluations = evaluations.filter((evaluation) => {
    // Filtre par année (evalAnnee)
    const matchesYear = evaluation.evalAnnee?.toString().toLowerCase().includes(evalAnneeFilter.toLowerCase());

    // Filtre par type (et UNIQUEMENT le type, pas le titre)
    // 1) Si le SELECT est vide (value = ''), on ne filtre pas.
    // 2) Sinon on compare le type en minuscules pour faire un match exact.
    const matchesType = !typeFilter || (evaluation.type && evaluation.type.toLowerCase() === typeFilter.toLowerCase());

    return matchesYear && matchesType;
  });

  // --- Pagination : on applique sur le résultat filtré
  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const indexOfLastEvaluation = (currentPage + 1) * rowsPerPage;
  const indexOfFirstEvaluation = indexOfLastEvaluation - rowsPerPage;
  const currentEvaluations = filteredEvaluations.slice(indexOfFirstEvaluation, indexOfLastEvaluation);

  // --- Formatage de date
  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return new Intl.DateTimeFormat('fr-FR', options).format(new Date(dateString));
  };

  // --- Gestion de l'édition
  const handleEditClick = (evaluation) => {
    setEditingEvaluationId(evaluation.evalId);
    setEditableEvaluation({
      evalAnnee: evaluation.evalAnnee,
      fixationObjectif: evaluation.fixationObjectif.split('T')[0],
      miParcours: evaluation.miParcours.split('T')[0],
      final: evaluation.final.split('T')[0],
      templateId: evaluation.templateId,
      titre: evaluation.titre,
      type: evaluation.type,
      classes: evaluation.classes || '' 
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditableEvaluation({ ...editableEvaluation, [name]: value });
  };

  const handleSaveClick = async (evalId) => {
    try {
      
      const currentEvaluation = evaluations.find((evaluation) => evaluation.evalId === evalId);
      const oldValues = currentEvaluation
        ? {
            titre: currentEvaluation.titre,
            evalAnnee: currentEvaluation.evalAnnee,
            fixationObjectif: currentEvaluation.fixationObjectif.split('T')[0],
            miParcours: currentEvaluation.miParcours.split('T')[0],
            final: currentEvaluation.final.split('T')[0],
            templateId: currentEvaluation.templateId,
            type: currentEvaluation.type,
            classes: currentEvaluation.classes, // Ajouter classes ici
          }
        : null;

      await formulaireInstance.put(`Periode/edit/${evalId}?userId=${userId}`, {
        titre: editableEvaluation.titre,
        evalAnnee: editableEvaluation.evalAnnee,
        fixationObjectif: editableEvaluation.fixationObjectif,
        miParcours: editableEvaluation.miParcours,
        final: editableEvaluation.final,
        templateId: editableEvaluation.templateId,
        type: editableEvaluation.type,
        classes: editableEvaluation.classes, 
      });

      await AuditService.logAction(
        userId,
        `Modification de la période d'évaluation avec evalId: ${evalId}`,
        'Update',
        null,
        oldValues,
        { ...editableEvaluation }
      );

      fetchEvaluations();
      setEditingEvaluationId(null);
      setError(null);
    } catch (error) {
      console.error('Error saving evaluation:', error);
      const errorData = error.response?.data;
      setError(
        typeof errorData === 'object'
          ? JSON.stringify(errorData, null, 2)
          : "Erreur lors de la sauvegarde de l'évaluation."
      );
    }
  };

  const handleCancelClick = () => {
    setEditingEvaluationId(null);
    setEditableEvaluation({});
  };

  // --- Fonctions d'action sur l'évaluation
  const debuterEvaluation = async (evalId) => {
    try {

      await formulaireInstance.put(`/Evaluation/start/${evalId}`);

      // Log the new state (etatId changes to en_cours, which is 2)
      const newValues = {
        evalId,
        etatId: en_cours,
        etatDesignation: 'En cours',
      };

      await AuditService.logAction(
        userId,
        `Démarrage de la période d'évaluation avec evalId: ${evalId}`,
        'Update',
        null,
        null,
        newValues
      );

      fetchEvaluations();
      setError(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message
        ? error.response.data.message
        : "Erreur lors du démarrage de l'évaluation.";
      setError(errorMessage);
    }
  };

  const cloturerEvaluation = async (evalId) => {
    try {

      await formulaireInstance.put(`/Periode/cloturer/${evalId}`);

      // Log the new state (etatId changes to cloturer, which is 3)
      const newValues = {
        evalId,
        etatId: cloturer,
        etatDesignation: 'Clôturé',
      };

      await AuditService.logAction(
        userId,
        `Clôture de la période d'évaluation avec evalId: ${evalId}`,
        'Update',
        null,
        null,
        newValues
      );

      fetchEvaluations();
      setError(null);
    } catch (error) {
      const errorData = error.response?.data;
      setError(
        typeof errorData === 'object'
          ? JSON.stringify(errorData, null, 2)
          : "Erreur lors de la clôture de l'évaluation."
      );
    }
  };

  const annulerCloturation = async (evalId) => {
    try {

      await formulaireInstance.put(`/Periode/annuler-cloturation/${evalId}`);

      // Log the new state (etatId changes to en_cours, which is 2)
      const newValues = {
        evalId,
        etatId: en_cours,
        etatDesignation: 'En cours',
      };

      await AuditService.logAction(
        userId,
        `Annulation de la clôture de la période d'évaluation avec evalId: ${evalId}`,
        'Update',
        null,
        null,
        newValues
      );

      fetchEvaluations();
      setError(null);
    } catch (error) {
      console.error("Erreur complète :", error);
      const errorMessage =
        error?.response?.data?.message ||
        JSON.stringify(error?.response?.data || error.message || error.toString());
      setError(errorMessage);
    }
  };


  const handleAddClick = () => {
    navigate('/evaluation/ajoutEvaluation');
  };

  return (
    <Paper>
      <MainCard>
        {/* En-tête */}
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="subtitle2">Période</Typography>
            <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
              Liste des périodes d'évaluation
            </Typography>
          </Grid>
          <Grid item>
            {canAdd && (
              <Button variant="contained" onClick={handleAddClick} startIcon={<AddCircleIcon />}>
                Ajouter
              </Button>
            )}
          </Grid>
        </Grid>
      </MainCard>

      {/* Message d'erreur éventuel */}
      {error && (
        <Alert severity="error" style={{ margin: '20px' }}>
          {error}
        </Alert>
      )}

      {/* ---- Filtres (Année & Type) ---- */}
      <Grid container spacing={2} sx={{ padding: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Année"
            variant="outlined"
            size="small"
            fullWidth
            value={evalAnneeFilter}
            onChange={(e) => setEvalAnneeFilter(e.target.value)}
          />
        </Grid>

        {/* SELECT pour le type (Cadre, NonCadre, etc.) */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="select-type-label">Type</InputLabel>
            <Select labelId="select-type-label" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="">-- Tous --</MenuItem>
              <MenuItem value="Cadre">Cadre</MenuItem>
              <MenuItem value="NonCadre">Non-Cadre</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Tableau des évaluations */}
      <TableContainer component="div" sx={{ padding: 2 }}>
        <Table
          aria-label="collapsible table"
          sx={{
            border: '1px solid #e0e0e0',
            borderRadius: '4px'
          }}
        >
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Année
              </TableCell>
              {/* On affiche UNIQUEMENT le titre */}
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Titre
              </TableCell>
              
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Type
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Fixation des objectifs
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Mi-parcours
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Final
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Status
              </TableCell>
              {canEdit && (
                <>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                    Action
                  </TableCell>
                  <TableCell />
                </>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {currentEvaluations.map((evaluation) => (
              <TableRow key={evaluation.evalId}>
                {editingEvaluationId === evaluation.evalId ? (
                  <>
                    {/* --- Mode édition --- */}
                    <TableCell>
                      <TextField
                        size="small"
                        name="evalAnnee"
                        value={editableEvaluation.evalAnnee}
                        onChange={handleInputChange}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        name="titre"
                        value={editableEvaluation.titre}
                        onChange={handleInputChange}
                        placeholder="Titre"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          name="type"
                          value={editableEvaluation.type || ''}
                          onChange={handleInputChange}
                        >
                          <MenuItem value="Cadre">Cadre</MenuItem>
                          <MenuItem value="NonCadre">Non-Cadre</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="date"
                        name="fixationObjectif"
                        value={editableEvaluation.fixationObjectif}
                        onChange={handleInputChange}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="date"
                        name="miParcours"
                        value={editableEvaluation.miParcours}
                        onChange={handleInputChange}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="date"
                        name="final"
                        value={editableEvaluation.final}
                        onChange={handleInputChange}
                      />
                    </TableCell>
                    <TableCell>{evaluation.etatDesignation || 'N/A'}</TableCell>
                    {/* Boutons Sauvegarder / Annuler */}
                    <TableCell>
                      <Button variant="contained" color="primary" onClick={() => handleSaveClick(evaluation.evalId)}>
                        Sauvegarder
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="outlined" color="secondary" onClick={handleCancelClick}>
                        Annuler
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    {/* --- Mode lecture --- */}
                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{evaluation.evalAnnee}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{evaluation.titre || '—'}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{evaluation.type}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{formatDate(evaluation.fixationObjectif)}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{formatDate(evaluation.miParcours)}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{formatDate(evaluation.final)}</TableCell>
                    <TableCell
                      sx={{ borderRight: '1px solid #e0e0e0' }}
                      style={{
                        color: evaluation.etatId === en_cours ? '#fcd53b' : evaluation.etatId === creer ? '#00e676' : 'blue'
                      }}
                    >
                      {evaluation.etatDesignation || 'N/A'}
                    </TableCell>

                    {/* Actions : débuter / clôturer / éditer */}
                    {canEdit && (
                      <>
                        <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                          {evaluation.etatId === creer && (
                            <Button variant="outlined" color="primary" onClick={() => debuterEvaluation(evaluation.evalId)}>
                              Débuter
                            </Button>
                          )}
                          {evaluation.etatId === en_cours && (
                            <Button variant="outlined" color="primary" onClick={() => cloturerEvaluation(evaluation.evalId)}>
                              Clôturer
                            </Button>
                          )}
                          {evaluation.etatId === cloturer && (
                            <Button variant="outlined" color="error" onClick={() => annulerCloturation(evaluation.evalId)}>
                              Annuler la clôture
                            </Button>
                          )}
                        </TableCell>

                        <TableCell>
                          <Tooltip title="Éditer">
                            <span> {/* Correction: wrapper span pour IconButton désactivé */}
                              <IconButton 
                                onClick={() => handleEditClick(evaluation)} 
                                disabled={evaluation.etatId === cloturer}
                              >
                                <FontAwesomeIcon
                                  icon={faEdit}
                                  style={{
                                    color: evaluation.etatId === cloturer ? 'gray' : 'blue',
                                    fontSize: '1rem'
                                  }}
                                />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </>
                    )}
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* TablePagination sur le résultat filtré */}
      <TablePagination
        component="div"
        labelRowsPerPage="Lignes par page :"
        rowsPerPageOptions={[2, 10, 15]}
        count={filteredEvaluations.length}
        rowsPerPage={rowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default Liste;