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
  TextField,
  Checkbox,
  FormHelperText,
} from '@mui/material';
import { authInstance } from '../../../axiosConfig';
import MainCard from 'ui-component/cards/MainCard';
import { useNavigate } from 'react-router-dom';
import AuditService from '../../../services/AuditService';

const AjoutHabilitation = () => {
  const [specs, setSpecs] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [errors, setErrors] = useState({}); // Gestion des erreurs personnalisées
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;
  const fetchSpecs = async () => {
    try {
      const response = await authInstance.get('/Habilitation/admins');
      // await AuditService.logAction(
      //   userId,
      //   'Consultation de la liste des habilitations administratives',
      //   'Habilitation',
      //   null
      // );
      setSpecs(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des specs');
    }
  };

  useEffect(() => {
    fetchSpecs();
  }, []);

  const handleCheckboxChange = (id) => {
    setSelectedIds((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((selectedId) => selectedId !== id)
        : [...prevSelected, id]
    );

    // Réinitialiser l'erreur des cases à cocher
    setErrors((prevErrors) => ({ ...prevErrors, selectedIds: '' }));
  };

  const validate = () => {
    const newErrors = {};

    // Validation pour le champ Label
    if (!newLabel.trim()) {
      newErrors.newLabel = "Le label est requis. Veuillez entrer un nom pour l'habilitation.";
    }

    // Validation des cases à cocher
    if (selectedIds.length === 0) {
      newErrors.selectedIds = "Veuillez sélectionner au moins une habilitation pour continuer.";
    }

    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors); // Affiche les erreurs si la validation échoue
      return;
    }

    try {
      const habilitationAdmins = specs
        .filter((spec) => selectedIds.includes(spec.id))
        .map((spec) => ({ id: spec.id, name: spec.name, sectionName: spec.sectionName }));

      const newSpec = {
        label: newLabel,
        habilitationAdmins: habilitationAdmins,
      };

      console.log("Objet envoyé à l'API:", newSpec);

      const response = await authInstance.post('/Habilitation', newSpec);
      await AuditService.logAction(
        userId,
        "Ajout d'une nouvelle habilitation",
        "Habilitation",
        response.data?.id?.toString() || null,   
        null,                                    
        newSpec
      );
      setSpecs((prevSpecs) => [...prevSpecs, response.data]);
      setNewLabel(''); // Réinitialiser le champ après la soumission
      setSelectedIds([]); // Réinitialiser les IDs sélectionnés
      setErrors({}); // Réinitialiser les erreurs

      navigate('/habilitation/ListeHabilitation');
    } catch (err) {
      console.error('Une erreur est survenue lors de l\'ajout.');
    }
  };

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Grid container direction="column" spacing={1}>
              <Grid item>
                <Typography variant="subtitle2">Habilitation</Typography>
              </Grid>
              <Grid item>
                <Typography variant="h3">Ajouter une nouvelle habilitation</Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3} mt={1}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Label"
                name="label"
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  setErrors((prevErrors) => ({ ...prevErrors, newLabel: '' })); // Réinitialiser l'erreur
                }}
                error={!!errors.newLabel}
                helperText={errors.newLabel}
              />
            </Grid>
          </Grid>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Selectionner</TableCell>
                  <TableCell>Label</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(
                  specs.reduce((acc, spec) => {
                    if (!acc[spec.sectionName]) {
                      acc[spec.sectionName] = [];
                    }
                    acc[spec.sectionName].push(spec);
                    return acc;
                  }, {})
                ).map(([sectionName, specs]) => (
                  <React.Fragment key={sectionName}>
                    {/* Afficher le nom de la section */}
                    <TableRow>
                      <TableCell colSpan={2} style={{ fontWeight: 'bold', backgroundColor: '#e8f2dc' }}>
                        {sectionName}
                      </TableCell>
                    </TableRow>
                    {/* Afficher les habilitations de la section */}
                    {specs.map((spec) => (
                      <TableRow key={spec.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(spec.id)}
                            onChange={() => handleCheckboxChange(spec.id)}
                          />
                        </TableCell>
                        <TableCell>{spec.name}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            {errors.selectedIds && (
              <FormHelperText error style={{ margin: '8px 16px' }}>
                {errors.selectedIds}
              </FormHelperText>
            )}
          </TableContainer>

          <Grid container justifyContent="flex-end" item xs={12} mt={2}>
            <Button type="submit" variant="contained" color="primary">
              Ajouter
            </Button>
          </Grid>
        </form>
      </MainCard>
    </Paper>
  );
};

export default AjoutHabilitation;