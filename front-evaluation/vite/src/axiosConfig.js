import axios from 'axios';

// Create an instance for authentication
const authInstance = axios.create({
  baseURL: 'http://localhost:5094/api',
  headers: {
    'Content-Type': 'application/json',
  },
});


// Create an instance for formulaire management
const formulaireInstance = axios.create({
  baseURL: 'http://localhost:5231/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export { authInstance, formulaireInstance };