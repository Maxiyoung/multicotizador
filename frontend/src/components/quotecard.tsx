import { Check, ShieldCheck, Sparkles, Info } from 'lucide-react';
import type { StandardQuote, QuoteInput } from '../services/api';

interface QuoteCardProps {
  quote: StandardQuote;
  vehicleData: QuoteInput;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(val);

const categoryBadge: Record<
  StandardQuote['planType'],
  { label: string; classes: string; recommended?: boolean }
> = {
  RC: {
    label: 'Cobertura Básica',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  TERCEROS_COMPLETO: {
    label: 'Más Elegido · Equilibrio Ideal',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    recommended: true,
  },
  TODO_RIESGO: {
    label: 'Máxima Protección',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

export function QuoteCard({ quote, vehicleData }: QuoteCardProps) {
  const formattedPrice = formatCurrency(quote.price);
  const phoneNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '5493515449977';

  const gncText = vehicleData.hasGnc ? ' (con GNC)' : '';
  const zeroKmText = vehicleData.isZeroKm ? ' [0KM]' : '';
  const message = `¡Hola! Coticé en la web y me interesa contratar el plan *${quote.planName}* de *${quote.companyName}* (${formattedPrice}/mes) para mi ${vehicleData.brand} ${vehicleData.model} ${vehicleData.version} (${vehicleData.year})${zeroKmText}${gncText}, CP ${vehicleData.postalCode}. ¿Me pasás más info?`;
  const encodedMessage = encodeURIComponent(message);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const whatsappUrl = isMobile
    ? `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`
    : `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;

  const badge = categoryBadge[quote.planType];
  const isRecommended = badge.recommended;

  return (
    <article
      className={`group relative bg-white rounded-2xl transition-all duration-300 overflow-hidden mb-5 ${
        isRecommended
          ? 'border-2 border-blue-600 shadow-lg shadow-blue-950/5'
          : 'border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300'
      }`}
    >
      {/* Cinta superior si es el plan recomendado */}
      {isRecommended && (
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            RECOMENDADO POR RELACIÓN PRECIO / COBERTURA
          </span>
          <span className="text-[11px] font-medium opacity-90 hidden sm:inline">
            Emisión inmediata
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row">
        {/* Columna Izquierda: Aseguradora y Precio */}
        <div className="p-6 sm:w-2/5 bg-slate-50/60 border-b sm:border-b-0 sm:border-r border-slate-200/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                {quote.companyName}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                #{quote.externalId}
              </span>
            </div>

            <span
              className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border mb-2 ${badge.classes}`}
            >
              {badge.label}
            </span>

            <h4 className="text-lg font-extrabold text-slate-900 leading-snug">
              {quote.planName}
            </h4>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200/70">
            <span className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              Cuota mensual estimada
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-extrabold tracking-tight text-slate-950">
                {formattedPrice}
              </span>
              <span className="text-xs font-semibold text-slate-500">/mes</span>
            </div>

            {quote.franchise ? (
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Franquicia: {formatCurrency(quote.franchise)}</span>
              </div>
            ) : (
              <span className="mt-2 inline-block text-xs font-medium text-emerald-700">
                ✓ Sin franquicia en coberturas incluidas
              </span>
            )}
          </div>
        </div>

        {/* Columna Derecha: Detalle de Cobertura y WhatsApp CTA */}
        <div className="p-6 sm:w-3/5 flex flex-col justify-between bg-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Qué cubre este plan
            </p>
            <ul className="space-y-2.5 mb-6">
              {quote.coverageDetails.map((detail, index) => (
                <li key={index} className="flex items-start gap-2.5 text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                  </div>
                  <span className="text-sm font-medium leading-snug">{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <a
              href={whatsappUrl}
              target={isMobile ? '_self' : '_blank'}
              rel="noopener noreferrer"
              className="w-full bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.99] text-white font-semibold py-3 px-5 rounded-xl shadow-md shadow-emerald-600/15 hover:shadow-lg hover:shadow-emerald-600/25 transition-all duration-200 flex justify-center items-center gap-2.5 text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.012c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
              </svg>
              <span>Solicitar emisión por WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
