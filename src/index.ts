import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { syncCustomers, handleWebhook } from './services/customers';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rota para sincronização manual de clientes
app.post('/sync-customers', async (req, res) => {
  try {
    const customers = await syncCustomers();
    res.json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error syncing customers' });
  }
});

// Webhook para receber notificações do Asaas
app.post('/webhook/asaas', async (req, res) => {
  try {
    await handleWebhook(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error processing webhook' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
