import axios from 'axios';

// Create an instance for authentication
const authInstance = axios.create({
  baseURL: 'http://10.0.104.199:5094/api',
  headers: {
    'Content-Type': 'application/json',
  },
});


// Create an instance for formulaire management
const formulaireInstance = axios.create({
  baseURL: 'http://10.0.104.199:5231/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export { authInstance, formulaireInstance };