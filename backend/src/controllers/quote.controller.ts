import { Request, Response } from 'express';
import { OrchestratorService } from '../services/orchestrator.service';
import { quoteInputSchema } from '../schemas/quote.schema';

const orchestrator = new OrchestratorService();

export const getQuotes = async (req: Request, res: Response): Promise<void> => {
  const parsed = quoteInputSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Datos de cotización inválidos',
      details: parsed.error.issues.map((issue) => issue.message),
    });
    return;
  }

  try {
    const results = await orchestrator.calculateAllQuotes(parsed.data);
    res.json(results);
  } catch (error) {
    console.error('[QuoteController]:', error);
    res.status(500).json({ error: 'Ocurrió un error interno al procesar las cotizaciones.' });
  }
};
