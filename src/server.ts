import express from 'express';
import cors from 'cors';
import path from 'path';
import analyzeRouter from './routes/analyze';
import settingsRouter from './routes/settings';
import testConnectionRouter from './routes/testConnection';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/analyze', analyzeRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/test', testConnectionRouter);

// Catch-all: serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║      🐛 Bug Report Enhancer v1.0.0     ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Server running at:                    ║`);
  console.log(`║  http://localhost:${PORT}                  ║`);
  console.log('║                                        ║');
  console.log('║  Open Chrome and navigate to the URL   ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
});

export default app;
