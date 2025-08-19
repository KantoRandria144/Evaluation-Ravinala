import React, { useState, useEffect } from 'react';
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
  TextField,
  Box,
  Button,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { authInstance, formulaireInstance } from '../../../axiosConfig';

import AddCircleIcon from '@mui/icons-material/AddCircle';
import ClearIcon from '@mui/icons-material/Clear';
import MainCard from 'ui-component/cards/MainCard';
import RefreshIcon from '@mui/icons-material/Refresh';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import { TableSortLabel } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import AuditService from '../../../services/AuditService';

const ListeUtilisateur = () => {
  const [openRow, setOpenRow] = useState(null);

  // Champs de filtre
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [typeUserFilter, setTypeUserFilter] = useState('');
  const [matriculeFilter, setMatriculeFilter] = useState('');

  const [employees, setEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [openDialog, setOpenDialog] = useState(false);
  const [habilitationToDelete, setHabilitationToDelete] = useState({ userId: null, habilitationId: null, label: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSyncing, setIsSyncing] = useState(false); // État pour la synchronisation
  const [openEditDialog, setOpenEditDialog] = useState(false); // État pour le dialog d'édition
  const [selectedUser, setSelectedUser] = useState(null); // Utilisateur sélectionné
  const [newTypeUser, setNewTypeUser] = useState(''); // Nouveau type d'utilisateur

  // Permissions
  const [canAssign, setCanAssign] = useState(false);
  const ASSIGN_HABILITATION = 5; // assigner une habilitation a un utilisateur
  const [canEditUser, setCanEditUser] = useState(false);
  const UPADATE_USER = 7; // editer et actualiser les utilisateurs

  // Pagination
  const itemsPerPage = 3;
  const navigate = useNavigate();

  const [order, setOrder] = useState('asc'); // 'asc' ou 'desc'
  const [orderBy, setOrderBy] = useState('name'); // Colonne par défaut (assurez-vous que 'name' correspond à la clé utilisée)

  // Vérification des habilitations
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;

  const checkPermissions = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user.id;

      const assignResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${ASSIGN_HABILITATION}`
      );
      setCanAssign(assignResponse.data.hasAccess);

      const editUserResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${UPADATE_USER}`
      );
      setCanEditUser(editUserResponse.data.hasAccess);

    } catch (error) {
      console.error('Erreur lors de la vérification des autorisations :', error);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  // Mapping du type utilisateur (backend -> label)
  const mapTypeUser = (type) => {
    const typeMapping = {
      Cadre: 'Cadre',
      NonCadre: 'NonCadre'
    };
    return typeMapping[type] || 'Aucun'; // Retourne "Aucun" si le type est null ou non mappé
  };

  // Chargement initial des utilisateurs (non filtrés)
  useEffect(() => {
    fetchInitialUsers();
  }, []);

  const fetchInitialUsers = async () => {
    try {
      const response = await authInstance.get('/User/userType');
      const mappedEmployees = response.data.map((employee) => ({
        ...employee,
        typeUser: mapTypeUser(employee.typeUser) // Appliquer le mapping au moment de la récupération
      }));
      setEmployees(mappedEmployees);

      // await AuditService.logAction(
      //   userId,
      //   'Consultation de la liste initiale des utilisateurs',
      //   'Fetch',
      //   null
      // );

    } catch (error) {
      console.error('Error fetching initial users:', error);
    }
  };

  // Consultation de la liste filtrée via l'endpoint '/User/all'
  // On met "undefined" quand le paramètre n'est pas renseigné (pour ne pas le passer à l’API)
  const fetchFilteredUsers = async (nameOrMail, department, typeUser, matricule) => {
    try {
      const response = await authInstance.get('/User/all', {
        params: {
          NameOrMail: nameOrMail || undefined,
          Department: department || undefined,
          TypeUser: typeUser || undefined,
          m: matricule || undefined
        }
      });

      setEmployees(response.data);
      setCurrentPage(1); // Reset la pagination à la page 1 après filtrage

      // await AuditService.logAction(
      //   userId,
      //   'Consultation des utilisateurs avec filtres',
      //   'Fetch',
      //   `Nom ou Email: ${nameOrMail || 'aucun'}, Département: ${department || 'aucun'}, Type: ${typeUser || 'aucun'}, Matricule: ${matricule || 'aucun'}`
      // );

    } catch (error) {
      console.error('Error fetching filtered users:', error);
      setSnackbar({ open: true, message: 'Erreur lors du filtrage des utilisateurs.', severity: 'error' });
    }
  };

  // Ouverture/fermeture des détails (habilitations)
  const toggleRow = (id) => {
    setOpenRow(openRow === id ? null : id);
  };

  // Handlers pour la mise à jour dynamique du filtre
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    fetchFilteredUsers(value, departmentFilter, typeUserFilter, matriculeFilter);
  };

  const handleDepartmentChange = (event) => {
    const value = event.target.value;
    setDepartmentFilter(value);
    fetchFilteredUsers(searchTerm, value, typeUserFilter, matriculeFilter);
  };

  const handleTypeUserChange = (event) => {
    const value = event.target.value;
    setTypeUserFilter(value);
    fetchFilteredUsers(searchTerm, departmentFilter, value, matriculeFilter);
  };

  const handleMatriculeChange = (event) => {
    const value = event.target.value;
    setMatriculeFilter(value);
    fetchFilteredUsers(searchTerm, departmentFilter, typeUserFilter, value);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = employees.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  // Assignation d'habilitations
  const handleAddClick = (userId) => {
    // AuditService.logAction(
    //   userId,
    //   'Navigation vers la page d\'assignation d\'habilitations pour un utilisateur',
    //   'Navigate',
    //   `Utilisateur ID: ${userId}`
    // );

    navigate(`/utilisateur/assignation/${userId}`); // Navigation avec userId
  };

  // Suppression d’habilitation
  const handleRemoveHabilitation = (userId, habilitationId, label) => {
    setHabilitationToDelete({ userId, habilitationId, label });
    setOpenDialog(true);
  };

  const confirmRemoveHabilitation = async () => {
      const { userId, habilitationId, label } = habilitationToDelete;
      try {
        const dto = {
          UserIds: [userId],
          HabilitationIds: [habilitationId]
        };

        const response = await authInstance.post('/User/remove-habilitations', dto);

        setEmployees((prevEmployees) =>
          prevEmployees.map((employee) => {
            if (employee.id === userId) {
              return {
                ...employee,
                habilitations: employee.habilitations.filter((h) => h.id !== habilitationId)
              };
            }
            return employee;
          })
        );

        setSnackbar({ open: true, message: 'Habilitation supprimée avec succès.', severity: 'success' });
        await AuditService.logAction(
          userId,
          'Suppression d\'une habilitation pour un utilisateur',
          'Delete',
          null,
          null,
          { userId, habilitationId, label }
        );
      } catch (error) {
        console.error('Erreur lors de la suppression des habilitations:', error);
        const errorMessage = error.response?.data || 'Erreur lors de la suppression des habilitations.';
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      } finally {
        setOpenDialog(false);
        setHabilitationToDelete({ userId: null, habilitationId: null, label: '' });
      }
  };

  const cancelRemoveHabilitation = () => {
    setOpenDialog(false);
    setHabilitationToDelete({ userId: null, habilitationId: null, label: '' });
  };

  // Synchronisation (Actualisation) des utilisateurs
  const handleSyncUsers = async () => {
    setIsSyncing(true);
    try {
      const response = await authInstance.post(`/User/Actualize`);
      const syncResult = {
        added: response.data.added,
        updated: response.data.updated,
        deleted: response.data.deleted
      };
      
      setSnackbar({
        open: true,
        message: `Synchronisation réussie! Ajoutés: ${response.data.added}, Mis à jour: ${response.data.updated}, Supprimés: ${response.data.deleted}`,
        severity: 'success'
      });
      // Rafraîchir la liste
      fetchInitialUsers();

      await AuditService.logAction(
        userId,
        'Synchronisation des utilisateurs',
        'Sync',
        null,
        null,
        syncResult
      );

    } catch (error) {
      console.error('Erreur lors de la synchronisation des utilisateurs:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la synchronisation des utilisateurs.',
        severity: 'error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Édition du type user
  const handleEditClick = (user) => {
    setSelectedUser(user);

    // Conversion du type (string) vers 0 / 1
    const typeMapping = {
      Cadre: 0,
      NonCadre: 1
    };

    const mappedType = typeMapping[user.typeUser] ?? null;
    setNewTypeUser(mappedType);
    setOpenEditDialog(true);
  };

  const handleUpdateUserType = async () => {
    if (!selectedUser) return;

    try {
      const dto = {
        UserIds: [selectedUser.id],
        NewType: newTypeUser
      };

      const response = await authInstance.put('/User/update-users-type', dto);

      setSnackbar({
        open: true,
        message: response.data,
        severity: 'success'
      });

      // Mettre à jour localement
      setEmployees((prevEmployees) =>
        prevEmployees.map((employee) =>
          employee.id === selectedUser.id
            ? {
                ...employee,
                typeUser: mapTypeUser(newTypeUser === 0 ? 'Cadre' : 'NonCadre')
              }
            : employee
        )
      );

      // Log audit with old and new values
      await AuditService.logAction(
        userId,
        'Mise à jour du type d\'utilisateur',
        'Users',
        selectedUser.id, // Removed quotes around selectedUser.id
        { typeUser: selectedUser.typeUser },
        { typeUser: newTypeUser === 0 ? 'Cadre' : newTypeUser === 1 ? 'NonCadre' : 'aucun' }
      );

      setOpenEditDialog(false);

    } catch (error) {
      console.error("Erreur lors de la mise à jour du type d'utilisateur:", error);
      const errorMessage = error.response?.data || "Erreur lors de la mise à jour du type d'utilisateur.";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };
  // Fonction de comparaison pour le tri décroissant
  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy].toLowerCase() < a[orderBy].toLowerCase()) {
      return -1;
    }
    if (b[orderBy].toLowerCase() > a[orderBy].toLowerCase()) {
      return 1;
    }
    return 0;
  };

  // Fonction pour obtenir le comparateur basé sur l'ordre
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
      <MainCard>
        {/* Titre */}
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            {/* <Typography variant="subtitle2">Utilisateur</Typography> */}
            <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
              Liste des collaborateurs
            </Typography>
          </Grid>
          <Grid item>
            {canEditUser && (
              <Button variant="contained" startIcon={<RefreshIcon />} sx={{ marginLeft: 2 }} onClick={handleSyncUsers} disabled={isSyncing}>
                {isSyncing ? 'Actualisation...' : 'Actualiser'}
              </Button>
            )}
          </Grid>
        </Grid>
      </MainCard>

      {/* Filtres visibles en permanence */}
      <Box sx={{ padding: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2}>
            <TextField label="Matricule" variant="outlined" fullWidth value={matriculeFilter} onChange={handleMatriculeChange} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="Nom ou Email" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="Département" variant="outlined" fullWidth value={departmentFilter} onChange={handleDepartmentChange} />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="type-user-label">Type</InputLabel>
              <Select labelId="type-user-label" label="Type" value={typeUserFilter} onChange={handleTypeUserChange}>
                <MenuItem value="">—</MenuItem>
                <MenuItem value="Cadre">Cadre</MenuItem>
                <MenuItem value="NonCadre">Non-Cadre</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Tableau principal */}
      <TableContainer component="div" sx={{ padding: 2 }}>
        <Table aria-label="collapsible table" sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Matricule
              </TableCell>
              <TableCell
                sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}
                sortDirection={orderBy === 'name' ? order : false} // Assurez-vous que 'name' correspond à la clé
              >
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')} // Assurez-vous que 'name' correspond à la clé
                >
                  Nom et prénom
                  {orderBy === 'name' ? (
                    <Box component="span" sx={visuallyHidden}>
                      {order === 'desc' ? 'tri décroissant' : 'tri croissant'}
                    </Box>
                  ) : null}
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Département
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                Type
              </TableCell>
              {canEditUser && (
                <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                  Action
                </TableCell>
              )}
              <TableCell />
            </TableRow>
          </TableHead>

          <TableBody>
            {stableSort(currentEmployees, getComparator(order, orderBy)).map((employee) => (
              <React.Fragment key={employee.id}>
                <TableRow>
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                    <Link to={`/employee/${employee.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {employee.matricule}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{employee.name}</TableCell>
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{employee.email}</TableCell>
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{employee.department}</TableCell>
                  <TableCell
                    sx={{
                      fontSize: '0.9rem',
                      padding: '12px',
                      textAlign: 'center',
                      borderRight: '1px solid #e0e0e0'
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        color:
                          employee.typeUser === 'Cadre'
                            ? '#B07B00' // Texte jaune pour Cadre
                            : employee.typeUser === 'NonCadre'
                              ? '#6baa1e' // Texte vert pour NonCadre
                              : '#ffffff', // Texte blanc pour autre type
                        backgroundColor:
                          employee.typeUser === 'Cadre'
                            ? '#FFF5CC' // Fond jaune clair pour Cadre
                            : employee.typeUser === 'NonCadre'
                              ? '#e8f2dc' // Fond vert pastel pour NonCadre
                              : '#f8c7c5' // Fond rose doux pour autre type (remplaçant du rouge)
                      }}
                    >
                      {employee.typeUser}
                    </Box>
                  </TableCell>

                  {canEditUser && (
                    <TableCell sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditClick(employee)}
                        sx={{ textTransform: 'none', fontSize: 'small', padding: '8px 16px' }}
                      >
                        Modifier
                      </Button>
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => toggleRow(employee.id)}
                      sx={{ color: openRow === employee.id ? '#1976d2' : '#757575' }}
                    >
                      {openRow === employee.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </TableCell>
                </TableRow>

                {/* Détails (habilitations) */}
                <TableRow>
                  <TableCell sx={{ padding: 0 }} colSpan={7}>
                    <Collapse in={openRow === employee.id} timeout="auto" unmountOnExit>
                      <Box sx={{ padding: '16px', backgroundColor: '#fafafa' }}>
                        <Grid container alignItems="center" justifyContent="space-between" sx={{ marginBottom: 2 }}>
                          <Typography variant="h6" component="div" color="textSecondary">
                            Habilitations
                          </Typography>
                          {canAssign && (
                            <Button
                              variant="outlined"
                              startIcon={<AddCircleIcon />}
                              onClick={() => handleAddClick(employee.id)}
                              sx={{ marginLeft: 2 }}
                            >
                              Ajouter
                            </Button>
                          )}
                        </Grid>
                        <Table size="small" aria-label="habilitation details">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#555' }}>Label</TableCell>
                              {canAssign && (
                                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#555' }}>
                                  Action
                                </TableCell>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {employee.habilitations.map((habilitation) => (
                              <TableRow key={habilitation.id}>
                                <TableCell sx={{ fontSize: '0.875rem', color: '#333' }}>{habilitation.label}</TableCell>
                                {canAssign && (
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveHabilitation(employee.id, habilitation.id, habilitation.label)}
                                      sx={{
                                        color: '#f44336',
                                        '&:hover': { backgroundColor: '#fdecea' }
                                      }}
                                    >
                                      <ClearIcon />
                                    </IconButton>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
        <Pagination
          count={Math.ceil(employees.length / itemsPerPage)}
          page={currentPage}
          onChange={handlePageChange}
          variant="outlined"
          shape="rounded"
          color="primary"
          sx={{
            '& .MuiPaginationItem-root': {
              //   borderRadius: '16px',
              padding: '6px 12px',
              fontSize: '1rem',
              margin: '0 4px',
              color: '#4a4a4a',
              backgroundColor: '#f7f9fc',
              border: '1px solid #ddd',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: '#e0e7ff',
                color: '#3f51b5'
              },
              marginBottom: 2,
              marginTop: 2
            },
            '& .MuiPaginationItem-root.Mui-selected': {
              backgroundColor: '#3f51b5',
              color: '#ffffff',
              fontWeight: 'bold',
              borderColor: '#3f51b5',
              transform: 'scale(1.05)',
              boxShadow: '0 4px 10px rgba(63, 81, 181, 0.2)'
            }
          }}
        />
      </Grid>

      {/* Dialog de Confirmation de Suppression */}
      <Dialog
        open={openDialog}
        onClose={cancelRemoveHabilitation}
        aria-labelledby="confirm-delete-dialog-title"
        aria-describedby="confirm-delete-dialog-description"
      >
        <DialogTitle id="confirm-delete-dialog-title">Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-delete-dialog-description">
            Êtes-vous sûr de vouloir supprimer l'habilitation <strong>{habilitationToDelete.label}</strong> ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelRemoveHabilitation} color="primary">
            Annuler
          </Button>
          <Button onClick={confirmRemoveHabilitation} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'édition du type d'utilisateur */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} aria-labelledby="edit-user-type-dialog-title">
        <DialogTitle id="edit-user-type-dialog-title">Modifier le Type d'Utilisateur</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sélectionnez le nouveau type pour l'utilisateur <strong>{selectedUser?.name}</strong>.
          </DialogContentText>
          <FormControl fullWidth variant="outlined" sx={{ marginTop: 2 }}>
            <InputLabel id="new-type-user-label">Type</InputLabel>
            <Select labelId="new-type-user-label" label="Type" value={newTypeUser} onChange={(e) => setNewTypeUser(e.target.value)}>
              <MenuItem value={0}>Cadre</MenuItem>
              <MenuItem value={1}>Non-Cadre</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)} color="primary">
            Annuler
          </Button>
          <Button onClick={handleUpdateUserType} color="secondary" variant="contained">
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ListeUtilisateur;

// import React, { useState, useEffect } from 'react';
// import {
//   Paper,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Collapse,
//   IconButton,
//   Grid,
//   Typography,
//   TextField,
//   Box,
//   Button,
//   Pagination,
//   FormControl,
//   Select,
//   MenuItem,
//   InputLabel,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogContentText,
//   DialogActions,
//   Snackbar
// } from '@mui/material';

// import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
// import AddCircleIcon from '@mui/icons-material/AddCircle';
// import ClearIcon from '@mui/icons-material/Clear';
// import MainCard from 'ui-component/cards/MainCard';
// import RefreshIcon from '@mui/icons-material/Refresh';
// import EditIcon from '@mui/icons-material/Edit';

// // import { useNavigate, Link } from 'react-router-dom';
// // import { authInstance, formulaireInstance } from '../../../axiosConfig';
// // ↑ Plus nécessaire, on commente ou supprime

// ////////////////////////////////////////////////////////////////////////
// // 1) Données statiques : liste (ex. 15 utilisateurs) - dupliquez si besoin
// ////////////////////////////////////////////////////////////////////////
// const staticEmployees = [
//   {
//     id: '1',
//     matricule: '00101',
//     name: 'Rasoa Andriamihaja',
//     email: 'rasoa.andriamihaja@gmail.com',
//     department: 'DSI',
//     typeUser: 'Cadre',
//     habilitations: [
//       { id: 'hab-101', label: 'Accès Intranet' },
//       { id: 'hab-102', label: 'Accès Mail' }
//     ]
//   },
//   {
//     id: '2',
//     matricule: '00102',
//     name: 'Rakoto Ravalomanana',
//     email: 'rakoto.ravalomanana@gmail.com',
//     department: 'DRH',
//     typeUser: 'NonCadre',
//     habilitations: [{ id: 'hab-103', label: 'Accès Comptabilité' }]
//   },
//   {
//     id: '3',
//     matricule: '00103',
//     name: 'Rasoamanarivo Faralahy',
//     email: 'rasoamanarivo.faralahy@gmail.com',
//     department: 'DRH',
//     typeUser: 'Cadre',
//     habilitations: []
//   },
//   {
//     id: '4',
//     matricule: '00105',
//     name: 'Randriambololona Heritiana',
//     email: 'randriambololona.heritiana@gmail.com',
//     department: 'DSI',
//     typeUser: 'NonCadre',
//     habilitations: [{ id: 'hab-104', label: 'Accès CRM' }]
//   },
//   {
//     id: '5',
//     matricule: '00112',
//     name: 'Randrianarisoa Voahangy',
//     email: 'randrianarisoa.voahangy@gmail.com',
//     department: 'DCM',
//     typeUser: 'Cadre',
//     habilitations: []
//   },
//   {
//     id: '6',
//     matricule: '00113',
//     name: 'Rakotomalala Tahina',
//     email: 'rakotomalala.tahina@gmail.com',
//     department: 'DRH',
//     typeUser: 'NonCadre',
//     habilitations: []
//   },
//   {
//     id: '7',
//     matricule: '00114',
//     name: 'Rafalimanana Zo',
//     email: 'rafalimanana.zo@gmail.com',
//     department: 'DCM',
//     typeUser: 'Cadre',
//     habilitations: [{ id: 'hab-105', label: 'Accès Outils Prod' }]
//   },
//   {
//     id: '8',
//     matricule: '00115',
//     name: 'Razanamahasoa Ketaka',
//     email: 'razanamahasoa.ketaka@gmail.com',
//     department: 'DCM',
//     typeUser: 'NonCadre',
//     habilitations: []
//   },
//   {
//     id: '9',
//     matricule: '00116',
//     name: 'Razafy Lova',
//     email: 'razafy.lova@gmail.com',
//     department: 'DSI',
//     typeUser: 'Cadre',
//     habilitations: []
//   },
//   {
//     id: '10',
//     matricule: '00121',
//     name: 'Raharinirina Mbolatiana',
//     email: 'raharinirina.mbolatiana@gmail.com',
//     department: 'DCM',
//     typeUser: 'NonCadre',
//     habilitations: []
//   },
//   {
//     id: '11',
//     matricule: '00122',
//     name: 'Andrianarisoa Mamy',
//     email: 'andrianarisoa.mamy@gmail.com',
//     department: 'DCM',
//     typeUser: 'Cadre',
//     habilitations: []
//   },
//   {
//     id: '12',
//     matricule: '00123',
//     name: 'Raharimanana Salohy',
//     email: 'raharimanana.salohy@gmail.com',
//     department: 'DCM',
//     typeUser: 'Cadre',
//     habilitations: [{ id: 'hab-106', label: 'Accès Campagnes' }]
//   },
//   {
//     id: '13',
//     matricule: '00124',
//     name: 'Rajaonarison Mirana',
//     email: 'rajaonarison.mirana@gmail.com',
//     department: 'DRH',
//     typeUser: 'NonCadre',
//     habilitations: []
//   },
//   {
//     id: '14',
//     matricule: '00125',
//     name: 'Rakotonirina Tsilavina',
//     email: 'rakotonirina.tsilavina@gmail.com',
//     department: 'DRH',
//     typeUser: 'NonCadre',
//     habilitations: []
//   },
//   {
//     id: '15',
//     matricule: '00126',
//     name: 'Andriambololona Feno',
//     email: 'andriambololona.feno@gmail.com',
//     department: 'DSI',
//     typeUser: 'Cadre',
//     habilitations: [{ id: 'hab-107', label: 'Accès DevOps' }]
//   }
//   // Ajoutez plus d'items pour atteindre 100 si nécessaire
// ];

// ////////////////////////////////////////////////////////////////////////
// // 2) Composant principal
// ////////////////////////////////////////////////////////////////////////
// const ListeUtilisateur = () => {
//   const [openRow, setOpenRow] = useState(null);

//   // Champs de filtre
//   const [searchTerm, setSearchTerm] = useState('');
//   const [departmentFilter, setDepartmentFilter] = useState('');
//   const [typeUserFilter, setTypeUserFilter] = useState('');
//   const [matriculeFilter, setMatriculeFilter] = useState('');

//   // Tableau principal (local)
//   const [employees, setEmployees] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);

//   // Dialog de suppression d’habilitation
//   const [openDialog, setOpenDialog] = useState(false);
//   const [habilitationToDelete, setHabilitationToDelete] = useState({ userId: null, habilitationId: null, label: '' });

//   // Snackbar pour messages
//   const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

//   // État pour la synchronisation (fictive)
//   const [isSyncing, setIsSyncing] = useState(false);

//   // État pour la modale d’édition type user (fictive)
//   const [openEditDialog, setOpenEditDialog] = useState(false);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [newTypeUser, setNewTypeUser] = useState('');

//   // Permissions (forcées à true pour montrer les boutons)
//   const [canAssign, setCanAssign] = useState(true);
//   const [canEditUser, setCanEditUser] = useState(true);

//   // Pagination
//   const itemsPerPage = 5;

//   // 3) Au montage, on set la liste statique
//   useEffect(() => {
//     setEmployees(() => {
//       // On mappe le typeUser s’il faut, mais ici c’est déjà dans l’objet
//       return staticEmployees;
//     });
//   }, []);

//   // 4) Filtrage local (à chaque saisie)
//   const filterLocally = (nameOrMail, department, typeUser, matricule) => {
//     let filtered = staticEmployees;

//     // Nom ou email
//     if (nameOrMail) {
//       const lower = nameOrMail.toLowerCase();
//       filtered = filtered.filter(
//         (u) => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower)
//       );
//     }

//     // Département
//     if (department) {
//       const dLower = department.toLowerCase();
//       filtered = filtered.filter((u) => u.department.toLowerCase().includes(dLower));
//     }

//     // TypeUser
//     if (typeUser) {
//       filtered = filtered.filter((u) => u.typeUser === typeUser);
//     }

//     // Matricule
//     if (matricule) {
//       const mLower = matricule.toLowerCase();
//       filtered = filtered.filter((u) => u.matricule.toLowerCase().includes(mLower));
//     }

//     setEmployees(filtered);
//     setCurrentPage(1);
//   };

//   // Handlers pour chaque champ
//   const handleSearchChange = (event) => {
//     const value = event.target.value;
//     setSearchTerm(value);
//     filterLocally(value, departmentFilter, typeUserFilter, matriculeFilter);
//   };

//   const handleDepartmentChange = (event) => {
//     const value = event.target.value;
//     setDepartmentFilter(value);
//     filterLocally(searchTerm, value, typeUserFilter, matriculeFilter);
//   };

//   const handleTypeUserChange = (event) => {
//     const value = event.target.value;
//     setTypeUserFilter(value);
//     filterLocally(searchTerm, departmentFilter, value, matriculeFilter);
//   };

//   const handleMatriculeChange = (event) => {
//     const value = event.target.value;
//     setMatriculeFilter(value);
//     filterLocally(searchTerm, departmentFilter, typeUserFilter, value);
//   };

//   // 5) Ouverture/fermeture détails
//   const toggleRow = (id) => {
//     setOpenRow(openRow === id ? null : id);
//   };

//   // 6) Suppression d’habilitation (local)
//   const handleRemoveHabilitation = (userId, habilitationId, label) => {
//     setHabilitationToDelete({ userId, habilitationId, label });
//     setOpenDialog(true);
//   };

//   const confirmRemoveHabilitation = () => {
//     const { userId, habilitationId } = habilitationToDelete;

//     setEmployees((prev) =>
//       prev.map((emp) => {
//         if (emp.id === userId) {
//           return {
//             ...emp,
//             habilitations: emp.habilitations.filter((h) => h.id !== habilitationId)
//           };
//         }
//         return emp;
//       })
//     );

//     setSnackbar({ open: true, message: 'Habilitation supprimée avec succès.', severity: 'success' });

//     setOpenDialog(false);
//     setHabilitationToDelete({ userId: null, habilitationId: null, label: '' });
//   };

//   const cancelRemoveHabilitation = () => {
//     setOpenDialog(false);
//     setHabilitationToDelete({ userId: null, habilitationId: null, label: '' });
//   };

//   // 7) Faux handleAddClick (assignation)
//   const handleAddClick = (userId) => {
//     setSnackbar({ open: true, message: 'Fonction “Ajouter habilitation” non implémentée (démo)', severity: 'info' });
//   };

//   // 8) Synchronisation fictive
//   const handleSyncUsers = () => {
//     setIsSyncing(true);
//     setTimeout(() => {
//       // On ne fait rien de spécial, c’est du statique
//       setSnackbar({
//         open: true,
//         message: `Synchronisation fictive réussie !`,
//         severity: 'success'
//       });
//       setIsSyncing(false);
//     }, 1500);
//   };

//   // 9) Édition du type user (local)
//   const handleEditClick = (user) => {
//     setSelectedUser(user);

//     // Conversion string -> 0 ou 1
//     const typeMapping = {
//       Cadre: 0,
//       NonCadre: 1
//     };
//     const mappedType = typeMapping[user.typeUser] ?? null;

//     setNewTypeUser(mappedType);
//     setOpenEditDialog(true);
//   };

//   const handleUpdateUserType = () => {
//     if (!selectedUser) return;

//     const newVal = newTypeUser === 0 ? 'Cadre' : 'NonCadre';

//     setEmployees((prev) =>
//       prev.map((emp) =>
//         emp.id === selectedUser.id ? { ...emp, typeUser: newVal } : emp
//       )
//     );

//     setSnackbar({
//       open: true,
//       message: `Type d'utilisateur mis à jour localement en “${newVal}”.`,
//       severity: 'success'
//     });

//     setOpenEditDialog(false);
//   };

//   // 10) Pagination
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentEmployees = employees.slice(indexOfFirstItem, indexOfLastItem);

//   const handlePageChange = (event, newPage) => {
//     setCurrentPage(newPage);
//   };

//   ////////////////////////////////////////////////////////////////////////
//   // 11) Rendu JSX : on garde le design EXACT
//   ////////////////////////////////////////////////////////////////////////
//   return (
//     <Paper>
//       <MainCard>
//         <Grid container alignItems="center" justifyContent="space-between">
//           <Grid item>
//             {/* <Typography variant="subtitle2">Utilisateur</Typography> */}
//             <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
//               Liste des collaborateurs
//             </Typography>
//           </Grid>
//           <Grid item>
//             {canEditUser && (
//               <Button
//                 variant="contained"
//                 startIcon={<RefreshIcon />}
//                 sx={{ marginLeft: 2 }}
//                 onClick={handleSyncUsers}
//                 disabled={isSyncing}
//               >
//                 {isSyncing ? 'Actualisation...' : 'Actualiser'}
//               </Button>
//             )}
//           </Grid>
//         </Grid>
//       </MainCard>

//       {/* Filtres */}
//       <Box sx={{ padding: 2 }}>
//         <Grid container spacing={2}>
//           <Grid item xs={12} md={2}>
//             <TextField label="Matricule" variant="outlined" fullWidth value={matriculeFilter} onChange={handleMatriculeChange} />
//           </Grid>
//           <Grid item xs={12} md={2}>
//             <TextField label="Nom ou Email" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} />
//           </Grid>
//           <Grid item xs={12} md={2}>
//             <TextField label="Département" variant="outlined" fullWidth value={departmentFilter} onChange={handleDepartmentChange} />
//           </Grid>
//           <Grid item xs={12} md={2}>
//             <FormControl fullWidth variant="outlined">
//               <InputLabel id="type-user-label">Type</InputLabel>
//               <Select labelId="type-user-label" label="Type" value={typeUserFilter} onChange={handleTypeUserChange}>
//                 <MenuItem value="">—</MenuItem>
//                 <MenuItem value="Cadre">Cadre</MenuItem>
//                 <MenuItem value="NonCadre">Non-Cadre</MenuItem>
//               </Select>
//             </FormControl>
//           </Grid>
//         </Grid>
//       </Box>

//       {/* Tableau principal */}
//       <TableContainer component="div" sx={{ padding: 2 }}>
//         <Table aria-label="collapsible table" sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
//           <TableHead>
//             <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
//               <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
//                 Matricule
//               </TableCell>
//               <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
//                 Nom et prénom
//               </TableCell>
//               <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
//                 Email
//               </TableCell>
//               <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
//                 Département
//               </TableCell>
//               <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
//                 Type
//               </TableCell>
//               {canEditUser && (
//                 <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
//                   Action
//                 </TableCell>
//               )}
//               <TableCell />
//             </TableRow>
//           </TableHead>

//           <TableBody>
//             {currentEmployees.map((employee) => (
//               <React.Fragment key={employee.id}>
//                 <TableRow>
//                   {/* Matricule */}
//                   <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
//                     {/* Vous pouvez enlever le Link si vous n'en avez pas besoin */}
//                     {employee.matricule}
//                   </TableCell>

//                   {/* Nom & prénom */}
//                   <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{employee.name}</TableCell>

//                   {/* Email */}
//                   <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{employee.email}</TableCell>

//                   {/* Département */}
//                   <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{employee.department}</TableCell>

//                   {/* Type */}
//                   <TableCell
//                     sx={{
//                       fontSize: '0.9rem',
//                       padding: '12px',
//                       textAlign: 'center',
//                       borderRight: '1px solid #e0e0e0'
//                     }}
//                   >
//                     <Box
//                       sx={{
//                         display: 'inline-block',
//                         padding: '4px 12px',
//                         borderRadius: '4px',
//                         textAlign: 'center',
//                         fontSize: '0.875rem',
//                         color:
//                           employee.typeUser === 'Cadre'
//                             ? '#B07B00'
//                             : employee.typeUser === 'NonCadre'
//                             ? '#6baa1e'
//                             : '#ffffff',
//                         backgroundColor:
//                           employee.typeUser === 'Cadre'
//                             ? '#FFF5CC'
//                             : employee.typeUser === 'NonCadre'
//                             ? '#e8f2dc'
//                             : '#f8c7c5'
//                       }}
//                     >
//                       {employee.typeUser}
//                     </Box>
//                   </TableCell>

//                   {/* Action */}
//                   {canEditUser && (
//                     <TableCell sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
//                       <Button
//                         variant="outlined"
//                         color="primary"
//                         startIcon={<EditIcon />}
//                         onClick={() => handleEditClick(employee)}
//                         sx={{ textTransform: 'none', fontSize: 'small', padding: '8px 16px' }}
//                       >
//                         Modifier
//                       </Button>
//                     </TableCell>
//                   )}

//                   {/* Bouton expand/collapse */}
//                   <TableCell align="right">
//                     <IconButton
//                       size="small"
//                       onClick={() => toggleRow(employee.id)}
//                       sx={{ color: openRow === employee.id ? '#1976d2' : '#757575' }}
//                     >
//                       {openRow === employee.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
//                     </IconButton>
//                   </TableCell>
//                 </TableRow>

//                 {/* Détails (habilitations) */}
//                 <TableRow>
//                   <TableCell sx={{ padding: 0 }} colSpan={7}>
//                     <Collapse in={openRow === employee.id} timeout="auto" unmountOnExit>
//                       <Box sx={{ padding: '16px', backgroundColor: '#fafafa' }}>
//                         <Grid container alignItems="center" justifyContent="space-between" sx={{ marginBottom: 2 }}>
//                           <Typography variant="h6" component="div" color="textSecondary">
//                             Habilitations
//                           </Typography>
//                           {canAssign && (
//                             <Button
//                               variant="outlined"
//                               startIcon={<AddCircleIcon />}
//                               onClick={() => handleAddClick(employee.id)}
//                               sx={{ marginLeft: 2 }}
//                             >
//                               Ajouter
//                             </Button>
//                           )}
//                         </Grid>
//                         <Table size="small" aria-label="habilitation details">
//                           <TableHead>
//                             <TableRow>
//                               <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#555' }}>
//                                 Label
//                               </TableCell>
//                               {canAssign && (
//                                 <TableCell
//                                   align="right"
//                                   sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#555' }}
//                                 >
//                                   Action
//                                 </TableCell>
//                               )}
//                             </TableRow>
//                           </TableHead>
//                           <TableBody>
//                             {employee.habilitations.map((habilitation) => (
//                               <TableRow key={habilitation.id}>
//                                 <TableCell sx={{ fontSize: '0.875rem', color: '#333' }}>
//                                   {habilitation.label}
//                                 </TableCell>
//                                 {canAssign && (
//                                   <TableCell align="right">
//                                     <IconButton
//                                       size="small"
//                                       onClick={() =>
//                                         handleRemoveHabilitation(
//                                           employee.id,
//                                           habilitation.id,
//                                           habilitation.label
//                                         )
//                                       }
//                                       sx={{
//                                         color: '#f44336',
//                                         '&:hover': { backgroundColor: '#fdecea' }
//                                       }}
//                                     >
//                                       <ClearIcon />
//                                     </IconButton>
//                                   </TableCell>
//                                 )}
//                               </TableRow>
//                             ))}
//                           </TableBody>
//                         </Table>
//                       </Box>
//                     </Collapse>
//                   </TableCell>
//                 </TableRow>
//               </React.Fragment>
//             ))}
//           </TableBody>
//         </Table>
//       </TableContainer>

//       {/* Pagination */}
//       <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
//         <Pagination
//           count={Math.ceil(employees.length / itemsPerPage)}
//           page={currentPage}
//           onChange={handlePageChange}
//           variant="outlined"
//           shape="rounded"
//           color="primary"
//           sx={{
//             '& .MuiPaginationItem-root': {
//               padding: '6px 12px',
//               fontSize: '1rem',
//               margin: '0 4px',
//               color: '#4a4a4a',
//               backgroundColor: '#f7f9fc',
//               border: '1px solid #ddd',
//               transition: 'all 0.3s ease',
//               '&:hover': {
//                 backgroundColor: '#e0e7ff',
//                 color: '#3f51b5'
//               },
//               marginBottom: 2,
//               marginTop: 2
//             },
//             '& .MuiPaginationItem-root.Mui-selected': {
//               backgroundColor: '#3f51b5',
//               color: '#ffffff',
//               fontWeight: 'bold',
//               borderColor: '#3f51b5',
//               transform: 'scale(1.05)',
//               boxShadow: '0 4px 10px rgba(63, 81, 181, 0.2)'
//             }
//           }}
//         />
//       </Grid>

//       {/* Dialog de Confirmation de Suppression */}
//       <Dialog
//         open={openDialog}
//         onClose={cancelRemoveHabilitation}
//         aria-labelledby="confirm-delete-dialog-title"
//         aria-describedby="confirm-delete-dialog-description"
//       >
//         <DialogTitle id="confirm-delete-dialog-title">Confirmer la suppression</DialogTitle>
//         <DialogContent>
//           <DialogContentText id="confirm-delete-dialog-description">
//             Êtes-vous sûr de vouloir supprimer l'habilitation <strong>{habilitationToDelete.label}</strong> ? Cette action
//             est irréversible.
//           </DialogContentText>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={cancelRemoveHabilitation} color="primary">
//             Annuler
//           </Button>
//           <Button onClick={confirmRemoveHabilitation} color="error" variant="contained">
//             Supprimer
//           </Button>
//         </DialogActions>
//       </Dialog>

//       {/* Dialog d'édition du type d'utilisateur */}
//       <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} aria-labelledby="edit-user-type-dialog-title">
//         <DialogTitle id="edit-user-type-dialog-title">Modifier le Type d'Utilisateur</DialogTitle>
//         <DialogContent>
//           <DialogContentText>
//             Sélectionnez le nouveau type pour l'utilisateur <strong>{selectedUser?.name}</strong>.
//           </DialogContentText>
//           <FormControl fullWidth variant="outlined" sx={{ marginTop: 2 }}>
//             <InputLabel id="new-type-user-label">Type</InputLabel>
//             <Select
//               labelId="new-type-user-label"
//               label="Type"
//               value={newTypeUser}
//               onChange={(e) => setNewTypeUser(e.target.value)}
//             >
//               <MenuItem value={0}>Cadre</MenuItem>
//               <MenuItem value={1}>Non-Cadre</MenuItem>
//             </Select>
//           </FormControl>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setOpenEditDialog(false)} color="primary">
//             Annuler
//           </Button>
//           <Button onClick={handleUpdateUserType} color="secondary" variant="contained">
//             Sauvegarder
//           </Button>
//         </DialogActions>
//       </Dialog>

//       {/* Snackbar pour afficher messages */}
//       <Snackbar
//         open={snackbar.open}
//         autoHideDuration={4000}
//         onClose={() => setSnackbar({ ...snackbar, open: false })}
//         message={snackbar.message}
//         anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
//       />
//     </Paper>
//   );
// };

// export default ListeUtilisateur;
