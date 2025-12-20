import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do multer para upload de arquivos
const upload = multer({ dest: 'uploads/' });

// AIDEV-NOTE: Endpoint de upload de importação - replica a funcionalidade do upload.ts
app.post('/api/import/upload', upload.single('file'), async (req, res) => {
  console.log('🚀 API de upload chamada');
  console.log('📄 Body:', req.body);
  console.log('📁 File:', req.file);

  try {
    const { tenantId, userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'tenantId e userId são obrigatórios' });
    }

    console.log('📊 Processando arquivo:', file.originalname);

    // Ler e processar o arquivo CSV
    const results = [];
    const filePath = file.path;

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('📊 Dados processados:', results.length, 'registros');
    console.log('📊 Primeiro registro:', results[0]);

    // Criar job de importação
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        filename: file.originalname,
        total_records: results.length,
        status: 'processing'
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Erro ao criar job:', jobError);
      return res.status(500).json({ error: 'Erro ao criar job de importação' });
    }

    console.log('✅ Job criado:', job.id);

    // Preparar dados para inserção na import_data
    const importDataRecords = results.map((record, index) => ({
      job_id: job.id,
      row_number: index + 1,
      data: record,
      created_at: new Date().toISOString()
    }));

    console.log('📊 Preparando inserção de', importDataRecords.length, 'registros');
    console.log('📊 Primeiro registro preparado:', importDataRecords[0]);

    // Inserir dados na tabela import_data
    const { data: insertedData, error: dataError } = await supabase
      .from('import_data')
      .insert(importDataRecords);

    if (dataError) {
      console.error('❌ Erro ao inserir dados:', dataError);
      return res.status(500).json({ error: 'Erro ao salvar dados de importação' });
    }

    console.log('✅ Dados inseridos com sucesso:', insertedData);

    // Limpar arquivo temporário
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      jobId: job.id,
      totalRecords: results.length,
      message: 'Arquivo processado com sucesso'
    });

  } catch (error) {
    console.error('💥 Erro no processamento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Endpoint de status
app.get('/api/status', (req, res) => {
  res.json({ status: 'API Server rodando', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server rodando na porta ${PORT}`);
  console.log(`📡 Endpoint de upload: http://localhost:${PORT}/api/import/upload`);
});