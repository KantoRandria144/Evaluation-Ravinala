import React, { useEffect, useState } from 'react'; 
import MainCard from 'ui-component/cards/MainCard';
import { Grid, Typography, Button, Alert, TextField, Autocomplete, Checkbox, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { authInstance } from '../../../../axiosConfig';
import Popper from '@mui/material/Popper';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

const CustomPopper = (props) => (
    <Popper {...props} style={{ width: '450px' }} placement="bottom-start" />
);

const Autorisation = () => {
    const [formData, setFormData] = useState({ users: [], typeUser: null });
    const [users, setUsers] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchUsers = async () => {
        try {
            const response = await authInstance.get('/User/users-with-null-type');
            setUsers(response.data);
        } catch (err) {
            const errorData = err.response?.data;
            setErrorMessage(
                typeof errorData === 'object'
                    ? JSON.stringify(errorData, null, 2)
                    : errorData || 'Error fetching users'
            );
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUsersChange = (event, value) => {
        setFormData({ ...formData, users: value });
    };

    const handleTypeUserChange = (event) => {
        setFormData({ ...formData, typeUser: event.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userIds = formData.users.map(user => user.id);
    
        try {
            const response = await authInstance.put('/User/update-users-type', {
                UserIds: userIds,
                NewType: formData.typeUser
            });
    
            setSuccessMessage(response.data);
            setErrorMessage('');
        } catch (error) {
            const errorData = error.response?.data;
            setErrorMessage(
                typeof errorData === 'object'
                    ? JSON.stringify(errorData, null, 2)
                    : errorData || 'Erreur inconnue'
            );
            setSuccessMessage('');
        }
    };    

    return (
        <Paper>
            <MainCard>
                <Grid container alignItems="center" justifyContent="space-between">
                    <Grid item>
                        <Typography variant="subtitle2">Assignation de Type</Typography>
                        <Typography variant="h3">Définir le type d'utilisateur</Typography>
                    </Grid>
                </Grid>

                {errorMessage && (
                    <Alert severity="error" style={{ margin: '20px' }}>
                        <pre>{errorMessage}</pre>
                    </Alert>
                )}
                {successMessage && (
                    <Alert severity="success" style={{ margin: '20px' }}>
                        {typeof successMessage === 'string' ? successMessage : JSON.stringify(successMessage)}
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
                                getOptionLabel={(option) => option.matricule}
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
                                        {option.matricule}
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
                            <FormControl fullWidth>
                                <InputLabel>Type d'utilisateur</InputLabel>
                                <Select
                                    value={formData.typeUser}
                                    onChange={handleTypeUserChange}
                                    label="Type d'utilisateur"
                                >
                                    <MenuItem value={0}>Cadre</MenuItem>
                                    <MenuItem value={1}>Non Cadre</MenuItem>
                                </Select>
                            </FormControl>
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

export default Autorisation;
