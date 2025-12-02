require('dotenv').config();  // Charge les vars d'env depuis .env

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware pour analyser le corps des requêtes (JSON et URL-encoded)
app.use(bodyParser.json({ limit: '10mb' }));  // Limite augmentée pour images base64
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Middleware pour CORS : Autorise plusieurs origines (séparées par virgule dans .env)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,  // Pour cookies/sessions si besoin
}));

// Route GET pour vérifier que le serveur fonctionne (et tester l'API key)
app.get('/', (req, res) => {
  res.json({ 
    message: 'Serveur proxy remove.bg opérationnel', 
    apiKeySet: !!process.env.REMOVE_BG_API_KEY,  // Indique si clé configurée
    port: PORT 
  });
});

// Route POST pour supprimer le fond d'une image
app.post('/removebg', async (req, res) => {
  try {
    const { base64Image, outputFormat = 'png' } = req.body;  // Support WebP nouveau en 2025

    // Validation
    if (!base64Image) {
      return res.status(400).json({ error: 'Image base64 non fournie.' });
    }
    if (!base64Image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Format base64 invalide (doit commencer par data:image/).' });
    }
    const supportedFormats = ['png', 'webp'];  // WebP ajouté en 2025
    if (!supportedFormats.includes(outputFormat.toLowerCase())) {
      return res.status(400).json({ error: `Format de sortie invalide. Supporté : ${supportedFormats.join(', ')}` });
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Clé API remove.bg non configurée.' });
    }

    // Nettoie le base64 si besoin (enlève le prefix data:image/...;base64,)
    let cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    console.log(`Traitement image pour format : ${outputFormat}`);  // Log pour debug

    const response = await axios({
      method: 'post',
      url: 'https://api.remove.bg/v1.0/removebg',
      data: {
        image_file_b64: cleanBase64,
        size: 'auto',
        format: outputFormat.toLowerCase(),  // PNG ou WebP
      },
      headers: {
        'X-Api-Key': apiKey,
      },
      responseType: 'arraybuffer',  // Pour buffer binaire (image)
      timeout: 30000,  // 30s timeout pour images lourdes
    });

    // Vérifie si quota dépassé (erreur courante)
    if (response.headers['x-ratelimit-remaining'] === '0') {
      console.warn('Quota API remove.bg épuisé !');
    }

    // Définit le Content-Type basé sur le format
    const contentType = outputFormat.toLowerCase() === 'webp' ? 'image/webp' : 'image/png';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');  // Cache 1h pour perf

    // Envoie l'image traitée
    res.send(response.data);

  } catch (error) {
    console.error('Erreur dans /removebg:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
    });

    // Erreurs spécifiques remove.bg
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Clé API invalide.' });
    }
    if (error.response?.status === 402) {
      return res.status(402).json({ error: 'Quota API épuisé (abonnement requis).' });
    }
    if (error.response?.status === 413) {
      return res.status(413).json({ error: 'Image trop grande (max 10MB).' });
    }

    res.status(500).json({ 
      error: 'Erreur lors de la suppression du fond : ' + (error.response?.data?.errors?.[0]?.title || error.message) 
    });
  }
});

// Gestion des erreurs globales (500 pour tout ce qui n'est pas catché)
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err);
  res.status(500).json({ error: 'Erreur serveur interne.' });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {  // '0.0.0.0' pour accès réseau (ex. IP 10.0.180.37)
  console.log(`Serveur proxy démarré sur http://localhost:${PORT}`);
  console.log(`Accès réseau : http://10.0.180.37:${PORT}`);  // Adapte à ton IP
  console.log(`Teste : curl http://localhost:${PORT}/`);  // Pour vérif rapide
});