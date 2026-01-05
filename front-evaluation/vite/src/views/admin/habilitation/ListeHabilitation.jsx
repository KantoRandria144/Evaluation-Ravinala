import React, { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  Grid,
  Typography,
  Button,
  Box,
  Modal,
  TextField,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import { authInstance, formulaireInstance } from '../../../axiosConfig';
import { TableSortLabel } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import AuditService from '../../../services/AuditService';


const ListeHabilitation = () => {
  const [habilitations, setHabilitations] = useState([]);
  const [openRow, setOpenRow] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedHabilitation, setSelectedHabilitation] = useState(null);
  const [initialAdmins, setInitialAdmins] = useState([]);
  const [editData, setEditData] = useState({
    label: '',
    addedHabilitationAdmins: [],
    removedHabilitationAdmins: []
  });
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const HABILITATION_ADD = 2; //ajouter une habilitation
  const HABILITATION_EDIT = 3; //modifier une habilitation
  const [canAdd, setCanAdd] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState('asc'); // 'asc' ou 'desc'
  const [orderBy, setOrderBy] = useState('label'); // Colonne par défaut


  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;
  const fetchHabilitations = async () => {
    try {
      const response = await authInstance.get('/Habilitation');
      // await AuditService.logAction(
      //   userId,
      //   'Consultation de la liste des habilitations',
      //   'Habilitation',
      //   null
      // );
      setHabilitations(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des habilitations');
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await authInstance.get('/Habilitation/admins');
    
      setAvailableAdmins(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des administrateurs');
    }
  };

  const checkPermissions = async () => {
    console.log('checkPermissions called');
    try {
      
      console.log(userId);

      // Vérification pour "Ajouter"
      const addResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${HABILITATION_ADD}`
      );
      setCanAdd(addResponse.data.hasAccess);

      // Vérification pour "Éditer"
      const editResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${HABILITATION_EDIT}`
      );
      setCanEdit(editResponse.data.hasAccess);
    } catch (error) {
      const errorData = error.response?.data;
      setError(typeof errorData === 'object' ? JSON.stringify(errorData, null, 2) : 'Erreur lors de la vérification des autorisations.');
    }
  };

  useEffect(() => {
    fetchHabilitations();
    fetchAdmins();
    checkPermissions();
  }, []);

  const toggleRow = (id) => {
    setOpenRow(openRow === id ? null : id);
  };

  const handleAddClick = () => {
    navigate('/habilitation/AjoutHabilitation');
  };

  const groupAdminsBySection = (admins) => {
    return admins.reduce((sections, admin) => {
      const sectionName = admin.sectionName || 'Sans section';
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push(admin);
      return sections;
    }, {});
  };

  const handleEditClick = (habilitation) => {
    console.log('habilitation sélectionnée :', habilitation);
    setSelectedHabilitation(habilitation);
    setInitialAdmins(habilitation.habilitationAdmins.map((admin) => admin.id)); // Stocker les admins initiaux
    setEditData({
      label: habilitation.label,
      addedHabilitationAdmins: [],
      removedHabilitationAdmins: []
    });
    setEditModalOpen(true);
  };

  const handleModalClose = () => {
    setEditModalOpen(false);
    setSelectedHabilitation(null);
  };

  const handleCheckboxChange = (adminId, isChecked) => {
    setEditData((prevData) => {
      const { addedHabilitationAdmins, removedHabilitationAdmins } = prevData;

      if (isChecked) {
        // Ajouter l'administrateur à "addedHabilitationAdmins" si pas déjà présent initialement
        if (!initialAdmins.includes(adminId)) {
          return {
            ...prevData,
            addedHabilitationAdmins: [...addedHabilitationAdmins, adminId],
            removedHabilitationAdmins: removedHabilitationAdmins.filter((id) => id !== adminId)
          };
        }
        // Retirer des "removedHabilitationAdmins" si décoché précédemment
        return {
          ...prevData,
          removedHabilitationAdmins: removedHabilitationAdmins.filter((id) => id !== adminId)
        };
      } else {
        // Si décoché
        if (initialAdmins.includes(adminId)) {
          // Ajouter à "removedHabilitationAdmins" s'il était initialement présent
          return {
            ...prevData,
            removedHabilitationAdmins: [...removedHabilitationAdmins, adminId],
            addedHabilitationAdmins: addedHabilitationAdmins.filter((id) => id !== adminId)
          };
        }
        // Sinon, retirer de "addedHabilitationAdmins" s'il était nouvellement ajouté
        return {
          ...prevData,
          addedHabilitationAdmins: addedHabilitationAdmins.filter((id) => id !== adminId)
        };
      }
    });
  };

  const handleEditSubmit = async () => {
    // Transformation des données pour respecter le format attendu par l'API
    const payload = {
      label: editData.label,
      addedHabilitationAdmins: editData.addedHabilitationAdmins.map((id) => ({ id })), // Ajout sous forme { id: ... }
      removedHabilitationAdmins: editData.removedHabilitationAdmins.map((id) => ({ id })) // Suppression sous forme { id: ... }
    };

    const oldValues = {
      label: selectedHabilitation.label,
      habilitationAdmins: selectedHabilitation.habilitationAdmins.map((a) => ({ id: a.id, name: a.name }))
    };

    const newValues = {
      label: editData.label,
      habilitationAdmins: [
        // Admins initiaux moins ceux retirés
        ...selectedHabilitation.habilitationAdmins
          .filter((a) => !editData.removedHabilitationAdmins.includes(a.id))
          .map((a) => ({ id: a.id, name: a.name })),

        // Admins ajoutés
        ...availableAdmins
          .filter((a) => editData.addedHabilitationAdmins.includes(a.id))
          .map((a) => ({ id: a.id, name: a.name }))
      ]
    };

    try {
      console.log('Payload envoyé :', payload); // Vérifier le payload avant l'envoi
      await authInstance.put(`/Habilitation/editHabilitation/${selectedHabilitation.id}`, payload);

      await AuditService.logAction(
        userId,
        "Modification d'une habilitation",
        "Habilitation",
        selectedHabilitation.id,
        oldValues,
        newValues
      );

      fetchHabilitations(); // Rafraîchit la liste des habilitations
      setEditModalOpen(false); // Ferme la modale
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l’habilitation :', err.response?.data || err.message);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEditData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Fonction de comparaison pour le tri
  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy].toLowerCase() < a[orderBy].toLowerCase()) {
      return -1;
    }
    if (b[orderBy].toLowerCase() > a[orderBy].toLowerCase()) {
      return 1;
    }
    return 0;
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
  };

  // Fonction de tri stable
  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  return (
    <Paper>
      <Grid container alignItems="center" justifyContent="space-between" sx={{ padding: 2 }}>
        <Grid item>
          {/* <Typography variant="subtitle2">Habilitation</Typography> */}
          <Typography variant="h3" sx={{ marginTop: '0.5rem' }}>
            Liste des habilitations
          </Typography>
        </Grid>
        <Grid item>
          {canAdd && (
            <Button variant="contained" startIcon={<AddCircleIcon />} onClick={handleAddClick}>
              Ajouter
            </Button>
          )}
        </Grid>
      </Grid>

      <TableContainer component="div" sx={{ padding: 2 }}>
        <Table aria-label="collapsible table" sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell
                sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}
                sortDirection={orderBy === 'label' ? order : false}
              >
                <TableSortLabel
                  active={orderBy === 'label'}
                  direction={orderBy === 'label' ? order : 'asc'}
                  onClick={() => handleRequestSort('label')}
                >
                  Nom
                  {orderBy === 'label' ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'tri décroissant' : 'tri croissant'}
                    </Box>
                  ) : null}
                </TableSortLabel>
              </TableCell>
              {canEdit && (
                <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                  Actions
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }} />
            </TableRow>
          </TableHead>

          <TableBody>
          {stableSort(habilitations, getComparator(order, orderBy)).map((habilitation) => (
              <React.Fragment key={habilitation.id}>
                <TableRow sx={{ borderBottom: '1px solid #e0e0e0' }}>
                  <TableCell sx={{ fontSize: '0.9rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>{habilitation.label}</TableCell>
                  {canEdit && (
                    <TableCell sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditClick(habilitation)}
                        sx={{ textTransform: 'none', fontSize: '0.875rem', padding: '8px 16px' }}
                      >
                        Éditer
                      </Button>
                    </TableCell>
                  )}
                  <TableCell sx={{ textAlign: 'right', padding: '12px' }}>
                    <IconButton
                      size="small"
                      onClick={() => toggleRow(habilitation.id)}
                      sx={{ color: '#757575', ':hover': { color: '#1976d2' } }}
                    >
                      {openRow === habilitation.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} sx={{ padding: 0 }}>
                    <Collapse in={openRow === habilitation.id} timeout="auto" unmountOnExit>
                      <Box sx={{ padding: '16px', backgroundColor: '#fafafa' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' }}>
                          Détails
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                          {habilitation.habilitationAdmins.map((admin) => (
                            <li key={admin.id} style={{ fontSize: '0.875rem', marginBottom: '4px', color: '#616161' }}>
                              {admin.name}
                            </li>
                          ))}
                        </ul>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modale pour éditer */}
      <Modal open={editModalOpen} onClose={handleModalClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 1000,
            bgcolor: 'background.paper',
            boxShadow: 24,
            borderRadius: 2,
            p: 4,
            maxHeight: '80vh', // Limite la hauteur à 80% de la vue
            overflowY: 'auto' // Active le défilement si le contenu dépasse
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Éditer Habilitation
          </Typography>
          <TextField fullWidth margin="normal" label="Nom" name="label" value={editData.label} onChange={handleInputChange} />
          <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
            Administrateurs
          </Typography>

          {/* Administrateurs affichés par section */}
          {Object.entries(groupAdminsBySection(availableAdmins)).map(([sectionName, admins]) => (
            <Box key={sectionName} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>
                {sectionName}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr', // Deux colonnes
                  gap: 2
                }}
              >
                {admins.map((admin) => (
                  <Box key={admin.id} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={
                        editData.addedHabilitationAdmins.includes(admin.id) ||
                        (initialAdmins.includes(admin.id) && !editData.removedHabilitationAdmins.includes(admin.id))
                      }
                      onChange={(e) => handleCheckboxChange(admin.id, e.target.checked)}
                    />

                    <Typography variant="body2">{admin.name}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={handleModalClose} sx={{ mr: 2 }}>
              Annuler
            </Button>
            <Button variant="contained" onClick={handleEditSubmit} color="primary">
              Enregistrer
            </Button>
          </Box>
        </Box>
      </Modal>
    </Paper>
  );
};

export default ListeHabilitation;
