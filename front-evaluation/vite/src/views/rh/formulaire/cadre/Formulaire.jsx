import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formulaireInstance } from '../../../../axiosConfig';
import MainCard from 'ui-component/cards/MainCard';
import {
  Grid,
  Typography,
  Button,
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  styled,
  Box,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Checkbox,
  Menu,
  MenuItem,
  Icon,
  Snackbar,
  Alert
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DoneIcon from '@mui/icons-material/Done';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Styled components for table cells and rows
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: '1px solid #ddd',
  padding: '8px'
}));

const HeaderTableCell = styled(StyledTableCell)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  fontWeight: 'medium'
}));

const DynamicTableCell = styled(StyledTableCell)(({ theme }) => ({
  border: '1px solid #ddd',
  padding: '8px',
  backgroundColor: '#f8f9fa'
}));

const TotalStyledTableCell = styled(StyledTableCell)(({ theme }) => ({
  backgroundColor: '#e8f2dc',
  fontWeight: 'medium'
}));

const Formulaire = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [templateId, setTemplateId] = useState(null);
  const navigate = useNavigate();
  const [formTemplate, setFormTemplate] = useState(null);
  const [dynamicColumns, setDynamicColumns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isAddPriorityModalOpen, setIsAddPriorityModalOpen] = useState(false);
  const [newPriorityName, setNewPriorityName] = useState('');
  const [newMaxObjectives, setNewMaxObjectives] = useState(0);
  const [isEditIconVisible, setIsEditIconVisible] = useState(false);
  const [isEditPrioritiesModalOpen, setIsEditPrioritiesModalOpen] = useState(false);
  const [editedPriorities, setEditedPriorities] = useState([]);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [inactiveColumns, setInactiveColumns] = useState([]);
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const printRef = useRef();

  const [canEdit, setCanEdit] = useState(false);
  const EDIT_FORM = 10; // Modifier la formulaire d'évaluation

  const checkPermissions = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user.id;

      const editResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${EDIT_FORM}`
      );
      setCanEdit(editResponse.data.hasAccess);
    } catch (error) {
      setErrorMessage(
        typeof error.response?.data === 'object'
          ? JSON.stringify(error.response.data, null, 2)
          : 'Erreur lors de la vérification des autorisations.'
      );
      setOpenSnackbar(true);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    const fetchCadreTemplateId = async () => {
      try {
        const response = await formulaireInstance.get('/Template/CadreTemplate');
        if (response.data?.templateId) {
          setTemplateId(response.data.templateId);
        } else {
          console.error('Template ID for Cadre not found in the response');
        }
      } catch (error) {
        console.error('Error fetching Cadre template ID:', error);
        setErrorMessage('Erreur lors de la récupération de l\'ID du modèle.');
        setOpenSnackbar(true);
      }
    };
    fetchCadreTemplateId();
  }, []);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await formulaireInstance.get(`/Template/${templateId}`);
        setFormTemplate(response.data.template);
        setDynamicColumns(response.data.dynamicColumns);
      } catch (error) {
        console.error('Error fetching form template:', error);
        setErrorMessage('Erreur lors de la récupération du modèle de formulaire.');
        setOpenSnackbar(true);
      }
    };
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const handleEditClick = () => {
    if (isEditing) {
      setIsEditIconVisible(false);
      setIsEditing(false);
    } else {
      setIsEditIconVisible(true);
      setIsEditing(true);
    }
  };

  const fetchAllPriorities = async () => {
    try {
      const response = await formulaireInstance.get('/Template/GetAllPriorities');
      setEditedPriorities(
        response.data.map((priority) => ({
          templatePriorityId: priority.templatePriorityId,
          name: priority.name,
          maxObjectives: priority.maxObjectives,
          isActif: priority.isActif
        }))
      );
    } catch (error) {
      console.error('Error fetching all strategic priorities:', error);
      setErrorMessage('Erreur lors de la récupération des priorités stratégiques.');
      setOpenSnackbar(true);
    }
  };

  const handleEditIconClick = () => {
    setNewTemplateName(formTemplate?.name || '');
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSaveTemplateName = async () => {
    try {
      setIsEditIconVisible(false);
      setIsEditing(false);
      await formulaireInstance.put(`/Template/UpdateCadreTemplateName`, newTemplateName);
      setFormTemplate({ ...formTemplate, name: newTemplateName });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating template name:', error);
      setErrorMessage('Erreur lors de la mise à jour du nom du modèle.');
      setOpenSnackbar(true);
    }
  };

  const handleAddPriorityClick = () => {
    setIsAddPriorityModalOpen(true);
  };

  const handleAddPriorityModalClose = () => {
    setIsAddPriorityModalOpen(false);
    setNewPriorityName('');
    setNewMaxObjectives(0);
  };

  const handleSavePriority = async () => {
    if (newMaxObjectives > 6) {
      setErrorMessage('Le nombre maximum d\'objectifs ne peut pas dépasser 6.');
      setOpenSnackbar(true);
      return;
    }
    if (!newPriorityName.trim()) {
      setErrorMessage('Le nom de la priorité ne peut pas être vide.');
      setOpenSnackbar(true);
      return;
    }
    try {
      await formulaireInstance.post('/Template/AddStrategicPriority', {
        name: newPriorityName,
        maxObjectives: newMaxObjectives,
        templateId: templateId
      });
      setIsAddPriorityModalOpen(false);
      setNewPriorityName('');
      setNewMaxObjectives(0);
      const response = await formulaireInstance.get(`/Template/${templateId}`);
      setFormTemplate(response.data.template);
      setDynamicColumns(response.data.dynamicColumns);
    } catch (error) {
      console.error('Error adding strategic priority:', error);
      setErrorMessage('Erreur lors de l\'ajout de la priorité stratégique.');
      setOpenSnackbar(true);
    }
  };

  const handleEditPrioritiesClick = async () => {
    await fetchAllPriorities();
    setIsEditPrioritiesModalOpen(true);
  };

  const handlePriorityChange = (id, field, value) => {
    setEditedPriorities((prevPriorities) =>
      prevPriorities.map((priority) =>
        priority.templatePriorityId === id
          ? { ...priority, [field]: field === 'maxObjectives' ? parseInt(value) || 0 : value }
          : priority
      )
    );
  };

  const handleEditPrioritiesModalClose = () => {
    setIsEditPrioritiesModalOpen(false);
    setEditedPriorities([]);
  };

  const handleSaveEditedPriorities = async () => {
    if (editedPriorities.some((p) => p.maxObjectives > 6)) {
      setErrorMessage('Une ou plusieurs priorités ont un nombre maximum d\'objectifs supérieur à 6.');
      setOpenSnackbar(true);
      return;
    }
    if (editedPriorities.some((p) => !p.name.trim())) {
      setErrorMessage('Le nom d\'une priorité ne peut pas être vide.');
      setOpenSnackbar(true);
      return;
    }
    try {
      const updatePromises = editedPriorities.map((priority) =>
        formulaireInstance.put('/Template/UpdatePriority', {
          templatePriorityId: priority.templatePriorityId,
          newName: priority.name,
          newMaxObjectives: priority.maxObjectives,
          isActif: priority.isActif
        })
      );

      await Promise.all(updatePromises);
      const refreshedTemplate = await formulaireInstance.get(`/Template/${templateId}`);
      setFormTemplate(refreshedTemplate.data.template);
      setDynamicColumns(refreshedTemplate.data.dynamicColumns);

      setIsEditPrioritiesModalOpen(false);
      setEditedPriorities([]);
    } catch (error) {
      console.error('Error updating strategic priorities:', error);
      setErrorMessage('Erreur lors de la mise à jour des priorités stratégiques.');
      setOpenSnackbar(true);
    }
  };

  const handleAddColumnClick = () => {
    setIsAddColumnModalOpen(true);
  };

  const handleAddColumnModalClose = () => {
    setIsAddColumnModalOpen(false);
    setNewColumnName('');
  };

  const handleSaveColumn = async () => {
    if (!newColumnName.trim()) {
      setErrorMessage('Le nom de la colonne ne peut pas être vide.');
      setOpenSnackbar(true);
      return;
    }

    try {
      await formulaireInstance.post('/Template/AddDynamicColumn', null, {
        params: { columnName: newColumnName }
      });
      const refreshedTemplate = await formulaireInstance.get(`/Template/${templateId}`);
      setDynamicColumns(refreshedTemplate.data.dynamicColumns);
      setIsAddColumnModalOpen(false);
      setNewColumnName('');
    } catch (error) {
      console.error('Error adding dynamic column:', error);
      setErrorMessage('Erreur lors de l\'ajout de la colonne dynamique.');
      setOpenSnackbar(true);
    }
  };

  const fetchInactiveColumns = async () => {
    try {
      const response = await formulaireInstance.get('/Template/GetAllColumns', {
        params: { onlyActive: false }
      });
      setInactiveColumns(response.data);
      setIsEditColumnModalOpen(true);
    } catch (error) {
      console.error('Erreur lors de la récupération des colonnes inactives:', error);
      setErrorMessage('Erreur lors de la récupération des colonnes inactives.');
      setOpenSnackbar(true);
    }
  };

  const handleEditColumnModalClose = () => {
    setIsEditColumnModalOpen(false);
    setInactiveColumns([]);
  };

  const handleSaveEditedColumns = async () => {
    if (inactiveColumns.some((c) => !c.name.trim())) {
      setErrorMessage('Le nom d\'une colonne ne peut pas être vide.');
      setOpenSnackbar(true);
      return;
    }
    try {
      const updatePromises = inactiveColumns.map((column) =>
        formulaireInstance.put('/Template/UpdateDynamicColumn', {
          id: column.columnId,
          newName: column.name,
          isActive: column.isActive
        })
      );

      await Promise.all(updatePromises);
      const refreshedTemplate = await formulaireInstance.get(`/Template/${templateId}`);
      setFormTemplate(refreshedTemplate.data.template);
      setDynamicColumns(refreshedTemplate.data.dynamicColumns);
      handleEditColumnModalClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des colonnes:', error);
      setErrorMessage('Erreur lors de la mise à jour des colonnes.');
      setOpenSnackbar(true);
    }
  };

  const exportPDF = () => {
    const input = printRef.current;
    html2canvas(input, { scale: 2 })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'pt', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

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

        pdf.save('formulaire_Cadre.pdf');
      })
      .catch((err) => {
        console.error('Erreur lors de la génération du PDF', err);
        setErrorMessage('Erreur lors de la génération du PDF.');
        setOpenSnackbar(true);
      });
  };

  const DropdownMenu = ({ handleAddPriorityClick, handleEditPrioritiesClick, handleAddColumnClick, fetchInactiveColumns }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleMenuOpen = (event) => {
      setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
    };

    const handleAddPriority = () => {
      handleAddPriorityClick();
      handleMenuClose();
    };

    const handleEditPriorities = () => {
      handleEditPrioritiesClick();
      handleMenuClose();
    };

    const handleAddColumn = () => {
      handleAddColumnClick();
      handleMenuClose();
    };

    const handleEditColumn = () => {
      fetchInactiveColumns();
      handleMenuClose();
    };

    return (
      <>
        <IconButton onClick={handleMenuOpen} color="primary">
          <MoreVertIcon />
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          <MenuItem onClick={handleAddPriority}>
            <AddIcon fontSize="small" sx={{ mr: 1 }} /> Ajouter une priorité
          </MenuItem>
          <MenuItem onClick={handleEditPriorities}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Éditer les priorités
          </MenuItem>
          <MenuItem onClick={handleAddColumn}>
            <AddIcon fontSize="small" sx={{ mr: 1 }} /> Ajouter une colonne
          </MenuItem>
          <MenuItem onClick={handleEditColumn}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Éditer une colonne
          </MenuItem>
        </Menu>
      </>
    );
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
    setErrorMessage('');
  };

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Grid item>
            <Typography variant="subtitle2">Formulaire Cadre</Typography>
            <Typography variant="h3" sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginTop: '0.5rem' }}>
              Formulaire d’évaluation
            </Typography>
          </Grid>
          <Grid item>
            {canEdit && (
              <Button
                variant="outlined"
                onClick={handleEditClick}
                startIcon={isEditing ? <DoneIcon /> : <EditIcon />}
                style={{ marginRight: 10 }}
              >
                {isEditing ? 'Terminer' : 'Modifier'}
              </Button>
            )}
            <IconButton size="small" onClick={exportPDF}>
              <FileDownloadIcon color="primary" />
            </IconButton>
          </Grid>
        </Grid>

        <Box sx={{ padding: 2 }} ref={printRef}>
          <Typography
            variant="h4"
            align="center"
            sx={{
              backgroundColor: '#e8f2dc',
              padding: 1,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}
          >
            {formTemplate?.name}
            {isEditIconVisible && (
              <IconButton size="small" onClick={handleEditIconClick}>
                <EditIcon color="primary" />
              </IconButton>
            )}
          </Typography>

          <Grid container spacing={4} sx={{ mb: 3, mt: 2 }}>
            <Grid item xs={6}>
              <Paper sx={{ padding: 2, borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  COLLABORATEUR
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">Nom :</Typography>
                <Typography variant="body1">Matricule :</Typography>
                <Typography variant="body1">Poste :</Typography>
                <Typography variant="body1">Département :</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ padding: 2, borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  MANAGER
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">Nom :</Typography>
                <Typography variant="body1">Matricule :</Typography>
                <Typography variant="body1">Poste :</Typography>
                <Typography variant="body1">Département :</Typography>
              </Paper>
            </Grid>
          </Grid>

          <TableContainer>
            <Grid item sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              {isEditing && (
                <DropdownMenu
                  handleAddPriorityClick={handleAddPriorityClick}
                  handleEditPrioritiesClick={handleEditPrioritiesClick}
                  handleAddColumnClick={handleAddColumnClick}
                  fetchInactiveColumns={fetchInactiveColumns}
                />
              )}
            </Grid>
            <Table>
              <TableHead>
                <TableRow>
                  <HeaderTableCell>PRIORITÉS STRATÉGIQUES</HeaderTableCell>
                  <HeaderTableCell>OBJECTIFS</HeaderTableCell>
                  <HeaderTableCell>PONDÉRATION</HeaderTableCell>
                  <HeaderTableCell>INDICATEURS DE RÉSULTAT</HeaderTableCell>
                  <HeaderTableCell>RÉSULTATS en % d’atteinte sur 100%</HeaderTableCell>
                  {dynamicColumns?.map((col) => (
                    <HeaderTableCell sx={{ backgroundColor: '#dfedff', color: 'black' }} key={col.columnId}>
                      {col.name}
                    </HeaderTableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {formTemplate?.templateStrategicPriorities?.map((priority) => (
                  <React.Fragment key={priority.templatePriorityId}>
                    <TableRow>
                      <StyledTableCell rowSpan={priority.maxObjectives + 2}>
                        {priority.name}
                        <Typography variant="caption" display="block">
                          ({priority.weighting}%)
                        </Typography>
                      </StyledTableCell>
                    </TableRow>
                    {priority.objectives?.map((objective, objIndex) => (
                      <TableRow key={`${priority.templatePriorityId}-${objIndex}`}>
                        <StyledTableCell>-</StyledTableCell>
                        <StyledTableCell></StyledTableCell>
                        <StyledTableCell></StyledTableCell>
                        <StyledTableCell></StyledTableCell>
                        {dynamicColumns?.map((dynamicCol) => {
                          const dynamicValue = objective.dynamicColumns?.find((col) => col.columnName === dynamicCol.name)?.value || '';
                          return <DynamicTableCell key={dynamicCol.columnId}>{dynamicValue}</DynamicTableCell>;
                        })}
                      </TableRow>
                    ))}
                    <TableRow>
                      <TotalStyledTableCell colSpan={1} sx={{ fontSize: '0.8rem' }}>
                        Sous-total de pondération
                      </TotalStyledTableCell>
                      <TotalStyledTableCell sx={{ fontSize: '0.8rem' }}>0 %</TotalStyledTableCell>
                      <TotalStyledTableCell sx={{ fontSize: '0.8rem' }}>Sous-total résultats</TotalStyledTableCell>
                      <TotalStyledTableCell sx={{ fontSize: '0.8rem' }}>0 %</TotalStyledTableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
                <TableRow>
                  <TotalStyledTableCell colSpan={1} sx={{ backgroundColor: 'transparent' }}></TotalStyledTableCell>
                  <TotalStyledTableCell sx={{ backgroundColor: '#fff5cc' }}>TOTAL PONDÉRATION (100%)</TotalStyledTableCell>
                  <TotalStyledTableCell sx={{ backgroundColor: '#fff5cc' }}>0 %</TotalStyledTableCell>
                  <TotalStyledTableCell sx={{ backgroundColor: '#fff5cc' }}>PERFORMANCE du contrat d'objectifs</TotalStyledTableCell>
                  <TotalStyledTableCell sx={{ backgroundColor: '#fff5cc' }}>0 %</TotalStyledTableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Grid container sx={{ mt: 4, justifyContent: 'space-between' }}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Dates Importantes
              </Typography>
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
                        <Box sx={{ height: '20px' }} />
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
                        <Box sx={{ height: '20px' }} />
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
                        <Typography variant="body1">Date de l'entretien final :</Typography>
                        <Box sx={{ height: '20px' }} />
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
              <Box sx={{ height: '100px', border: '1px solid black' }} />
            </Grid>
            <Grid item xs={6} sx={{ textAlign: 'center' }}>
              <Typography variant="body1">Signature Manager</Typography>
              <Box sx={{ height: '100px', border: '1px solid black' }} />
            </Grid>
          </Grid>
        </Box>

        <Dialog open={isModalOpen} onClose={handleModalClose}>
          <DialogTitle>Modifier le titre du formulaire</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nouveau titre"
              type="text"
              fullWidth
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleModalClose} color="primary">
              Annuler
            </Button>
            <Button onClick={handleSaveTemplateName} color="primary" disabled={!newTemplateName.trim()}>
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isAddPriorityModalOpen} onClose={handleAddPriorityModalClose}>
          <DialogTitle>Ajouter une Priorité Stratégique</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom de la priorité"
              type="text"
              fullWidth
              value={newPriorityName}
              onChange={(e) => setNewPriorityName(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Nombre maximum d'objectifs"
              type="number"
              fullWidth
              value={newMaxObjectives}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value <= 6 || isNaN(value)) {
                  setNewMaxObjectives(value || 0);
                } else {
                  setErrorMessage('Le nombre maximum d\'objectifs ne peut pas dépasser 6.');
                  setOpenSnackbar(true);
                }
              }}
              inputProps={{ min: 0, max: 6 }}
              error={newMaxObjectives > 6}
              helperText={newMaxObjectives > 6 ? 'Maximum 6 objectifs' : ''}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddPriorityModalClose} color="primary">
              Annuler
            </Button>
            <Button
              onClick={handleSavePriority}
              color="primary"
              disabled={newMaxObjectives > 6 || !newPriorityName.trim()}
            >
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isEditPrioritiesModalOpen} onClose={handleEditPrioritiesModalClose} maxWidth="md" fullWidth>
          <DialogTitle>Modifier les Priorités Stratégiques</DialogTitle>
          <DialogContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom de la Priorité</TableCell>
                    <TableCell>Nombre Max d'Objectifs</TableCell>
                    <TableCell>Actif</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editedPriorities.map((priority) => (
                    <TableRow key={priority.templatePriorityId}>
                      <TableCell>
                        <TextField
                          value={priority.name}
                          onChange={(e) => handlePriorityChange(priority.templatePriorityId, 'name', e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={priority.maxObjectives}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value <= 6 || isNaN(value)) {
                              handlePriorityChange(priority.templatePriorityId, 'maxObjectives', value || 0);
                            } else {
                              setErrorMessage('Le nombre maximum d\'objectifs ne peut pas dépasser 6.');
                              setOpenSnackbar(true);
                            }
                          }}
                          fullWidth
                          inputProps={{ min: 0, max: 6 }}
                          error={priority.maxObjectives > 6}
                          helperText={priority.maxObjectives > 6 ? 'Maximum 6 objectifs' : ''}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={priority.isActif}
                          onChange={(e) => handlePriorityChange(priority.templatePriorityId, 'isActif', e.target.checked)}
                          color="primary"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditPrioritiesModalClose} color="primary">
              Annuler
            </Button>
            <Button
              onClick={handleSaveEditedPriorities}
              color="primary"
              disabled={editedPriorities.some((p) => p.maxObjectives > 6 || !p.name.trim())}
            >
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isAddColumnModalOpen} onClose={handleAddColumnModalClose}>
          <DialogTitle>Ajouter une colonne dynamique</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom de la colonne"
              type="text"
              fullWidth
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddColumnModalClose} color="primary">
              Annuler
            </Button>
            <Button onClick={handleSaveColumn} color="primary" disabled={!newColumnName.trim()}>
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={isEditColumnModalOpen} onClose={handleEditColumnModalClose} maxWidth="md" fullWidth>
          <DialogTitle>Modifier les colonnes dynamiques</DialogTitle>
          <DialogContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Actif</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inactiveColumns.map((column, index) => (
                    <TableRow key={column.columnId}>
                      <TableCell>
                        <TextField
                          fullWidth
                          value={column.name}
                          onChange={(e) => {
                            const updatedColumns = [...inactiveColumns];
                            updatedColumns[index].name = e.target.value;
                            setInactiveColumns(updatedColumns);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={column.isActive}
                          onChange={(e) => {
                            const updatedColumns = [...inactiveColumns];
                            updatedColumns[index].isActive = e.target.checked;
                            setInactiveColumns(updatedColumns);
                          }}
                          color="primary"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditColumnModalClose} color="primary">
              Annuler
            </Button>
            <Button
              onClick={handleSaveEditedColumns}
              color="primary"
              disabled={inactiveColumns.some((c) => !c.name.trim())}
            >
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>
      </MainCard>
    </Paper>
  );
};

export default Formulaire;