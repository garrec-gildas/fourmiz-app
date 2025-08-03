import app from './sendTaxAttestation.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Serveur backend lancé sur le port ${PORT}`);
});
