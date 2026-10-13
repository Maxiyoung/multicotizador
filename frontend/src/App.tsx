import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Car,
  Sparkles,
} from 'lucide-react';
import { QuoteForm } from './components/quoteform';
import { QuoteCard } from './components/quotecard';
import { fetchQuotes } from './services/api';
import type { QuoteInput, StandardQuote, PlanCategory } from './services/api';

function App() {
  const [vehicleData, setVehicleData] = useState<QuoteInput | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | PlanCategory>('ALL');

  const { mutate, isPending, isError, data } = useMutation({
    mutationFn: fetchQuotes,
    onSuccess: (_, variables) => {
      setVehicleData(variables);
      setSelectedCategory('ALL');
    },
  });

  const quotes = data?.quotes;
  const failedProviders = data?.failedProviders ?? [];

  const filteredQuotes = quotes?.filter((q) =>
    selectedCategory === 'ALL' ? true : q.planType === selectedCategory
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Barra Superior Institucional */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight block leading-none">
                SegurosAuto<span className="text-blue-400">Ya</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                Cotizador Oficial Online
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Respaldo Mercantil Andina
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" />
              Emisión 100% Digital
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-200">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Conexión Segura SSL
            </span>
          </div>
        </div>
      </header>

      {/* Banner Hero con Gradiente Sutil */}
      <section className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-[#F8FAFC] pt-10 pb-24 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Tarifas oficiales actualizadas en tiempo real
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight max-w-3xl mx-auto leading-tight">
            Protegé tu vehículo con la cobertura exacta que necesitás
          </h1>
          <p className="text-slate-300 text-base sm:text-lg mt-3 max-w-2xl mx-auto font-normal">
            Cotizá en segundos sin intermediarios ni recargos ocultos. Compará planes oficiales y contratá con asesoramiento personalizado.
          </p>
        </div>
      </section>

      {/* Contenedor Principal (Flotando sobre el Hero) */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 -mt-14 pb-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Formulario */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="bg-white p-6 sm:p-7 rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/90">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Datos del Vehículo
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ingresá las características para calcular la prima
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Car className="w-5 h-5" />
                </div>
              </div>

              <QuoteForm onSubmit={(formData) => mutate(formData)} isLoading={isPending} />
            </div>
          </div>

          {/* Columna Derecha: Resultados */}
          <div className="lg:col-span-7">
            {/* Estado Inicial */}
            {!isPending && !quotes && !isError && (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 sm:p-12 text-center min-h-[420px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5 shadow-inner">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Tu cotización aparecerá aquí al instante
                </h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed mb-8">
                  Completá los datos de tu auto en el panel izquierdo para consultar los planes oficiales de <strong className="text-slate-700">Mercantil Andina</strong> con precios finales por mes.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <span className="text-xs font-bold text-slate-800 block">1. Sin datos personales</span>
                    <span className="text-[11px] text-slate-500">Cotizá solo con los datos del auto.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <span className="text-xs font-bold text-slate-800 block">2. Comparación clara</span>
                    <span className="text-[11px] text-slate-500">Franquicias y topes transparentes.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                    <span className="text-xs font-bold text-slate-800 block">3. Atención humana</span>
                    <span className="text-[11px] text-slate-500">Emisión directa por WhatsApp.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Estado de Error */}
            {isError && (
              <div className="p-6 bg-white border-2 border-red-200 rounded-2xl shadow-sm flex items-start gap-4 text-red-800">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 text-red-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">
                    No pudimos procesar la cotización
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Verificá que el servidor backend esté activo e intentá nuevamente en unos segundos.
                  </p>
                </div>
              </div>
            )}

            {/* Alerta si algún proveedor falló */}
            {failedProviders.length > 0 && !isPending && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-900 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                <span>
                  El servicio de <strong>{failedProviders.join(', ')}</strong> presentó demoras. Mostrando planes disponibles.
                </span>
              </div>
            )}

            {/* Lista de Resultados */}
            {quotes && vehicleData && !isPending && (
              <div className="space-y-4">
                {/* Cabecera del vehículo cotizado + Filtros */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                      Cotización Oficial Generada
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {vehicleData.brand} {vehicleData.model}{' '}
                      <span className="font-semibold text-slate-500">
                        {vehicleData.version} ({vehicleData.year})
                      </span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                    {[
                      { id: 'ALL', label: 'Todos' },
                      { id: 'RC', label: 'Resp. Civil' },
                      { id: 'TERCEROS_COMPLETO', label: 'Terceros' },
                      { id: 'TODO_RIESGO', label: 'Todo Riesgo' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedCategory(tab.id as 'ALL' | PlanCategory)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedCategory === tab.id
                            ? 'bg-white text-blue-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredQuotes && filteredQuotes.length > 0 ? (
                  filteredQuotes.map((quote: StandardQuote) => (
                    <QuoteCard
                      key={quote.externalId}
                      quote={quote}
                      vehicleData={vehicleData}
                    />
                  ))
                ) : (
                  <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                    No hay planes disponibles en esta categoría para la antigüedad seleccionada ({vehicleData.year}).
                  </div>
                )}
              </div>
            )}

            {/* Skeletons de Carga Refinados */}
            {isPending && (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-slate-200 rounded" />
                    <div className="h-5 w-56 bg-slate-200 rounded" />
                  </div>
                  <div className="h-8 w-48 bg-slate-100 rounded-xl" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-200 p-6 h-52 animate-pulse flex flex-col sm:flex-row gap-6"
                  >
                    <div className="sm:w-2/5 space-y-3 border-r border-slate-100 pr-4">
                      <div className="h-6 w-32 bg-slate-200 rounded-lg" />
                      <div className="h-5 w-44 bg-slate-200 rounded" />
                      <div className="h-9 w-36 bg-slate-200 rounded mt-6" />
                    </div>
                    <div className="sm:w-3/5 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="h-4 w-full bg-slate-100 rounded" />
                        <div className="h-4 w-5/6 bg-slate-100 rounded" />
                        <div className="h-4 w-4/6 bg-slate-100 rounded" />
                      </div>
                      <div className="h-11 w-full bg-slate-200 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Institucional de Confianza */}
      <footer className="bg-white border-t border-slate-200/80 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-medium text-slate-600">
            © {new Date().getFullYear()} SegurosAutoYa · Cotizador Oficial de Seguros Automotores.
          </p>
          <p className="text-slate-400 text-center sm:text-right">
            Superintendencia de Seguros de la Nación (SSN) · Los valores expuestos son referenciales sujetos a inspección.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
