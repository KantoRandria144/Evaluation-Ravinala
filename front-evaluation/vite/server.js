const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware pour CORS
app.use(cors({
  origin: 'http://localhost:3000', // Autoriser seulement votre frontend
  methods: ['GET', 'POST'],       // Méthodes HTTP autorisées
}));

// Middleware pour analyser le corps des requêtes
app.use(bodyParser.json());

// Route GET pour vérifier que le serveur fonctionne
app.get('/', (req, res) => {
  res.send('Serveur opérationnel');
});

// Route POST pour supprimer le fond d'une image
app.post('/removebg', async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Image non fournie.' });
    }

    const response = await axios({
      method: 'post',
      url: 'https://api.remove.bg/v1.0/removebg',
      data: {
        image_file_b64: base64Image,
        size: 'auto',
      },
      headers: {
        'X-Api-Key': 's5VuKni7BbQoj7VwNbSBEUgn', // Remplacez par votre clé API valide
      },
      responseType: 'arraybuffer', // Attendre un buffer binaire
    });

    // Retourner l'image traitée
    res.set('Content-Type', 'image/png');
    res.send(response.data);
  } catch (error) {
    console.error('Erreur dans /removebg:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur lors de la suppression du fond' });
  }
});

// Démarrer le serveur
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Serveur proxy démarré sur http://localhost:${PORT}`);
});
