import { CheckCircle2, MessageCircle } from 'lucide-react';
import type { StandardQuote, QuoteInput } from '../services/api';

interface QuoteCardProps {
  quote: StandardQuote;
  vehicleData: QuoteInput;
}

export function QuoteCard({ quote, vehicleData }: QuoteCardProps) {
  // Formateador de moneda argentina
  const formattedPrice = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(quote.price);

  const phoneNumber = '5493515449977'; // El número configurado
  const message = `¡Hola! Coticé en la web y me interesa el plan de ${quote.companyName} (${quote.planName}) por ${formattedPrice}/mes para mi ${vehicleData.brand} ${vehicleData.model} ${vehicleData.year}. ¿Me pasarías más info?`;
  
  // 1. SOLUCIÓN: Usamos la API completa y directa en lugar del acortador wa.me
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg border border-slate-200 transition-all overflow-hidden flex flex-col sm:flex-row mb-4">
      
      {/* Sección Izquierda: Info de la Compañía */}
      <div className="bg-slate-50 p-6 flex flex-col justify-center items-center sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-200">
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {quote.companyName}
        </span>
        <h4 className="text-xl font-bold text-center text-slate-800">
          {quote.planName}
        </h4>
        <div className="mt-4 text-3xl font-extrabold text-primary-600">
          {formattedPrice}
          <span className="text-sm text-slate-500 font-normal">/mes</span>
        </div>
      </div>

      {/* Sección Central: Detalles de Cobertura */}
      <div className="p-6 sm:w-2/3 flex flex-col justify-between">
        <ul className="space-y-2 mb-6">
          {quote.coverageDetails.map((detail, index) => (
            <li key={index} className="flex items-start gap-2 text-slate-600">
              <CheckCircle2 className="w-5 h-5 text-whatsapp flex-shrink-0 mt-0.5" />
              <span className="text-sm">{detail}</span>
            </li>
          ))}
        </ul>

        {/* 2. Devolvemos el target="_blank" ya que la API directa lo requiere para no romper la navegación */}
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-whatsapp hover:bg-[#20bd5a] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex justify-center items-center gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          Me interesa esta cobertura
        </a>
      </div>
      
    </div>
  );
}