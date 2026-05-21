// src/controllers/quote.controller.ts
import { Request, Response } from 'express';
import { OrchestratorService } from '../services/orchestrator.service';
import { quoteInputSchema } from '../schemas/quote.schema';

const orchestrator = new OrchestratorService();

export const getQuotes = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Zod valida y limpia los datos. Si fallan las reglas, lanza un error automáticamente.
    const validatedInput = quoteInputSchema.parse(req.body);

    // 2. Si pasa la validación, procesamos la cotización
    const results = await orchestrator.calculateAllQuotes(validatedInput);
    res.json(results);

  } catch (error: any) {
    // Manejo de errores de Zod (Validación)
    if (error.name === 'ZodError') {
      res.status(400).json({ 
        error: 'Datos de cotización inválidos', 
        details: error.errors.map((e: any) => e.message) 
      });
      return;
    }

    // Manejo de errores generales del servidor
    console.error('[Quote Controller Error]:', error);
    res.status(500).json({ error: 'Ocurrió un error interno al procesar las cotizaciones.' });
  }
};