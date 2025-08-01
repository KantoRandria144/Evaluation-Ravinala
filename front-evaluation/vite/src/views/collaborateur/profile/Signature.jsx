// import React, { useState, useRef } from 'react';
// import { Box, Button, Grid, Typography, Input, FormHelperText, Alert } from '@mui/material';
// import { authInstance } from '../../../axiosConfig';

// function Signature() {
//   const [fileName, setFileName] = useState('');
//   const [fileBase64, setFileBase64] = useState('');
//   const [error, setError] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [successMessage, setSuccessMessage] = useState('');
//   const inputRef = useRef(null);

//   const handleFileChange = (event) => {
//     if (event.target.files.length > 0) {
//       const file = event.target.files[0];
//       const allowedExtensions = ['image/jpeg', 'image/jpg', 'image/png'];

//       if (!allowedExtensions.includes(file.type)) {
//         setError(true);
//         setErrorMessage('Seuls les fichiers JPEG, JPG et PNG sont acceptés.');
//         setFileName('');
//         setFileBase64('');
//         setSuccessMessage('');
//         return;
//       }

//       const reader = new FileReader();
//       reader.onload = () => {
//         setFileBase64(reader.result); // Conserver l'intégralité pour l'affichage de l'image
//       };
//       reader.onerror = () => {
//         setError(true);
//         setErrorMessage('Erreur lors de la lecture du fichier.');
//         setSuccessMessage('');
//       };
//       reader.readAsDataURL(file);

//       setFileName(file.name);
//       setError(false);
//       setErrorMessage('');
//       setSuccessMessage('');
//     }
//   };

//   const handleSubmit = async () => {
//     if (!fileName || !fileBase64) {
//       setError(true);
//       setErrorMessage('Vous devez sélectionner un fichier valide.');
//       setSuccessMessage('');
//       return;
//     }

//     const user = JSON.parse(localStorage.getItem('user'));
//     if (!user || !user.id) {
//       setError(true);
//       setErrorMessage("Impossible de récupérer l'ID utilisateur.");
//       setSuccessMessage('');
//       return;
//     }

//     const userId = user.id;

//     const dto = {
//       UserId: userId,
//       NewSignature: fileBase64.split(',')[1], // Supprimer le préfixe avant l'envoi
//     };

//     try {
//       const response = await authInstance.put('/User/update-user-signature', dto);
//       console.log(response.data);
//       setSuccessMessage('La signature a été mise à jour avec succès !');
//       setError(false);
//       setErrorMessage('');
//       setFileName('');
//       setFileBase64('');
//     } catch (error) {
//       console.log('Erreur API :', error);

//       let backendErrorMessage = 'Une erreur est survenue lors de la mise à jour de la signature.';
//       if (error.response && error.response.data) {
//         console.log('Erreur complète:', error.response);
    
//         // Vérifiez si des erreurs sont dans la propriété `errors`
//         if (error.response.data.errors) {
//             // Récupérez les messages d'erreur (par exemple pour `NewSignature`)
//             const errors = Object.values(error.response.data.errors).flat();
//             backendErrorMessage = errors.join(' ') || backendErrorMessage;
//         } else if (error.response.data.message) {
//             // Si un message direct est fourni
//             backendErrorMessage = error.response.data.message;
//         } else if (typeof error.response.data === 'string') {
//             // Si la réponse est une chaîne simple
//             backendErrorMessage = error.response.data;
//         }
//       }

//       setError(true);
//       setErrorMessage(backendErrorMessage);

//       console.log('Erreur complète:', error.response);


//       setSuccessMessage('');
//     }
//   };

//   return (
//     <Grid item xs={8} sx={{ p: 3 }}>
//       <Typography variant="h6" sx={{ mb: 2 }}>
//         Upload Ton Signature
//       </Typography>

//       <Box
//         sx={{
//           mb: 3,
//           p: 3,
//           border: error ? '2px dashed red' : '2px dashed #ccc',
//           borderRadius: 2,
//           textAlign: 'center',
//           backgroundColor: '#f9f9f9',
//           cursor: 'pointer',
//           '&:hover': {
//             backgroundColor: '#f0f0f0',
//           },
//         }}
//         onClick={() => inputRef.current.click()}
//       >
//         <Input
//           id="upload-signature"
//           type="file"
//           accept=".jpeg, .jpg, .png"
//           onChange={handleFileChange}
//           sx={{ display: 'none' }}
//           inputRef={inputRef}
//         />
//         <Typography
//           variant="h6"
//           sx={{
//             fontWeight: 'bold',
//             color: error ? 'red' : '#333',
//             mb: 1,
//           }}
//         >
//           Signature
//         </Typography>
//         <Typography
//           variant="body2"
//           sx={{
//             color: error ? 'red' : '#666',
//           }}
//         >
//           {error ? errorMessage : 'Glissez-déposez un fichier ici ou cliquez'}
//         </Typography>
//       </Box>

//       {fileBase64 && (
//         <Box
//           sx={{
//             mt: 2,
//             display: 'flex',
//             justifyContent: 'center',
//             alignItems: 'center',
//           }}
//         >
//           <img
//             src={fileBase64}
//             alt="Aperçu de la signature"
//             style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '5px', border: '1px solid #ccc' }}
//           />
//         </Box>
//       )}

//       {error && (
//         <Alert severity="error" sx={{ mb: 2 }}>
//           {errorMessage}
//         </Alert>
//       )}

//       {successMessage && (
//         <Alert severity="success" sx={{ mb: 2 }}>
//           {successMessage}
//         </Alert>
//       )}

//       <Box textAlign="right" sx={{ mt: 3 }}>
//         <Button variant="contained" onClick={handleSubmit}>
//           Valider
//         </Button>
//       </Box>
//     </Grid>
//   );
// }

// export default Signature;


import React, { useState, useRef } from 'react';
import { Box, Button, Grid, Typography, Input, Alert } from '@mui/material';
import { authInstance } from '../../../axiosConfig';
import axios from 'axios';

function Signature() {
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [processedImage, setProcessedImage] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (event) => {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      const allowedExtensions = ['image/jpeg', 'image/jpg', 'image/png'];

      if (!allowedExtensions.includes(file.type)) {
        setError(true);
        setErrorMessage('Seuls les fichiers JPEG, JPG et PNG sont acceptés.');
        resetFileState();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => setFileBase64(reader.result);
      reader.onerror = () => {
        setError(true);
        setErrorMessage('Erreur lors de la lecture du fichier.');
      };
      reader.readAsDataURL(file);

      setFileName(file.name);
      clearMessages();
    }
  };

  const compressImage = (base64Image, maxWidth, maxHeight, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Image;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
  
        let width = img.width;
        let height = img.height;
  
        // Redimensionner si nécessaire
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height *= maxWidth / width;
            width = maxWidth;
          } else {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
  
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
  
        // Convertir en base64 en format JPEG (perte de transparence)
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    });
  };  

  const addWhiteBackground = (base64Image) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Image;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
  
        canvas.width = img.width;
        canvas.height = img.height;
  
        // Ajouter un fond blanc
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
  
        // Dessiner l'image par-dessus
        ctx.drawImage(img, 0, 0);
  
        resolve(canvas.toDataURL('image/png')); // Convertir en base64
      };
      img.onerror = (err) => reject(err);
    });
  };  

  const removeBackground = async () => {
    if (!fileBase64) {
      setError(true);
      setErrorMessage('Veuillez sélectionner une image avant de retirer le fond.');
      return;
    }
    setLoadingAction(true);

    try {
      const response = await axios.post('http://localhost:5000/removebg', {
        base64Image: fileBase64.split(',')[1],
      }, {
        responseType: 'arraybuffer',
      });
  
      // Conversion en base64
      const base64Image = `data:image/png;base64,${btoa(
        new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )}`;
  
      // Ajouter un fond blanc
      const imageWithWhiteBackground = await addWhiteBackground(base64Image);

      // Compression
      const compressedImage = await compressImage(imageWithWhiteBackground, 800, 800, 0.7);
  
      setProcessedImage(compressedImage);
      setSuccessMessage('Le fond a été retiré avec succès et l’image a été corrigée !');
      setError(false);
    } catch (err) {
      console.error('Erreur:', err);
      setError(true);
      setErrorMessage('Erreur lors de la suppression du fond.');
    } finally {
      setLoadingAction(false); // Fin du chargement
    }
  };  

  const handleSubmit = async () => {
    if (!processedImage) {
      setError(true);
      setErrorMessage('Vous devez retirer le fond avant de soumettre.');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
      setError(true);
      setErrorMessage("Impossible de récupérer l'ID utilisateur.");
      return;
    }

    const dto = {
      UserId: user.id,
      NewSignature: processedImage.split(',')[1], // Envoi de l'image traitée (base64 sans préfixe)
    };

    try {
      const response = await authInstance.put('/User/update-user-signature', dto);
      console.log(response.data);
      setSuccessMessage('La signature a été mise à jour avec succès !');
      resetFileState();
    } catch (error) {
      console.error('Erreur API :', error);
      handleApiError(error);
    }
  };

  const resetFileState = () => {
    setFileName('');
    setFileBase64('');
    setProcessedImage('');
  };

  const clearMessages = () => {
    setError(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleApiError = (error) => {
    let backendErrorMessage = 'Une erreur est survenue lors de la mise à jour de la signature.';
    if (error.response?.data) {
      const data = error.response.data;
      if (data.errors) {
        const errors = Object.values(data.errors).flat();
        backendErrorMessage = errors.join(' ') || backendErrorMessage;
      } else if (data.message) {
        backendErrorMessage = data.message;
      } else if (typeof data === 'string') {
        backendErrorMessage = data;
      }
    }
    setError(true);
    setErrorMessage(backendErrorMessage);
  };

  return (
    <Grid item xs={8} sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Upload Ta Signature
      </Typography>

      <Box
        sx={{
          mb: 3,
          p: 3,
          border: error ? '2px dashed red' : '2px dashed #ccc',
          borderRadius: 2,
          textAlign: 'center',
          backgroundColor: '#f9f9f9',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: '#f0f0f0',
          },
        }}
        onClick={() => inputRef.current.click()}
      >
        <Input
          type="file"
          accept=".jpeg, .jpg, .png"
          onChange={handleFileChange}
          sx={{ display: 'none' }}
          inputRef={inputRef}
        />
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: error ? 'red' : '#333', mb: 1 }}>
          Signature
        </Typography>
        <Typography variant="body2" sx={{ color: error ? 'red' : '#666' }}>
          {error ? errorMessage : 'Glissez-déposez un fichier ici ou cliquez'}
        </Typography>
      </Box>

      {fileBase64 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            src={fileBase64}
            alt="Aperçu de la signature"
            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '5px', border: '1px solid #ccc' }}
          />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Box textAlign="right" sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={removeBackground} disabled={loadingAction} sx={{ mr: 2 }}>
          {loadingAction ? 'Retrait en cours...' : 'Retirer le fond'}
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          Valider
        </Button>
      </Box>
    </Grid>
  );
}

export default Signature;


