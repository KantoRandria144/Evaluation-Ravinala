import React, { useState, useEffect } from 'react';
import { formulaireInstance } from '../../../axiosConfig';
import {
  Box,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  TextField,
  Card,
  CardContent,
  TablePagination,
  MenuItem,
  IconButton, // Importation du composant IconButton
  Menu // Importation du composant Menu
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // Importation de l'icône à trois points
import { LocalizationProvider, DesktopDatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import * as XLSX from 'xlsx'; // Importation de la bibliothèque xlsx
import jsPDF from 'jspdf'; // Importation de la bibliothèque jsPDF
import 'jspdf-autotable'; // Importation de jsPDF-AutoTable

const ResultSummary = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(new Date(`${currentYear - 1}-01-01`));
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [customRowsPerPage, setCustomRowsPerPage] = useState(10);

  // États pour le menu de téléchargement
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const fetchScores = async (year) => {
    setLoading(true);
    setError(null);
    setScores([]);

    try {
      const response = await formulaireInstance.get(`/Stat/getEvaluationFinaleScores/${year}`);
      setScores(response.data);
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message || 'Erreur lors de la récupération des données.');
      } else if (err.request) {
        setError('Aucune réponse du serveur. Veuillez vérifier votre connexion.');
      } else {
        setError('Erreur: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const year = selectedYear.getFullYear();
    fetchScores(year);
  }, [selectedYear]);

  const handleYearChange = (date) => {
    if (date) {
      setSelectedYear(date);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setCustomRowsPerPage(value);
    setRowsPerPage(value);
    setPage(0);
  };

  // Gestionnaires pour le menu de téléchargement
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Fonction pour télécharger les données en Excel
  const downloadExcel = () => {
    // Préparer toutes les données
    const dataToExport = scores.map((user, index) => ({
      '#': index + 1,
      Matricule: user.matricule,
      Nom: user.name,
      Département: user.department,
      Score: user.score
    }));

    // Créer une nouvelle feuille de calcul à partir des données
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Créer un nouveau classeur et ajouter la feuille de calcul
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scores');

    // Générer le fichier Excel et le télécharger
    XLSX.writeFile(workbook, `Scores_${selectedYear.getFullYear()}.xlsx`);

    // Fermer le menu après le téléchargement
    handleMenuClose();
  };

  // Fonction pour télécharger les données en PDF
  const downloadPDF = () => {
    const doc = new jsPDF();

    // Titre
    doc.setFontSize(18);
    doc.text('Résultat des collaborateurs cadre', 14, 22);

    // Sous-titre avec l'année sélectionnée
    doc.setFontSize(12);
    doc.text(`Année: ${selectedYear.getFullYear()}`, 14, 30);

    // Préparer les données pour la table
    const tableColumn = ['#', 'Matricule', 'Nom', 'Département', 'Contrat d\'objectif'];
    const tableRows = scores.map((user, index) => [index + 1, user.matricule, user.name, user.department, user.score]);

    // Ajouter la table au document PDF
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35
    });

    // Générer le fichier PDF et le télécharger
    doc.save(`Scores_${selectedYear.getFullYear()}.pdf`);

    // Fermer le menu après le téléchargement
    handleMenuClose();
  };

  return (
    <Grid container justifyContent="center" spacing={3}>
      <Grid item xs={12} sm={12} md={12}>
        <Card>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Typography variant="h4" gutterBottom>
                  Résultat des collaborateurs cadre
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} container justifyContent="flex-end" alignItems="center">
                <IconButton
                  aria-label="more"
                  aria-controls={openMenu ? 'download-menu' : undefined}
                  aria-haspopup="true"
                  onClick={handleMenuClick}
                >
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  id="download-menu"
                  anchorEl={anchorEl}
                  open={openMenu}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                  }}
                >
                  <MenuItem onClick={downloadExcel}>Télécharger Excel</MenuItem>
                  <MenuItem onClick={downloadPDF}>Télécharger PDF</MenuItem>
                </Menu>
              </Grid>
            </Grid>

            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={6} mt={2}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DesktopDatePicker
                    views={['year']}
                    label="Choisir l'année"
                    minDate={new Date('2000-01-01')}
                    maxDate={new Date('2100-12-31')}
                    value={selectedYear}
                    onChange={handleYearChange}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              {/* Remplacement du bouton de téléchargement par un menu à trois points */}
            </Grid>

            <Box mt={4}>
              {loading && (
                <Box display="flex" justifyContent="center" my={2}>
                  <CircularProgress />
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {!loading && !error && scores.length === 0 && <Alert severity="info">Aucune donnée trouvée pour l'année sélectionnée.</Alert>}

              {scores.length > 0 && (
                <Paper>
                  <Table aria-label="collapsible table" sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px',borderRight: '1px solid #e0e0e0' }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px',borderRight: '1px solid #e0e0e0' }}>Matricule</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px',borderRight: '1px solid #e0e0e0' }}>Nom</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px',borderRight: '1px solid #e0e0e0' }}>Département</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px',borderRight: '1px solid #e0e0e0' }}>Contrat d'objectif</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scores.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user, index) => (
                        <TableRow key={user.userId}>
                          <TableCell sx={{ padding: '12px',borderRight: '1px solid #e0e0e0' }}>{page * rowsPerPage + index + 1}</TableCell>
                          <TableCell sx={{ padding: '12px',borderRight: '1px solid #e0e0e0' }}>{user.matricule}</TableCell>
                          <TableCell sx={{ padding: '12px',borderRight: '1px solid #e0e0e0' }}>{user.name}</TableCell>
                          <TableCell sx={{ padding: '12px',borderRight: '1px solid #e0e0e0' }}>{user.department}</TableCell>
                          <TableCell sx={{ padding: '12px',borderRight: '1px solid #e0e0e0' }}>{user.score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Box display="flex"
                    justifyContent="flex-end"
                    alignItems="center"
                    px={2}
                    py={1}
                    gap={2}>
                    <TextField
                      select
                      value={customRowsPerPage}
                      onChange={handleRowsPerPageChange}
                      size="small"
                      sx={{ width: '100px', mr: 2 }}
                    >
                      {[5, 10, 20, 50, 100].map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TablePagination
                      rowsPerPageOptions={[]}
                      component="div"
                      count={scores.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                    />
                  </Box>
                </Paper>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ResultSummary;
