import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');

    const isValidToken = (token) => {
        // Vous pouvez ajouter votre logique de validation ici
        return token && token.length > 0; // Par exemple
    };

    return isValidToken(token) ? children : <Navigate to="/pages/login/login3" />;
};

export default PrivateRoute;