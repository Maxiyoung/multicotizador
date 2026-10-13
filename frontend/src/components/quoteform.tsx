import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CarFront,
  MapPin,
  Settings2,
  Calendar,
  Briefcase,
  Sparkles,
  Flame,
  ArrowRight,
  Lock,
} from 'lucide-react';
import type { QuoteInput } from '../services/api';

const formSchema = z.object({
  brand: z.string().min(2, 'Ingresá la marca del vehículo'),
  model: z.string().min(1, 'Ingresá el modelo'),
  version: z.string().min(1, 'Especificá la versión'),
  postalCode: z.string().regex(/^\d{4,8}$/, 'CP inválido (ej: 5000)'),
  year: z
    .number({ message: 'Ingresá un año válido' })
    .int('Debe ser un año entero')
    .min(1990, 'Mínimo año 1990')
    .max(new Date().getFullYear() + 1, 'Año inválido'),
  use: z.enum(['particular', 'comercial']),
  hasGnc: z.boolean(),
  isZeroKm: z.boolean(),
});

interface QuoteFormProps {
  onSubmit: (data: QuoteInput) => void;
  isLoading: boolean;
}

export function QuoteForm({ onSubmit, isLoading }: QuoteFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuoteInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: 2021,
      brand: '',
      model: '',
      version: '',
      postalCode: '5000',
      use: 'particular',
      hasGnc: false,
      isZeroKm: false,
    },
  });

  const hasGnc = watch('hasGnc');
  const isZeroKm = watch('isZeroKm');

  const inputBase =
    'w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200';
  const inputNormal =
    'border-slate-200/90 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10';
  const inputError =
    'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Fila 1: Año y Código Postal */}
      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Año
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="number"
              {...register('year', { valueAsNumber: true })}
              className={`${inputBase} ${errors.year ? inputError : inputNormal}`}
              placeholder="2021"
            />
          </div>
          {errors.year && (
            <span className="text-red-600 text-xs font-medium mt-1 block">
              {errors.year.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Código Postal
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              {...register('postalCode')}
              className={`${inputBase} ${errors.postalCode ? inputError : inputNormal}`}
              placeholder="Ej: 5000"
            />
          </div>
          {errors.postalCode && (
            <span className="text-red-600 text-xs font-medium mt-1 block">
              {errors.postalCode.message}
            </span>
          )}
        </div>
      </div>

      {/* Marca */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Marca del vehículo
        </label>
        <div className="relative">
          <CarFront className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            {...register('brand')}
            className={`${inputBase} ${errors.brand ? inputError : inputNormal}`}
            placeholder="Ej: Volkswagen, Toyota, Peugeot..."
          />
        </div>
        {errors.brand && (
          <span className="text-red-600 text-xs font-medium mt-1 block">
            {errors.brand.message}
          </span>
        )}
      </div>

      {/* Modelo y Versión */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Modelo
          </label>
          <div className="relative">
            <CarFront className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              {...register('model')}
              className={`${inputBase} ${errors.model ? inputError : inputNormal}`}
              placeholder="Ej: Gol Trend"
            />
          </div>
          {errors.model && (
            <span className="text-red-600 text-xs font-medium mt-1 block">
              {errors.model.message}
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Versión
          </label>
          <div className="relative">
            <Settings2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              {...register('version')}
              className={`${inputBase} ${errors.version ? inputError : inputNormal}`}
              placeholder="Ej: 1.6 Trendline"
            />
          </div>
          {errors.version && (
            <span className="text-red-600 text-xs font-medium mt-1 block">
              {errors.version.message}
            </span>
          )}
        </div>
      </div>

      {/* Uso del Vehículo */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Tipo de Uso
        </label>
        <div className="relative">
          <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            {...register('use')}
            className={`${inputBase} ${inputNormal} appearance-none cursor-pointer`}
          >
            <option value="particular">Uso Particular / Familiar</option>
            <option value="comercial">Uso Comercial / Profesional</option>
          </select>
        </div>
      </div>

      {/* Tarjetas interactivas para GNC y 0KM */}
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Características adicionales
        </span>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium cursor-pointer transition-all select-none ${
              hasGnc
                ? 'bg-blue-50/80 border-blue-600 text-blue-950 ring-2 ring-blue-600/10'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <input type="checkbox" {...register('hasGnc')} className="sr-only" />
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                hasGnc ? 'bg-blue-600 text-white' : 'bg-slate-200/70 text-slate-500'
              }`}
            >
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold leading-tight">Equipo GNC</span>
              <span className="block text-[11px] text-slate-500">Declarado</span>
            </div>
          </label>

          <label
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium cursor-pointer transition-all select-none ${
              isZeroKm
                ? 'bg-blue-50/80 border-blue-600 text-blue-950 ring-2 ring-blue-600/10'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <input type="checkbox" {...register('isZeroKm')} className="sr-only" />
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                isZeroKm ? 'bg-blue-600 text-white' : 'bg-slate-200/70 text-slate-500'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold leading-tight">Es 0 KM</span>
              <span className="block text-[11px] text-slate-500">Sin rodar</span>
            </div>
          </label>
        </div>
      </div>

      {/* Botón CTA Principal */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-3 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 active:scale-[0.99] text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer group"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Consultando tarifas oficiales...</span>
          </>
        ) : (
          <>
            <span>Calcular Cotización Oficial</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <Lock className="w-3.5 h-3.5 text-emerald-600" />
        <span>Cotización 100% gratuita y sin compromiso de compra</span>
      </div>
    </form>
  );
}
