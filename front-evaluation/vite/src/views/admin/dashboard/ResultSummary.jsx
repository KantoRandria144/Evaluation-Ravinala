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
  IconButton,
  Menu,
  Collapse,
  Chip
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { LocalizationProvider, DesktopDatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import * as XLSX from 'xlsx'; // Importation de la bibliothèque xlsx
import jsPDF from 'jspdf'; // Importation de la bibliothèque jsPDF
import 'jspdf-autotable';

// Composant Row pour gérer l'expand/collapse des objectifs
function Row({ user, index, page, rowsPerPage }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow key={user.userId}>
        <TableCell sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
          {page * rowsPerPage + index + 1}
        </TableCell>
        <TableCell sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
          {user.matricule}
        </TableCell>
        <TableCell sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
          {user.name}
        </TableCell>
        <TableCell sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
          {user.department}
        </TableCell>
        <TableCell sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
          {user.score}
        </TableCell>
        <TableCell sx={{ padding: '12px', borderRight: '1px solid #e0e0e0' }}>
          {user.objectives && user.objectives.length > 0 ? (
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Aucun objectif
            </Typography>
          )}
        </TableCell>
      </TableRow>
      {user.objectives && user.objectives.length > 0 && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1 }}>
                <Typography variant="h6" gutterBottom component="div">
                  Détails des objectifs
                </Typography>
                {user.objectives.map((objective, objIndex) => (
                  <Box key={objIndex} sx={{ mb: 2 }}>
                    <Chip 
                      label={objective.columnName} 
                      color="primary" 
                      sx={{ mb: 1 }} 
                    />
                    <Box sx={{ ml: 2 }}>
                      {objective.values.map((value, valueIndex) => (
                        <Box key={valueIndex} sx={{ mb: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                          <Typography variant="body2">
                            <strong>Valeur:</strong> {value.value}
                          </Typography>
                          {value.validatedBy && (
                            <Typography variant="caption" color="textSecondary">
                              Validé par: {value.validatedBy} le {new Date(value.createdAt).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

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

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Fonction pour télécharger les données en Excel avec les objectifs
  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Feuille principale avec résumé des scores
    const mainData = scores.map((user, index) => ({
      '#': index + 1,
      Matricule: user.matricule,
      Nom: user.name,
      Email: user.email,
      Département: user.department,
      Score: user.score,
      'Nombre d\'objectifs': user.objectives ? user.objectives.length : 0
    }));

    const mainWorksheet = XLSX.utils.json_to_sheet(mainData);
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Résumé des scores');

    // Feuille détaillée avec les objectifs
    const detailData = [];
    scores.forEach((user, userIndex) => {
      if (user.objectives && user.objectives.length > 0) {
        user.objectives.forEach((objective, objIndex) => {
          objective.values.forEach((value, valueIndex) => {
            detailData.push({
              '#': userIndex + 1,
              Matricule: user.matricule,
              Nom: user.name,
              Département: user.department,
              Score: user.score,
              'Type d\'objectif': objective.columnName,
              'Détail': value.value,
              'Validé par': value.validatedBy || '',
              'Date de création': new Date(value.createdAt).toLocaleDateString('fr-FR')
            });
          });
        });
      } else {
        // Ajouter une ligne même si pas d'objectifs
        detailData.push({
          '#': userIndex + 1,
          Matricule: user.matricule,
          Nom: user.name,
          Département: user.department,
          Score: user.score,
          'Type d\'objectif': 'Aucun objectif',
          'Détail': '',
          'Validé par': '',
          'Date de création': ''
        });
      }
    });

    const detailWorksheet = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailWorksheet, 'Détails des objectifs');

    // Générer le fichier Excel
    XLSX.writeFile(workbook, `Scores_detailles_${selectedYear.getFullYear()}.xlsx`);
    handleMenuClose();
  };

  // Fonction pour télécharger les données en PDF avec objectifs
  const downloadPDF = () => {
    const doc = new jsPDF('landscape'); // Mode paysage pour plus d'espace

    // Titre
    doc.setFontSize(18);
    doc.text('Résultat des collaborateurs C7-C13', 14, 22);

    // Sous-titre avec l'année sélectionnée
    doc.setFontSize(12);
    doc.text(`Année: ${selectedYear.getFullYear()}`, 14, 30);

    // Tableau principal des scores
    const tableColumn = ['#', 'Matricule', 'Nom', 'Département', 'Score', 'Nb Objectifs'];
    const tableRows = scores.map((user, index) => [
      index + 1, 
      user.matricule, 
      user.name, 
      user.department, 
      user.score,
      user.objectives ? user.objectives.length : 0
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Page séparée pour les détails des objectifs
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Détails des objectifs', 14, 22);

    let yPosition = 35;
    scores.forEach((user, userIndex) => {
      if (user.objectives && user.objectives.length > 0) {
        // Vérifier si on a assez de place sur la page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${user.name} (${user.matricule}) - Score: ${user.score}`, 14, yPosition);
        yPosition += 10;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);

        user.objectives.forEach((objective) => {
          doc.text(`Type: ${objective.columnName}`, 20, yPosition);
          yPosition += 7;

          objective.values.forEach((value) => {
            // Diviser le texte long en plusieurs lignes
            const splitText = doc.splitTextToSize(`• ${value.value}`, 250);
            doc.text(splitText, 25, yPosition);
            yPosition += splitText.length * 5;
            
            if (value.validatedBy) {
              doc.setFontSize(8);
              doc.text(`Validé par: ${value.validatedBy} le ${new Date(value.createdAt).toLocaleDateString('fr-FR')}`, 30, yPosition);
              yPosition += 5;
              doc.setFontSize(10);
            }
            yPosition += 3;
          });
          yPosition += 5;
        });
        yPosition += 10;
      }
    });

    doc.save(`Scores_detailles_${selectedYear.getFullYear()}.pdf`);
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
                  Résultat des collaborateurs C7-C13
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
                  <MenuItem onClick={downloadExcel}>Télécharger Excel détaillé</MenuItem>
                  <MenuItem onClick={downloadPDF}>Télécharger PDF détaillé</MenuItem>
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

              {!loading && !error && scores.length === 0 && (
                <Alert severity="info">Aucune donnée trouvée pour l'année sélectionnée.</Alert>
              )}

              {scores.length > 0 && (
                <Paper>
                  <Table aria-label="collapsible table" sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                          #
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                          Matricule
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                          Nom
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                          Département
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                          Contrat d'objectif
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                          Objectifs
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scores.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user, index) => (
                        <Row 
                          key={user.userId} 
                          user={user} 
                          index={index} 
                          page={page} 
                          rowsPerPage={rowsPerPage} 
                        />
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