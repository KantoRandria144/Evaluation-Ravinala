import React, { useState, useEffect } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import {
  Grid,
  Typography,
  TextField,
  Button,
  Alert,
  Select,
  MenuItem,
  FormHelperText,
  FormControl,
  InputLabel,
} from '@mui/material';
import { formulaireInstance } from '../../../axiosConfig';
import { useNavigate } from 'react-router-dom';
import AuditService from '../../../services/AuditService';

const Ajout = () => {
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    evalAnnee: '',
    fixationObjectif: '',
    miParcours: '',
    final: '',
    etatId: 1,
    templateId: '',
    titre: '',
    type: '',
  });

  const [errors, setErrors] = useState({});
  const [backendErrors, setBackendErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await formulaireInstance.get('/Template/GetAllTemplates');
        setTemplates(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des templates:", error);
      }
    };

    fetchTemplates();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'type') {
      if (value === 'Cadre') {
        setFormData({
          ...formData,
          type: value,
          templateId: 1, // Définit automatiquement templateId à 1 pour "Cadre"
        });
      } else if (value === 'NonCadre') {
        setFormData({
          ...formData,
          type: value,
          templateId: 2, // Définit automatiquement templateId à 2 pour "NonCadre"
        });
      } else {
        setFormData({
          ...formData,
          type: value,
          templateId: '', // Réinitialise templateId si ce n'est ni "Cadre" ni "NonCadre"
        });
      }

      // Efface les erreurs liées au type et au templateId si nécessaire
      setErrors((prevErrors) => ({
        ...prevErrors,
        type: '',
        templateId: '',
      }));
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });

      // Efface les erreurs pour le champ modifié
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Validation pour "Année"
    if (!formData.evalAnnee) {
      newErrors.evalAnnee = "L'année est requise.";
    } else if (!/^\d+$/.test(formData.evalAnnee)) {
      newErrors.evalAnnee = "L'année doit être un entier.";
    } else if (parseInt(formData.evalAnnee) < 2000 || parseInt(formData.evalAnnee) > 2100) {
      newErrors.evalAnnee = "L'année d'évaluation doit être entre 2000 et 2100.";
    }

    // Validation pour "Titre"
    if (!formData.titre) {
      newErrors.titre = "Le titre est requis.";
    }

    // Validation pour "Type"
    if (!formData.type) {
      newErrors.type = "Le type d'évaluation est requis.";
    }

    // Validation pour "Template ID" (uniquement si type n'est ni "Cadre" ni "NonCadre")
    if (formData.type !== 'Cadre' && formData.type !== 'NonCadre' && !formData.templateId) {
      newErrors.templateId = "Un formulaire doit être sélectionné.";
    }

    // Validation pour les dates
    if (!formData.fixationObjectif) {
      newErrors.fixationObjectif = "La date de fixation des objectifs est requise.";
    }
    if (!formData.miParcours) {
      newErrors.miParcours = "La date de mi-parcours est requise.";
    }
    if (!formData.final) {
      newErrors.final = "La date finale est requise.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setBackendErrors([]);
      setSuccessMessage('');
      
      return;
    }

    try {
      const response = await formulaireInstance.post(`/Periode?userId=${userId}`, formData);

      if (response.data.success) {
        await AuditService.logAction(
          userId,
          'Ajout d\'une nouvelle période d\'évaluation',
          'Create',
          null,
          null,
          { ...formData }
        );
        setBackendErrors([]);
        setIsDataUpdated(true);
        setSuccessMessage('Période d\'évaluation ajoutée avec succès.');
    
        // Réinitialiser les champs
        setFormData({
          evalAnnee: '',
          fixationObjectif: '',
          miParcours: '',
          final: '',
          etatId: 1,
          templateId: '',
          titre: '',
          type: '',
        });

        navigate('/evaluation/listeEvaluation');
      } else {
        // Dans le cas où le backend retourne Success: false avec HTTP 200
        setBackendErrors(response.data.errors || []);
        setSuccessMessage('');
      }
    } catch (error) {
      const errors = error.response?.data?.errors;
      if (errors && Array.isArray(errors)) {
        setBackendErrors(errors);
      } else {
        setBackendErrors([error.response?.data?.message || 'Une erreur est survenue.']);
      }
      setSuccessMessage('');
      
    }
  };

  useEffect(() => {
    if (isDataUpdated) {
      setIsDataUpdated(false);
    }
  }, [isDataUpdated]);

  // Trouver le nom du template par templateId
  const getTemplateNameById = (id) => {
    const template = templates.find(t => t.templateId === id);
    return template ? template.name : '';
  };

  return (
    <MainCard>
      <Grid container alignItems="center" justifyContent="space-between">
        <Grid item>
          <Grid container direction="column" spacing={1}>
            <Grid item>
              <Typography variant="subtitle2">Évaluation</Typography>
            </Grid>
            <Grid item>
              <Typography variant="h3">Ajouter une nouvelle période d'évaluation</Typography>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Affichage des messages d'erreur du backend */}
      {backendErrors.length > 0 && (
        <Alert severity="error" style={{ margin: '20px' }}>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {backendErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Affichage du message de succès */}
      {successMessage && (
        <Alert severity="success" style={{ margin: '20px' }}>
          {successMessage}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3} mt={3}>
          {/* Première rangée */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Année"
              name="evalAnnee"
              value={formData.evalAnnee}
              onChange={handleChange}
              error={!!errors.evalAnnee}
              helperText={errors.evalAnnee}
              inputProps={{
                maxLength: 4,
                minLength: 4,
                inputMode: 'numeric',
                pattern: '[0-9]*',
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Titre"
              name="titre"
              value={formData.titre}
              onChange={handleChange}
              error={!!errors.titre}
              helperText={errors.titre}
            />
          </Grid>

          {/* Deuxième rangée */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.type}>
              <InputLabel id="type-label">Type d'évaluation</InputLabel>
              <Select
                labelId="type-label"
                name="type"
                value={formData.type}
                onChange={handleChange}
                label="Type d'évaluation"
              >
                <MenuItem value="">
                  <em>Sélectionner le type d'évaluation</em>
                </MenuItem>
                <MenuItem value="Cadre">Cadre</MenuItem>
                <MenuItem value="NonCadre">Non Cadre</MenuItem>
              </Select>
              <FormHelperText>{errors.type}</FormHelperText>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.templateId}>
              <InputLabel id="template-label">Formulaire</InputLabel>
              <Select
                labelId="template-label"
                name="templateId"
                value={
                  formData.type === 'Cadre'
                    ? 1
                    : formData.type === 'NonCadre'
                    ? 2
                    : formData.templateId
                }
                onChange={handleChange}
                label="Formulaire"
                disabled={
                  !formData.type ||
                  formData.type === 'Cadre' ||
                  formData.type === 'NonCadre'
                }
              >
                <MenuItem value="">
                  {formData.type
                    ? formData.type === 'Cadre' || formData.type === 'NonCadre'
                      ? 'Formulaire défini automatiquement'
                      : 'Sélectionner un formulaire'
                    : 'Choisissez un type d\'évaluation d\'abord'}
                </MenuItem>
                {(formData.type === 'Cadre' || formData.type === 'NonCadre') && (
                  <MenuItem
                    value={formData.type === 'Cadre' ? 1 : 2}
                  >
                    {getTemplateNameById(formData.type === 'Cadre' ? 1 : 2)}
                  </MenuItem>
                )}
                {formData.type !== 'Cadre' && formData.type !== 'NonCadre' &&
                  templates.map((template) => (
                    <MenuItem key={template.templateId} value={template.templateId}>
                      {template.name}
                    </MenuItem>
                  ))}
              </Select>
              <FormHelperText>{errors.templateId}</FormHelperText>
            </FormControl>
          </Grid>

          {/* Troisième rangée */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Fixation des objectifs"
              type="date"
              name="fixationObjectif"
              value={formData.fixationObjectif}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              error={!!errors.fixationObjectif}
              helperText={errors.fixationObjectif}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Mi-parcours"
              type="date"
              name="miParcours"
              value={formData.miParcours}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              error={!!errors.miParcours}
              helperText={errors.miParcours}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Final"
              type="date"
              name="final"
              value={formData.final}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              error={!!errors.final}
              helperText={errors.final}
            />
          </Grid>

          {/* Bouton d'envoi */}
          <Grid item xs={12}>
            <Grid container justifyContent="flex-end" mt={2}>
              <Button type="submit" variant="contained" color="primary">
                Ajouter
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </form>
    </MainCard>
  );
};

export default Ajout;
