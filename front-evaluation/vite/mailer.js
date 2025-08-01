// mailer.js
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, text, html) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL, // Assurez-vous que cette adresse est vérifiée sur SendGrid
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log('E-mail envoyé avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error;
  }
};

module.exports = sendEmail;