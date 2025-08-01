import React, { createContext, useContext, useEffect, useState } from 'react';
import fetchUserHabilitations from '../services/fetchUserAuthorization';

const AuthorizationContext = createContext();

export const AuthorizationProvider = ({ children }) => {
    const [habilitations, setHabilitations] = useState([]); // Initialiser avec un tableau vide

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const userId = user.id; // ID utilisateur stocké localement
        if (userId) {
            fetchUserHabilitations(userId).then((data) => {
                // console.log('Habilitations récupérées :', data);
                setHabilitations(data || []); // Assurez-vous que les données sont toujours un tableau
            });
        }
    }, []);    

    return (
        <AuthorizationContext.Provider value={{ habilitations }}>
            {children}
        </AuthorizationContext.Provider>
    );
};

export const useAuthorization = () => {
    const context = useContext(AuthorizationContext);
    if (!context) {
        throw new Error('useAuthorization must be used within an AuthorizationProvider');
    }
    return context;
};