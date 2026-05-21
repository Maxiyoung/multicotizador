import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { QuoteForm } from './components/quoteform';
import { QuoteCard } from './components/quotecard';
import { fetchQuotes } from './services/api';
import type { QuoteInput, StandardQuote } from './services/api';

function App() {
  const [vehicleData, setVehicleData] = useState<QuoteInput | null>(null);

  // React Query maneja el ciclo de vida de la petición POST
  const { mutate, isPending, isError, data: quotes } = useMutation({
    mutationFn: fetchQuotes,
    onSuccess: (_, variables) => {
      // Guardamos los datos del vehículo para pasárselos a las tarjetas
      setVehicleData(variables);
    }
  });

  const handleFormSubmit = (data: QuoteInput) => {
    mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Premium */}
      <header className="bg-primary-900 text-white py-6 shadow-md">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary-500" />
          <h1 className="text-2xl font-bold tracking-tight">SegurosAutoYa</h1>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8 lg:py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Cotizá y compará en segundos
          </h2>
          <p className="text-slate-500 text-lg">
            Ingresá los datos de tu vehículo y elegí la mejor cobertura al instante.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Columna Izquierda: Formulario */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-slate-100 sticky top-8">
              <h3 className="text-xl font-semibold mb-6 text-slate-800">
                Datos del Vehículo
              </h3>
              <QuoteForm onSubmit={handleFormSubmit} isLoading={isPending} />
            </div>
          </div>

          {/* Columna Derecha: Resultados */}
          <div className="lg:col-span-7">
            
            {/* Estado Inicial */}
            {!isPending && !quotes && !isError && (
              <div className="h-full min-h-[300px] flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8">
                 <p className="text-slate-400 text-center font-medium">
                   Completá el formulario a la izquierda para ver las ofertas disponibles.
                 </p>
              </div>
            )}

            {/* Estado de Error */}
            {isError && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h4 className="font-bold">Ocurrió un error</h4>
                  <p className="text-sm mt-1">No pudimos procesar las cotizaciones. Por favor, verificá los datos e intentá nuevamente.</p>
                </div>
              </div>
            )}

            {/* Estado de Éxito: Lista de Resultados */}
            {quotes && vehicleData && !isPending && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-lg font-semibold text-slate-700 mb-4">
                  {quotes.length} opciones encontradas para tu {vehicleData.brand}
                </h3>
                {quotes.map((quote: StandardQuote) => (
                  <QuoteCard 
                    key={quote.externalId} 
                    quote={quote} 
                    vehicleData={vehicleData} 
                  />
                ))}
              </div>
            )}

            {/* Skeletons de Carga (Opcional visual) */}
            {isPending && (
               <div className="space-y-4">
                 {[1, 2].map((i) => (
                   <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse border border-slate-200"></div>
                 ))}
               </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;