// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import quoteRoutes from './routes/quote.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Seguridad de Cabeceras
app.use(helmet());
// 3. Middlewares básicos
app.use(cors());
app.use(express.json());
// 2. Limitador de peticiones (Rate Limit)
// Máximo 10 cotizaciones cada 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: 'Demasiadas solicitudes de cotización. Intenta de nuevo en 15 minutos.' }
});
app.use('/api/', limiter);



// 4. Montar rutas
app.use('/api', quoteRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor blindado y corriendo en http://localhost:${PORT}`);
});