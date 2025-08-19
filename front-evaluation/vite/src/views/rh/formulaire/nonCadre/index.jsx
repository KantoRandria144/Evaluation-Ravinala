import React, { useEffect, useState, useRef } from 'react';
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
  Divider,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Icon
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DoneIcon from '@mui/icons-material/Done';
import AddIcon from '@mui/icons-material/Add';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AuditService from '../../../../services/AuditService';

// Styled components for table cells and rows
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  padding: '12px'
}));

const HeaderTableCell = styled(StyledTableCell)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  textAlign: 'center'
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover
  }
}));

const Formulaire = () => {
  const [templateId, setTemplateId] = useState(null);
  const [formTemplate, setFormTemplate] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // États pour l'ajout d'un indicateur
  const [isAddIndicatorModalOpen, setIsAddIndicatorModalOpen] = useState(false);
  const [newIndicatorLabel, setNewIndicatorLabel] = useState('');
  const [newMaxResults, setNewMaxResults] = useState(0);

  // États pour la mise à jour des indicateurs en masse
  const [isEditIndicatorsModalOpen, setIsEditIndicatorsModalOpen] = useState(false);
  const [indicators, setIndicators] = useState([]);

  // États pour les "helps"
  const [isEditHelpsModalOpen, setIsEditHelpsModalOpen] = useState(false);
  const [isAddHelpModalOpen, setIsAddHelpModalOpen] = useState(false);
  const [helps, setHelps] = useState([]);
  const [newHelpName, setNewHelpName] = useState('');
  const [newHelpAllowedUserLevel, setNewHelpAllowedUserLevel] = useState('');
  const [allowedUserLevels, setAllowedUserLevels] = useState([
    { value: 1, label: 'Collaborateur' },
    { value: 2, label: 'Manager' },
    { value: 3, label: 'n+2' }
  ]);

  // État pour les messages d'erreur
  const [errorMessage, setErrorMessage] = useState(null);

  const printRef = useRef();

  const [canEdit, setCanEdit] = useState(false);
  const EDIT_FORM = 10; //modifier la formulaire d'évaluation
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user.id;
  const checkPermissions = async () => {
    try {
      const editResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${EDIT_FORM}`
      );
      setCanEdit(editResponse.data.hasAccess);
    } catch (error) {
      const errorData = error.response?.data;
      setError(typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : 'Erreur lors de la vérification des autorisations.');
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const fetchTemplate = async () => {
    if (!templateId) return;
    try {
      const response = await formulaireInstance.get(`/Template/NonCadreTemplate/${templateId}`);
      setFormTemplate(response.data);
      setErrorMessage(null); // Réinitialiser les messages d'erreur
    } catch (error) {
      console.error('Erreur lors de la récupération du formulaire:', error);
      if (error.response && error.response.data) {
        setErrorMessage(error.response.data.message || 'Erreur lors de la récupération du formulaire.');
      } else {
        setErrorMessage('Erreur réseau lors de la récupération du formulaire.');
      }
    }
  };

  useEffect(() => {
    const fetchNonCadreTemplateId = async () => {
      try {
        const response = await formulaireInstance.get('/Template/NonCadreTemplate');
        if (response.data?.templateId) {
          setTemplateId(response.data.templateId);
          console.log('templateId ' + response.data.templateId);
        } else {
          console.error('Template ID for Non-Cadre not found in the response');
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'ID du template Non-Cadre:", error);
      }
    };
    fetchNonCadreTemplateId();
  }, []);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const handleSaveTemplateName = async () => {
  if (!newTemplateName.trim()) {
    setErrorMessage('Le nom du formulaire ne peut pas être vide.');
    setOpenSnackbar(true);
    return;
  }

  try {
    await formulaireInstance.put(`/Template/UpdateCadreTemplateName`, newTemplateName, {
      headers: { 'Content-Type': 'application/json' }
    });

    await AuditService.logAction(
      userId,
      `Modification du nom du template à: ${newTemplateName}`,
      'Update',
      null,
      { oldName: formTemplate?.name || '' },
      { newName: newTemplateName }
    );

    setFormTemplate((prevTemplate) => ({ ...prevTemplate, name: newTemplateName }));
    setIsModalOpen(false);
    setIsEditIconVisible(false);
    setIsEditing(false);
    setErrorMessage('');
    setOpenSnackbar(false);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du nom du formulaire:', error);
    // setErrorMessage(
    //   error.response?.data?.title || 'Erreur lors de la mise à jour du nom du modèle.'
    // );
    setOpenSnackbar(true);
  }
};

  const handleEditClick = () => {
    setIsEditing((prev) => !prev);
  };

  const handleEditIconClick = () => {
    setNewTemplateName(formTemplate?.name || '');
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleAddIndicatorClick = () => {
    setIsAddIndicatorModalOpen(true);
  };

  const handleAddIndicatorModalClose = () => {
    setIsAddIndicatorModalOpen(false);
    setNewIndicatorLabel('');
    setNewMaxResults(0);
  };

  const handleAddIndicator = async () => {
    try {
      const response = await formulaireInstance.post('/Template/addIndicator', {
        TemplateId: templateId,
        Label: newIndicatorLabel,
        MaxResults: newMaxResults
      });

      await AuditService.logAction(
        userId,
        `Ajout d'un indicateur: ${newIndicatorLabel}`,
        'Create',
        null
      );

      console.log('Indicateur ajouté:', response.data);

      // Mettre à jour immédiatement le template localement
      const newIndicator = {
        indicatorId: response.data.indicatorId || response.data.IndicatorId,
        label: newIndicatorLabel,
        maxResults: newMaxResults,
        isActive: true
      };

      setFormTemplate((prevTemplate) => ({
        ...prevTemplate,
        indicators: [...prevTemplate.indicators, newIndicator]
      }));
      handleAddIndicatorModalClose();
      setErrorMessage(null);
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'indicateur:", error);
      if (error.response && error.response.data) {
        setErrorMessage(error.response.data.message || "Erreur lors de l'ajout de l'indicateur.");
      } else {
        setErrorMessage("Erreur réseau lors de l'ajout de l'indicateur.");
      }
    }
  };

  // Fonction pour récupérer tous les indicateurs
  const fetchAllIndicators = async () => {
    try {
      const response = await formulaireInstance.get('/Template/AllIndicator');
      setIndicators(
        response.data.map((indicator) => ({
          indicatorId: indicator.indicatorId,
          label: indicator.label,
          maxResults: indicator.maxResults,
          isActive: indicator.isActive
        }))
      );
      setErrorMessage(null);
    } catch (error) {
      console.error('Erreur lors de la récupération des indicateurs:', error);
      if (error.response && error.response.data) {
        setErrorMessage(error.response.data.message || 'Erreur lors de la récupération des indicateurs.');
      } else {
        setErrorMessage('Erreur réseau lors de la récupération des indicateurs.');
      }
    }
  };

  // Fonction pour ouvrir le modal de mise à jour des indicateurs
  const handleEditIndicatorsClick = () => {
    fetchAllIndicators();
    setIsEditIndicatorsModalOpen(true);
  };

  // Fonction pour fermer le modal de mise à jour des indicateurs
  const handleEditIndicatorsModalClose = () => {
    setIsEditIndicatorsModalOpen(false);
  };

  // Fonction pour gérer les changements dans les champs des indicateurs
  const handleIndicatorChange = (id, field, value) => {
    setIndicators((prevIndicators) =>
      prevIndicators.map((indicator) => (indicator.indicatorId === id ? { ...indicator, [field]: value } : indicator))
    );
  };

  // Fonction pour sauvegarder tous les indicateurs mis à jour
  const handleSaveAllIndicators = async () => {
    try {
      const updates = indicators.map((indicator) => ({
        IndicatorId: indicator.indicatorId,
        NewLabel: indicator.label,
        NewMaxResults: indicator.maxResults,
        IsActive: indicator.isActive
      }));
      console.log('Mise à jour des indicateurs:', updates);

      await formulaireInstance.put('/Template/UpdateIndicators', updates);

      await AuditService.logAction(
        userId,
        'Mise à jour des indicateurs',
        'Update',
        null
      );

      // Rafraîchir le template après la mise à jour
      await fetchTemplate();
      setErrorMessage(null);

      // Réinitialiser l'état
      setIndicators([]);
      handleEditIndicatorsModalClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des indicateurs:', error);
      if (error.response && error.response.data) {
        setErrorMessage(`Erreur: ${error.response.data.Message || 'Mise à jour des indicateurs échouée.'}`);
      } else {
        setErrorMessage('Erreur lors de la mise à jour des indicateurs.');
      }
    }
  };

  // Fonction pour récupérer tous les "helps"
  const fetchAllHelps = async () => {
    try {
      const response = await formulaireInstance.get('/Template/GetHelps');
      setHelps(
        response.data.map((help) => ({
          helpId: help.helpId,
          name: help.name,
          templateId: help.templateId,
          isActive: help.isActive,
          allowedUserLevel: help.allowedUserLevel
        }))
      );
      setErrorMessage(null);
    } catch (error) {
      console.error('Erreur lors de la récupération des aides:', error);
      if (error.response && error.response.data) {
        setErrorMessage(error.response.data.message || 'Erreur lors de la récupération des aides.');
      } else {
        setErrorMessage('Erreur réseau lors de la récupération des aides.');
      }
    }
  };

  // Fonction pour ouvrir le modal de mise à jour des "helps"
  const handleEditHelpsClick = () => {
    fetchAllHelps();
    setIsEditHelpsModalOpen(true);
  };

  // Fonction pour fermer le modal de mise à jour des "helps"
  const handleEditHelpsModalClose = () => {
    setIsEditHelpsModalOpen(false);
  };

  // Fonction pour gérer les changements dans les champs des "helps"
  const handleHelpChange = (id, field, value) => {
    setHelps((prevHelps) => prevHelps.map((help) => (help.helpId === id ? { ...help, [field]: value } : help)));
  };

  // Fonction pour sauvegarder tous les "helps" mis à jour
  const handleSaveAllHelps = async () => {
    try {
      const updates = helps.map((help) => ({
        HelpId: help.helpId,
        Name: help.name,
        AllowedUserLevel: help.allowedUserLevel,
        IsActive: help.isActive
      }));
      console.log('Mise à jour des aides:', updates);

      await formulaireInstance.put('/Template/UpdateHelps', updates);
      await AuditService.logAction(
        userId,
        'Mise à jour des aides au développement professionnel',
        'Update',
        null
      );
      // Rafraîchir le template après la mise à jour
      await fetchTemplate();
      setErrorMessage(null);

      // Réinitialiser l'état
      setHelps([]);
      handleEditHelpsModalClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des aides:', error);
      if (error.response && error.response.data) {
        setErrorMessage(`Erreur: ${error.response.data.Message || 'Mise à jour des aides échouée.'}`);
      } else {
        setErrorMessage('Erreur lors de la mise à jour des aides.');
      }
    }
  };

  // Fonction pour ouvrir le modal d'ajout de "help"
  const handleAddHelpClick = () => {
    setIsAddHelpModalOpen(true);
  };

  // Fonction pour fermer le modal d'ajout de "help"
  const handleAddHelpModalClose = () => {
    setIsAddHelpModalOpen(false);
    setNewHelpName('');
    setNewHelpAllowedUserLevel('');
  };

  // Fonction pour ajouter un nouveau "help"
  const handleAddHelp = async () => {
    if (!newHelpName.trim() || !newHelpAllowedUserLevel) {
      setErrorMessage('Veuillez remplir tous les champs pour ajouter une aide.');
      return;
    }

    try {
      const response = await formulaireInstance.post('/Template/AddHelp', {
        Name: newHelpName,
        TemplateId: templateId,
        AllowedUserLevel: newHelpAllowedUserLevel
      });
      await AuditService.logAction(
        userId,
        `Ajout d'une aide au développement professionnel: ${newHelpName}`,
        'Create',
        null
      );

      console.log('Aide ajoutée:', response.data);

      // Mettre à jour immédiatement le template localement
      const newHelp = {
        helpId: response.data.helpId || response.data.HelpId,
        name: newHelpName,
        templateId: templateId,
        isActive: true,
        allowedUserLevel: newHelpAllowedUserLevel
      };

      setFormTemplate((prevTemplate) => ({
        ...prevTemplate,
        helps: [...prevTemplate.helps, newHelp]
      }));
      handleAddHelpModalClose();
      setErrorMessage(null);
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'aide:", error);
      if (error.response && error.response.data) {
        setErrorMessage(error.response.data.message || "Erreur lors de l'ajout de l'aide.");
      } else {
        setErrorMessage("Erreur réseau lors de l'ajout de l'aide.");
      }
    }
  };

  const DropdownMenu = ({ handleAddIndicatorClick, handleEditIndicatorsClick, handleEditHelpsClick, handleAddHelpClick }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleMenuOpen = (event) => {
      setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
    };

    const handleAddIndicator = () => {
      handleAddIndicatorClick();
      handleMenuClose();
    };

    const handleEditIndicator = () => {
      handleEditIndicatorsClick();
      handleMenuClose();
    };

    const handleEditHelp = () => {
      handleEditHelpsClick();
      handleMenuClose();
    };

    const handleAddHelpOption = () => {
      handleAddHelpClick();
      handleMenuClose();
    };

    return (
      <>
        <IconButton onClick={handleMenuOpen} color="primary">
          <MoreVertIcon />
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          <MenuItem onClick={handleAddIndicator}>
            <AddIcon fontSize="small" sx={{ mr: 1 }} /> Ajouter un indicateur métier
          </MenuItem>
          <MenuItem onClick={handleEditIndicator}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Modifier les indicateurs métiers
          </MenuItem>
          <MenuItem onClick={handleAddHelpOption}>
            <AddIcon fontSize="small" sx={{ mr: 1 }} /> Ajouter une aide au développement professionnel
          </MenuItem>
          <MenuItem onClick={handleEditHelp}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Modifier les aides au développement professionnel
          </MenuItem>
        </Menu>
      </>
    );
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

  //       const pdfWidth = pdf.internal.pageSize.getWidth();
  //       const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  //       pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  //       pdf.save('formulaire_Non_Cadre.pdf');
  //     })
  //     .catch((err) => {
  //       console.error('Erreur lors de la génération du PDF', err);
  //       setErrorMessage('Erreur lors de la génération du PDF.');
  //     });
  // };


  const exportPDF = () => {
    const input = printRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
  
      // Nombre de pages
      let page = 0;
      while (heightLeft > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        if (heightLeft > 0) {
          pdf.addPage();
          position = heightLeft - imgHeight;
        }
        page++;
      }
  
      pdf.save('formulaire_Non_Cadre.pdf');
      AuditService.logAction(
        userId,
        'Exportation du formulaire en PDF',
        'Export',
        null
      ).catch((err) => {
        console.error('Erreur lors de l\'enregistrement de l\'audit:', err);
        setErrorMessage('Erreur lors de l\'enregistrement de l\'action d\'audit.');
      });
    }).catch((err) => {
      console.error('Erreur lors de la génération du PDF', err);
      setErrorMessage('Erreur lors de la génération du PDF.');
    });
  };  

  return (
    <Paper sx={{ borderRadius: 0 }}>
      <MainCard>
        {/* Affichage des messages d'erreur */}
        {errorMessage && (
          <Typography variant="body1" color="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Typography>
        )}

        {/* En-tête du formulaire */}
        <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Grid item>
            <Typography variant="subtitle2">Formulaire Non Cadre</Typography>
            <Typography variant="h3" sx={{ marginTop: '0.5rem' }}>
              Formulaire d’évaluation
            </Typography>
          </Grid>
          <Grid item>
            {canEdit && (
              <Button variant="outlined" onClick={handleEditClick} startIcon={isEditing ? <DoneIcon /> : <EditIcon />} sx={{ mr: 2 }}>
                {isEditing ? 'Terminer' : 'Modifier'}
              </Button>
            )}
            <IconButton size="small" onClick={exportPDF}>
              <FileDownloadIcon color="primary" />
            </IconButton>
          </Grid>
        </Grid>

        {/* Contenu du formulaire */}
        <Box sx={{ padding: 2 }} ref={printRef}>
          {/* Titre du formulaire avec icône d'édition */}
          <Typography variant="h4" align="center" sx={{ backgroundColor: '#e8f2dc', p: 1, fontWeight: 'bold', position: 'relative' }}>
            {formTemplate?.name}
            {isEditing && (
              <IconButton size="small" onClick={handleEditIconClick}>
                <EditIcon color="primary" />
              </IconButton>
            )}
          </Typography>

          {/* Sections COLLABORATEUR et MANAGER */}
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

          {/* Table des compétences */}
          <TableContainer component={Paper} sx={{ mb: 4, borderRadius: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <HeaderTableCell>INDICATEURS de capacités et de compétences</HeaderTableCell>
                  {formTemplate?.levels?.map((level) => (
                    <HeaderTableCell key={level.levelId}>{level.levelName} %</HeaderTableCell>
                  ))}
                  <HeaderTableCell sx={{ backgroundColor: '#dfedff', color: 'black' }}>Performance en %</HeaderTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formTemplate?.competences?.map((competence) => (
                  <StyledTableRow key={competence.competenceId}>
                    <StyledTableCell sx={{ fontSize: '0.8rem' }}>{competence.name}</StyledTableCell>
                    {formTemplate.levels.map((level) => {
                      const competenceLevel = competence.levels?.find((cl) => cl.levelId === level.levelId);
                      return (
                        <StyledTableCell sx={{ fontSize: '0.8rem' }} key={level.levelId}>
                          {competenceLevel ? competenceLevel.description : '-'}
                        </StyledTableCell>
                      );
                    })}
                    <StyledTableCell sx={{ backgroundColor: '#F9F9F9' }}></StyledTableCell>
                  </StyledTableRow>
                ))}
                {/* Ligne pour la pondération totale des indicateurs */}
                <StyledTableRow>
                  <StyledTableCell colSpan={2} sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#e8f2dc' }}>
                    Pondération totale des indicateurs :{' '}
                    {formTemplate?.competenceWeightTotal ? `${formTemplate.competenceWeightTotal} %` : '-'}
                  </StyledTableCell>
                  <StyledTableCell colSpan={4} sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#e8f2dc' }}>
                    TOTAL de la performance des indicateur
                  </StyledTableCell>
                  <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#e8f2dc' }}>-</StyledTableCell>
                </StyledTableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table des indicateurs métiers */}
          <TableContainer component={Paper} sx={{ borderRadius: 0 }}>
            <Grid item sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              {isEditing && (
                <DropdownMenu
                  handleEditIndicatorsClick={handleEditIndicatorsClick}
                  handleAddIndicatorClick={handleAddIndicatorClick}
                  handleEditHelpsClick={handleEditHelpsClick}
                  handleAddHelpClick={handleAddHelpClick}
                />
              )}
            </Grid>
            <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <HeaderTableCell>INDICATEURS METIERS</HeaderTableCell>
                  <HeaderTableCell>RESULTATS ATTENDUS</HeaderTableCell>
                  <HeaderTableCell>RESULTATS en % d'atteinte sur 100%</HeaderTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formTemplate?.indicators?.map((indicator) => (
                  <React.Fragment key={indicator.indicatorId}>
                    {/* Première ligne avec le label de l'indicateur */}
                    <TableRow>
                      <StyledTableCell rowSpan={indicator.maxResults + 1}>{indicator.label}</StyledTableCell>
                      <StyledTableCell>-</StyledTableCell>
                      <StyledTableCell></StyledTableCell>
                    </TableRow>

                    {/* Lignes pour les résultats */}
                    {Array.from({ length: indicator.maxResults - 1 }).map((_, index) => (
                      <TableRow key={`${indicator.indicatorId}-${index}`}>
                        <StyledTableCell>-</StyledTableCell>
                        <StyledTableCell></StyledTableCell>
                      </TableRow>
                    ))}

                    {/* Ligne totale pour l'indicateur */}
                    <TableRow>
                      <StyledTableCell colSpan={1} sx={{ fontWeight: 'bold', backgroundColor: '#E8EAF6' }}>
                        Total
                      </StyledTableCell>
                      <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#E8EAF6' }}>-</StyledTableCell>
                    </TableRow>
                  </React.Fragment>
                ))}

                {/* Ligne pour la performance totale */}
                <StyledTableRow>
                  <StyledTableCell colSpan={1} sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#e8f2dc' }}>
                    TOTAL de la performance des indicateurs :{' '}
                    {formTemplate?.indicatorWeightTotal ? `${formTemplate.indicatorWeightTotal} %` : '-'}
                  </StyledTableCell>
                  <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#e8f2dc' }}>
                    TOTAL de la performance des indicateur
                  </StyledTableCell>
                  <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#e8f2dc' }}>-</StyledTableCell>
                </StyledTableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table des pondérations */}
          <TableContainer component={Paper} sx={{ borderRadius: 0, mt: 5 }}>
            <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableBody>
                <StyledTableRow>
                  <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#fff5cc' }}>
                    TOTAL pondération:{' '}
                    {formTemplate?.competenceWeightTotal != null && formTemplate?.indicatorWeightTotal != null
                      ? `${formTemplate.competenceWeightTotal + formTemplate.indicatorWeightTotal} %`
                      : '-'}
                  </StyledTableCell>
                  <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'left', backgroundColor: '#fff5cc' }}>
                    PERFORMANCE du contrat d'objectifs
                  </StyledTableCell>
                  <StyledTableCell sx={{ fontWeight: 'bold', textAlign: 'center', backgroundColor: '#e8f2dc' }}>-</StyledTableCell>
                </StyledTableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Section des aides */}
          <Grid container sx={{ mt: 4, justifyContent: 'space-between' }}>
            <Grid item xs={12}>
              {formTemplate?.helps?.map((help) => (
                <Box key={help.helpId} sx={{ mb: 3 }}>
                  {/* Affichage du nom du help */}
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {help.name}
                  </Typography>

                  {/* Champ stylisé pour ressembler à un input */}
                  <Box
                    sx={{
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: 1.5,
                      backgroundColor: '#f5f5f5',
                      color: '#666',
                      fontSize: '0.9rem',
                      height: '100px'
                    }}
                  ></Box>
                </Box>
              ))}
            </Grid>
          </Grid>

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
                        <Box sx={{ height: '20px' }} /> {/* Espace vide pour la date */}
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
                        <Box sx={{ height: '20px' }} /> {/* Espace vide pour la date */}
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
                        <Box sx={{ height: '20px' }} /> {/* Espace vide pour la date */}
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {/* Sections des signatures */}
          <Grid container sx={{ mt: 2 }} spacing={4}>
            <Grid item xs={6} sx={{ textAlign: 'center' }}>
              <Typography variant="body1">Signature Collaborateur</Typography>
              <Box sx={{ height: '100px', border: '1px solid black' }} /> {/* Ligne pour signature */}
            </Grid>
            <Grid item xs={6} sx={{ textAlign: 'center' }}>
              <Typography variant="body1">Signature Manager</Typography>
              <Box sx={{ height: '100px', border: '1px solid black' }} /> {/* Ligne pour signature */}
            </Grid>
          </Grid>
        </Box>

        {/* Modal pour éditer le nom du template */}
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
            <Button onClick={handleSaveTemplateName} color="primary">
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal pour ajouter un indicateur */}
        <Dialog open={isAddIndicatorModalOpen} onClose={handleAddIndicatorModalClose}>
          <DialogTitle>Ajouter un Indicateur</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom de l'indicateur"
              type="text"
              fullWidth
              value={newIndicatorLabel}
              onChange={(e) => setNewIndicatorLabel(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Nombre maximum de résultats"
              type="number"
              fullWidth
              value={newMaxResults}
              onChange={(e) => setNewMaxResults(Number(e.target.value))}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddIndicatorModalClose} color="primary">
              Annuler
            </Button>
            <Button onClick={handleAddIndicator} color="primary">
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal pour mettre à jour les indicateurs en masse */}
        <Dialog open={isEditIndicatorsModalOpen} onClose={handleEditIndicatorsModalClose} maxWidth="md" fullWidth>
          <DialogTitle>Modifier les Indicateurs</DialogTitle>
          <DialogContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Label</TableCell>
                    <TableCell>Nombre Max de Résultats</TableCell>
                    <TableCell>Actif</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {indicators.map((indicator) => (
                    <TableRow key={indicator.indicatorId}>
                      <TableCell>
                        <TextField
                          value={indicator.label}
                          onChange={(e) => handleIndicatorChange(indicator.indicatorId, 'label', e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          value={indicator.maxResults}
                          onChange={(e) => handleIndicatorChange(indicator.indicatorId, 'maxResults', parseInt(e.target.value))}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={indicator.isActive}
                          onChange={(e) => handleIndicatorChange(indicator.indicatorId, 'isActive', e.target.checked)}
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
            <Button onClick={handleEditIndicatorsModalClose} color="secondary">
              Fermer
            </Button>
            <Button onClick={handleSaveAllIndicators} color="primary" variant="contained">
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal pour éditer les "helps" */}
        <Dialog open={isEditHelpsModalOpen} onClose={handleEditHelpsModalClose} maxWidth="md" fullWidth>
          <DialogTitle>Modifier les aides au développement professionnel</DialogTitle>
          <DialogContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Niveau d'utilisateur autorisé</TableCell>
                    <TableCell>Actif</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {helps.map((help) => (
                    <TableRow key={help.helpId}>
                      <TableCell>
                        <TextField value={help.name} onChange={(e) => handleHelpChange(help.helpId, 'name', e.target.value)} fullWidth />
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth>
                          <InputLabel id={`allowed-user-level-label-${help.helpId}`}>Niveau</InputLabel>
                          <Select
                            labelId={`allowed-user-level-label-${help.helpId}`}
                            value={help.allowedUserLevel}
                            label="Niveau"
                            onChange={(e) => handleHelpChange(help.helpId, 'allowedUserLevel', e.target.value)}
                          >
                            {allowedUserLevels.map((level) => (
                              <MenuItem key={level.value} value={level.value}>
                                {level.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={help.isActive}
                          onChange={(e) => handleHelpChange(help.helpId, 'isActive', e.target.checked)}
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
            <Button onClick={handleEditHelpsModalClose} color="secondary">
              Fermer
            </Button>
            <Button onClick={handleSaveAllHelps} color="primary" variant="contained">
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal pour ajouter un "help" */}
        <Dialog open={isAddHelpModalOpen} onClose={handleAddHelpModalClose}>
          <DialogTitle>Ajouter une aide au développement professionnel</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom de l'aide"
              type="text"
              fullWidth
              value={newHelpName}
              onChange={(e) => setNewHelpName(e.target.value)}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="new-help-allowed-user-level-label">Niveau</InputLabel>
              <Select
                labelId="new-help-allowed-user-level-label"
                value={newHelpAllowedUserLevel}
                label="Niveau"
                onChange={(e) => setNewHelpAllowedUserLevel(e.target.value)}
              >
                {allowedUserLevels.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAddHelpModalClose} color="primary">
              Annuler
            </Button>
            <Button onClick={handleAddHelp} color="primary">
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>
      </MainCard>
    </Paper>
  );
};

export default Formulaire;
