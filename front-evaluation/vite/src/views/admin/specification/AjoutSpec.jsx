import React, { useState, useEffect } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { Select, MenuItem, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authInstance } from '../../../axiosConfig';
import Alert from '@mui/material/Alert';

const AjoutSpec = () => {
    const [formData, setFormData] = useState({ name: '', sectionId: '' });
    const [sections, setSections] = useState([]); // État pour stocker les sections
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const response = await authInstance.get('/Habilitation/section');
                setSections(response.data); // Stocker les sections récupérées
            } catch (error) {
                console.error('Erreur lors de la récupération des sections:', error);
                setErrorMessage('Erreur lors de la récupération des sections.');
            }
        };
        fetchSections();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        console.log('Payload being sent:', formData);
    
        try {
            const response = await authInstance.post('/Habilitation/addAdmin', {
                name: formData.name,
                sectionId: formData.sectionId,
            });
    
            if (response.status === 200) {
                navigate('/Specification/listeSpec');
            }
        } catch (error) {
            if (error.response) {
                const message = typeof error.response.data === 'string' ? error.response.data : "Une erreur s'est produite.";
                setErrorMessage(message);
            } else {
                setErrorMessage("Une erreur s'est produite : " + error.message);
            }
        }
    };    

    return (
        <MainCard>
            <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                    <Grid container direction="column" spacing={1}>
                        <Grid item>
                            <Typography variant="subtitle2">Spécification</Typography>
                        </Grid>
                        <Grid item>
                            <Typography variant="h3">Ajouter une nouvelle spécification</Typography>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            {errorMessage && (
                <Alert severity="error" style={{ margin: '20px' }}>
                    {errorMessage}
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3} mt={3}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Nom"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Select
                            fullWidth
                            name="sectionId"
                            value={formData.sectionId}  // Correction ici
                            onChange={handleChange}
                            displayEmpty
                        >
                            <MenuItem value="" disabled>
                                Sélectionnez une section
                            </MenuItem>
                            {sections.map((section) => (
                                <MenuItem key={section.id} value={section.id}>
                                    {section.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Grid>
                    <Grid item xs={12}>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            type="submit"
                            style={{ float: 'right' }}
                        >
                            Ajouter
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </MainCard>
    );
};

export default AjoutSpec;
