import React, { useEffect, useState } from 'react';
import MainCard from 'ui-component/cards/MainCard';
import { Grid, Typography, Button, Alert, TextField, Autocomplete, Checkbox, Paper } from '@mui/material';
import { authInstance } from '../../../../axiosConfig';
import Popper from '@mui/material/Popper';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

const CustomPopper = (props) => (
    <Popper {...props} style={{ width: '450px' }} placement="bottom-start" />
);

const AssignAllCadre = () => {
    const [formData, setFormData] = useState({ habilitations: [], users: [] });
    const [habilitations, setHabilitations] = useState([]);
    const [users, setUsers] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchHabilitations = async () => {
        try {
            const response = await authInstance.get('/Habilitation');
            setHabilitations(response.data);
        } catch (err) {
            setErrorMessage(err.response?.data || 'Error fetching habilitations');
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await authInstance.get('/User/users-cadre');
            setUsers(response.data);
        } catch (err) {
            setErrorMessage(err.response?.data || 'Error fetching users');
        }
    };

    useEffect(() => {
        fetchHabilitations();
        fetchUsers();
    }, []);

    const handleHabilitationsChange = (event, value) => {
        setFormData({ ...formData, habilitations: value });
    };

    const handleUsersChange = (event, value) => {
        setFormData({ ...formData, users: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userIds = formData.users.map(user => user.id);
        const habilitationIds = formData.habilitations.map(habilitation => habilitation.id);

        try {
            const response = await authInstance.post('/User/assign-habilitations', {
                UserIds: userIds,
                HabilitationIds: habilitationIds,
            });
            setSuccessMessage(response.data);  // Display success message directly from backend
            setErrorMessage('');
        } catch (error) {
            setErrorMessage(error.response?.data || 'Unknown error occurred');
            setSuccessMessage('');
        }
    };

    return (
        <Paper>
            <MainCard>
                <Grid container alignItems="center" justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle2">Assignation Cadre</Typography>
                        <Typography variant="h3">Ajouter de nouveaux habilitations</Typography>
                    </Grid>
                </Grid>

                {errorMessage && (
                    <Alert severity="error" style={{ margin: '20px' }}>
                        {errorMessage}
                    </Alert>
                )}
                {successMessage && (
                    <Alert severity="success" style={{ margin: '20px' }}>
                        {successMessage}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3} mt={3}>
                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                multiple
                                id="checkboxes-tags-users"
                                options={users}
                                disableCloseOnSelect
                                getOptionLabel={(option) => option.name}
                                onChange={handleUsersChange}
                                PopperComponent={CustomPopper}
                                renderOption={(props, option, { selected }) => (
                                    <li 
                                        {...props}
                                        style={{ 
                                            backgroundColor: selected ? 'rgba(0, 0, 0, 0.08)' : 'transparent', 
                                            transition: 'background-color 0.3s' 
                                        }}
                                    >
                                        <Checkbox
                                            icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                            checkedIcon={<CheckBoxIcon fontSize="small" />}
                                            style={{ marginRight: 8 }}
                                            checked={selected}
                                        />
                                        {option.name}
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField 
                                        {...params} 
                                        label="Sélectionner des utilisateurs" 
                                        placeholder="Utilisateurs sélectionnés" 
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                multiple
                                id="checkboxes-tags-habilitations"
                                options={habilitations}
                                disableCloseOnSelect
                                getOptionLabel={(option) => option.label}
                                onChange={handleHabilitationsChange}
                                PopperComponent={CustomPopper}
                                renderOption={(props, option, { selected }) => (
                                    <li 
                                        {...props}
                                        style={{ 
                                            backgroundColor: selected ? 'rgba(0, 0, 0, 0.08)' : 'transparent', 
                                            transition: 'background-color 0.3s' 
                                        }}
                                    >
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

export default AssignAllCadre;
