import React, { useEffect, useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import { Grid, Typography, Button, Alert, TextField, Autocomplete, Checkbox, Paper } from '@mui/material';
import { authInstance } from '../../../axiosConfig';
import Popper from '@mui/material/Popper';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useParams } from 'react-router-dom';

// Custom Popper for dropdown style
const CustomPopper = (props) => <Popper {...props} style={{ width: '500px' }} placement="bottom-start" />;

const Assignation = () => {
    const { userId } = useParams(); // Get userId from URL parameters
    const [habilitations, setHabilitations] = useState([]);
    const [selectedHabilitations, setSelectedHabilitations] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch habilitations from the API
    const fetchHabilitations = async () => {
        try {
            const response = await authInstance.get('/Habilitation');
            setHabilitations(response.data);
        } catch (err) {
            console.error('Error fetching habilitations:', err);
            setErrorMessage("Erreur lors de la récupération des habilitations");
        }
    };

    useEffect(() => {
        fetchHabilitations();
    }, []);

    const handleOptionsChange = (event, value) => {
        setSelectedHabilitations(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const habilitationIds = selectedHabilitations.map((h) => h.id);

        try {
            const response = await authInstance.post('/User/assign-habilitations', {
                userIds: [userId], // Send selected userId
                habilitationIds: habilitationIds
            });

            setSuccessMessage(response.data);
            setErrorMessage('');
        } catch (err) {
            console.error('Error assigning habilitations:', err);
            setErrorMessage(err.response?.data || 'Erreur lors de l\'assignation des habilitations');
            setSuccessMessage('');
        }
    };

    return (
        <Paper>
            <MainCard>
                <Grid container alignItems="center" justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle2">Assignation</Typography>
                        <Typography variant="h3">Ajouter de nouveaux habilitations</Typography>
                    </Grid>
                </Grid>

                {errorMessage && <Alert severity="error" style={{ margin: '20px' }}>{errorMessage}</Alert>}
                {successMessage && <Alert severity="success" style={{ margin: '20px' }}>{successMessage}</Alert>}

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3} mt={3}>
                        <Grid item xs={12}>
                            <Autocomplete
                                multiple
                                id="checkboxes-tags-habilitations"
                                options={habilitations}
                                disableCloseOnSelect
                                getOptionLabel={(option) => option.label}
                                onChange={handleOptionsChange}
                                PopperComponent={CustomPopper}
                                renderOption={(props, option, { selected }) => (
                                    <li {...props} style={{
                                        backgroundColor: selected ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                                        transition: 'background-color 0.3s'
                                    }}>
                                        <Checkbox
                                            icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                            checkedIcon={<CheckBoxIcon fontSize="small" />}
                                            style={{ marginRight: 8 }}
                                            checked={selected}
                                        />
                                        {option.label}
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField 
                                        {...params} 
                                        label="Sélectionner des habilitations" 
                                        placeholder="Habilitations favorites" 
                                    />
                                )}
                            />
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
        </Paper>
    );
};

export default Assignation;