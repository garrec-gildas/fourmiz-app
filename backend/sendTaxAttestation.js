import express from 'express';
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json());

app.post('/api/send-tax-attestation', async (req, res) => {
  const { email, pdfBase64 } = req.body;
  if (!email || !pdfBase64) return res.status(400).send('Missing parameters');

  const pdfBuffer = Buffer.from(pdfBase64, 'base64');

  // Configure ton SMTP ici
  const transporter = nodemailer.createTransport({
    host: 'smtp.example.com',
    port: 587,
    auth: { user: 'user', pass: 'password' },
  });

  try {
    await transporter.sendMail({
      from: '"Fourmiz" <no-reply@fourmiz.com>',
      to: email,
      subject: 'Votre attestation fiscale Fourmiz',
      text: 'Veuillez trouver en pièce jointe votre attestation fiscale.',
      attachments: [
        {
          filename: 'attestation_fiscale.pdf',
          content: pdfBuffer,
        },
      ],
    });
    res.status(200).send('Email envoyé');
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur envoi email');
  }
});

export default app;
