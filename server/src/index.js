import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initDb } from './db/init.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Auto-initialize DB schema and seed demo agents if not present
initDb();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Centralized error handler
app.use(errorHandler);

// Only listen if executed directly as the entry file
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && (process.argv[1] === currentFilePath || process.argv[1].endsWith('src\\index.js') || process.argv[1].endsWith('src/index.js'))) {
  app.listen(PORT, () => {
    console.log(`Support Desk Backend running on http://localhost:${PORT}`);
  });
}

export default app;
