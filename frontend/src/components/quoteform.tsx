import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CarFront, MapPin, Settings2, ShieldQuestion } from 'lucide-react';
import type { QuoteInput } from '../services/api';

// Esquema Zod ajustado para que TypeScript lo apruebe sin problemas
const formSchema = z.object({
  brand: z.string().min(1, "La marca es obligatoria"),
  model: z.string().min(1, "El modelo es obligatorio"),
  version: z.string().min(1, "La versión es obligatoria"),
  postalCode: z.string().min(1, "El código postal es obligatorio"),
  year: z.number({ message: "El año es obligatorio y debe ser un número válido" })
    .int("Debe ser un número entero")
    .min(1990, "El año mínimo permitido es 1990")
    .max(new Date().getFullYear() + 1, "El año supera el máximo permitido"),
});
interface QuoteFormProps {
  onSubmit: (data: QuoteInput) => void;
  isLoading: boolean;
}

export function QuoteForm({ onSubmit, isLoading }: QuoteFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<QuoteInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      brand: '',
      model: '',
      version: '',
      postalCode: ''
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        {/* Año */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
          <input 
            type="number" 
            {...register('year', { valueAsNumber: true })}
            className={`w-full p-3 bg-slate-50 border rounded-lg outline-none transition-all ${errors.year ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}`}
            placeholder="Ej: 2020"
          />
          {errors.year && <span className="text-red-500 text-xs mt-1">{errors.year.message}</span>}
        </div>

        {/* Código Postal */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> CP
          </label>
          <input 
            type="text" 
            {...register('postalCode')}
            className={`w-full p-3 bg-slate-50 border rounded-lg outline-none transition-all ${errors.postalCode ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}`}
            placeholder="Ej: 5000"
          />
          {errors.postalCode && <span className="text-red-500 text-xs mt-1">{errors.postalCode.message}</span>}
        </div>
      </div>

      {/* Marca */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
          <ShieldQuestion className="w-4 h-4" /> Marca
        </label>
        <input 
          type="text" 
          {...register('brand')}
          className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all ${errors.brand ? 'border-red-500 focus:ring-red-200' : 'focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}`}
          placeholder="Ej: Volkswagen"
        />
        {errors.brand && <span className="text-red-500 text-xs mt-1">{errors.brand.message}</span>}
      </div>

      {/* Modelo */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
          <CarFront className="w-4 h-4" /> Modelo
        </label>
        <input 
          type="text" 
          {...register('model')}
          className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all ${errors.model ? 'border-red-500 focus:ring-red-200' : 'focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}`}
          placeholder="Ej: Gol Trend"
        />
        {errors.model && <span className="text-red-500 text-xs mt-1">{errors.model.message}</span>}
      </div>

      {/* Versión */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
          <Settings2 className="w-4 h-4" /> Versión exacta
        </label>
        <input 
          type="text" 
          {...register('version')}
          className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all ${errors.version ? 'border-red-500 focus:ring-red-200' : 'focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}`}
          placeholder="Ej: 1.6 MSI Trendline 5P"
        />
        {errors.version && <span className="text-red-500 text-xs mt-1">{errors.version.message}</span>}
      </div>

      {/* Submit Button */}
      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Buscando coberturas...
          </>
        ) : 'Cotizar Ahora'}
      </button>
    </form>
  );
}