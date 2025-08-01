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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Box,
  Collapse,
  IconButton,
} from '@mui/material';
import { authInstance } from '../../../axiosConfig';
import { useNavigate } from 'react-router-dom';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MainCard from 'ui-component/cards/MainCard';

const ListeSpec = () => {
  const [specs, setSpecs] = useState([]);
  const [groupedSpecs, setGroupedSpecs] = useState({});
  const [openSection, setOpenSection] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchSpecs = async () => {
    try {
      const response = await authInstance.get('/Habilitation/admins');
      setSpecs(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des spécifications', err);
    }
  };

  useEffect(() => {
    fetchSpecs();
  }, []);

  useEffect(() => {
    const grouped = specs.reduce((acc, spec) => {
      const sectionName = spec.sectionName || 'Non défini';
      if (!acc[sectionName]) {
        acc[sectionName] = [];
      }
      acc[sectionName].push(spec);
      return acc;
    }, {});
    setGroupedSpecs(grouped);
  }, [specs]);

  const handleAddClick = () => {
    navigate('/specification/AjoutSpec');
  };

  const handleEditClick = (id) => {
    navigate(`/specification/editSpec/${id}`);
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setOpenDialog(true);
  };

  const confirmDelete = async () => {
    if (deleteId !== null) {
      try {
        await authInstance.delete(`/Habilitation/admins/${deleteId}`);
        setSpecs(specs.filter((spec) => spec.id !== deleteId));
      } catch (err) {
        console.error('Erreur lors de la suppression de la spécification', err);
      } finally {
        setOpenDialog(false);
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const toggleSection = (sectionName) => {
    setOpenSection(openSection === sectionName ? null : sectionName);
  };

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="subtitle2">Spécification</Typography>
            <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
              Liste des spécifications
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleAddClick}
              startIcon={<AddCircleIcon />}
            >
              Ajouter
            </Button>
          </Grid>
        </Grid>
      </MainCard>

      {Object.entries(groupedSpecs).map(([sectionName, habilitations]) => (
        <TableContainer key={sectionName} component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell colSpan={3}>
                  <Box display="flex" alignItems="center">
                    <Typography
                      sx={{ flexGrow: 1 }}
                    >
                      {sectionName}
                    </Typography>
                    <IconButton color='success' onClick={() => toggleSection(sectionName)}>
                      {openSection === sectionName ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={3} style={{ paddingBottom: 0, paddingTop: 0 }}>
                  <Collapse in={openSection === sectionName} timeout="auto" unmountOnExit>
                    <Box
                      sx={{
                        margin: 1,
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '1rem',
                        backgroundColor: '#f9f9f9', // Vous pouvez aussi ajuster cette couleur
                      }}
                    >
                        <Typography variant="h6" component="div" color="textSecondary">
                          Spécifications
                        </Typography>

                      <Table size="small" aria-label={`habilitation details for ${sectionName}`} sx={{ mt: 1 }}>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                            <TableCell><strong>Nom</strong></TableCell>
                            <TableCell><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {habilitations.map((spec) => (
                            <TableRow key={spec.id} hover sx={{ '&:hover': { backgroundColor: '#eaf1fc' } }}>
                              <TableCell>{spec.name}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1}>
                                  <Button
                                    onClick={() => handleEditClick(spec.id)}
                                    startIcon={<EditIcon />}
                                    color="primary"
                                    variant="outlined"
                                    size="small"
                                  >
                                    Éditer
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteClick(spec.id)}
                                    startIcon={<DeleteIcon />}
                                    color="error"
                                    variant="outlined"
                                    size="small"
                                  >
                                    Supprimer
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      ))}

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Confirmation de suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer cette spécification ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Annuler
          </Button>
          <Button onClick={confirmDelete} color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ListeSpec;
