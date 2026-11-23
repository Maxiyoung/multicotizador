import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  CarFront,
  MapPin,
  Settings2,
  Calendar,
  Briefcase,
  Sparkles,
  Flame,
  Warehouse,
  ArrowRight,
  Lock,
  BadgeCheck,
  PencilLine,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchBrands,
  fetchModels,
  fetchVersions,
  lookupPostalCode,
  searchPostalCodes,
  searchVehicles,
  type CodeOrigin,
  type PostalCodeEntry,
  type QuoteInput,
  type VehicleVersionOption,
} from '../services/api';

const CURRENT_YEAR = new Date().getFullYear();

const formSchema = z.object({
  year: z
    .number({ message: 'Ingresá un año válido' })
    .int('Debe ser un año entero')
    .min(1990, 'Mínimo año 1990')
    .max(CURRENT_YEAR + 1, 'Año inválido'),
  brand: z.string().trim().min(2, 'Seleccioná o ingresá la marca'),
  model: z.string().trim().min(1, 'Seleccioná o ingresá el modelo'),
  version: z.string().trim().min(1, 'Especificá la versión'),
  infoAutoCode: z.string().optional(),
  vehicleValue: z.number().positive('Valor inválido').optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/, 'CP inválido (ej: 5000 o C1425)'),
  locality: z.string().optional(),
  province: z.string().optional(),
  use: z.enum(['particular', 'comercial']),
  hasGnc: z.boolean(),
  gncValue: z.number().positive('Valor de GNC inválido').optional(),
  isZeroKm: z.boolean(),
  hasGarage: z.boolean(),
}).superRefine((data, ctx) => {
  const minZeroKmYear = CURRENT_YEAR - 1;
  if (data.isZeroKm && data.year < minZeroKmYear) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['isZeroKm'],
      message: `Solo vehículos ${minZeroKmYear} o posteriores pueden ser 0 KM`,
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

interface QuoteFormProps {
  onSubmit: (data: QuoteInput) => void;
  isLoading: boolean;
}

const formatArs = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function QuoteForm({ onSubmit, isLoading }: QuoteFormProps) {
  const [manualMode, setManualMode] = useState(false);
  const [selectedCodeOrigin, setSelectedCodeOrigin] = useState<CodeOrigin>('seed');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleResults, setShowVehicleResults] = useState(false);

  const [cpSearchInput, setCpSearchInput] = useState('5000');
  const [showCpDropdown, setShowCpDropdown] = useState(false);

  const debouncedVehicleSearch = useDebouncedValue(vehicleSearch.trim(), 220);
  const debouncedCpSearch = useDebouncedValue(cpSearchInput.trim(), 220);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: Math.min(2022, CURRENT_YEAR),
      brand: '',
      model: '',
      version: '',
      infoAutoCode: undefined,
      vehicleValue: undefined,
      postalCode: '5000',
      locality: 'Córdoba',
      province: 'Córdoba',
      use: 'particular',
      hasGnc: false,
      gncValue: undefined,
      isZeroKm: false,
      hasGarage: false,
    },
  });

  const selectedYear = useWatch({ control, name: 'year' });
  const selectedBrand = useWatch({ control, name: 'brand' });
  const selectedModel = useWatch({ control, name: 'model' });
  const selectedInfoAutoCode = useWatch({ control, name: 'infoAutoCode' });
  const selectedVehicleValue = useWatch({ control, name: 'vehicleValue' });
  const selectedPostalCode = useWatch({ control, name: 'postalCode' });
  const selectedLocality = useWatch({ control, name: 'locality' });
  const selectedProvince = useWatch({ control, name: 'province' });
  const hasGnc = useWatch({ control, name: 'hasGnc' });
  const isZeroKm = useWatch({ control, name: 'isZeroKm' });
  const hasGarage = useWatch({ control, name: 'hasGarage' });

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = CURRENT_YEAR + 1; y >= 1990; y -= 1) {
      list.push(y);
    }
    return list;
  }, []);

  const validYear =
    Number.isInteger(selectedYear) && selectedYear >= 1990 && selectedYear <= CURRENT_YEAR + 1
      ? selectedYear
      : undefined;

  const brandsQuery = useQuery({
    queryKey: ['catalog', 'brands', validYear],
    queryFn: () => fetchBrands(validYear),
    enabled: !manualMode && validYear !== undefined,
    staleTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1500,
  });

  const modelsQuery = useQuery({
    queryKey: ['catalog', 'models', selectedBrand, validYear],
    queryFn: () => fetchModels(selectedBrand, validYear),
    enabled: !manualMode && Boolean(selectedBrand) && validYear !== undefined,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const versionsQuery = useQuery({
    queryKey: ['catalog', 'versions', selectedBrand, selectedModel, validYear],
    queryFn: () => fetchVersions(selectedBrand, selectedModel, validYear),
    enabled:
      !manualMode && Boolean(selectedBrand) && Boolean(selectedModel) && validYear !== undefined,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const quickSearchQuery = useQuery({
    queryKey: ['catalog', 'search', debouncedVehicleSearch, validYear],
    queryFn: () => searchVehicles(debouncedVehicleSearch, validYear),
    enabled: !manualMode && debouncedVehicleSearch.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const cpPatternValid = /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(selectedPostalCode.trim());
  const cpLookupQuery = useQuery({
    queryKey: ['catalog', 'cp-lookup', selectedPostalCode.trim()],
    queryFn: () => lookupPostalCode(selectedPostalCode.trim()),
    enabled: cpPatternValid,
    staleTime: 30 * 60 * 1000,
    retry: 0,
  });

  const cpSearchQuery = useQuery({
    queryKey: ['catalog', 'cp-search', debouncedCpSearch],
    queryFn: () => searchPostalCodes(debouncedCpSearch),
    enabled: showCpDropdown && debouncedCpSearch.length >= 2,
    staleTime: 10 * 60 * 1000,
    retry: 0,
  });

  const brands = brandsQuery.data ?? [];
  const models = modelsQuery.data ?? [];
  const versions = versionsQuery.data ?? [];

  const effectiveManualMode =
    manualMode || brandsQuery.isError || (brandsQuery.isSuccess && brands.length === 0);

  const canBeZeroKm = selectedYear >= CURRENT_YEAR - 1;

  const handleYearChange = (newYear: number) => {
    setValue('year', newYear, { shouldValidate: true });
    if (newYear < CURRENT_YEAR - 1) {
      setValue('isZeroKm', false);
    }
    if (!effectiveManualMode) {
      setValue('brand', '');
      setValue('model', '');
      setValue('version', '');
      setValue('infoAutoCode', undefined);
      setValue('vehicleValue', undefined);
    }
  };

  const handleBrandChange = (newBrand: string) => {
    setValue('brand', newBrand, { shouldValidate: true });
    setValue('model', '');
    setValue('version', '');
    setValue('infoAutoCode', undefined);
    setValue('vehicleValue', undefined);
  };

  const handleModelChange = (newModel: string) => {
    setValue('model', newModel, { shouldValidate: true });
    setValue('version', '');
    setValue('infoAutoCode', undefined);
    setValue('vehicleValue', undefined);
  };

  const applyCatalogVehicle = (picked: VehicleVersionOption) => {
    const inlineYearMatch = debouncedVehicleSearch.match(/\b(199\d|20[0-3]\d)\b/);
    const inlineYear = inlineYearMatch ? Number(inlineYearMatch[1]) : undefined;
    const desiredYear = inlineYear ?? selectedYear;

    // Ajustamos año si el año deseado no cae dentro del rango de comercialización del vehículo
    const targetYear =
      desiredYear >= picked.yearFrom && desiredYear <= picked.yearTo
        ? desiredYear
        : Math.min(picked.yearTo, CURRENT_YEAR);

    setManualMode(false);
    setValue('year', targetYear, { shouldValidate: true });
    if (targetYear < CURRENT_YEAR - 1) {
      setValue('isZeroKm', false);
    }
    setValue('brand', picked.brand, { shouldValidate: true });
    setValue('model', picked.model, { shouldValidate: true });
    setValue('version', picked.version, { shouldValidate: true });
    setValue('infoAutoCode', picked.infoAutoCode);
    setValue('vehicleValue', picked.estimatedValue);
    setSelectedCodeOrigin(picked.codeOrigin);
  };

  const handleVersionSelect = (infoAutoCode: string) => {
    const picked = versions.find((v) => v.infoAutoCode === infoAutoCode);
    if (!picked) {
      setValue('version', '');
      setValue('infoAutoCode', undefined);
      setValue('vehicleValue', undefined);
      return;
    }

    setValue('version', picked.version, { shouldValidate: true });
    setValue('infoAutoCode', picked.infoAutoCode);
    setValue('vehicleValue', picked.estimatedValue);
    setSelectedCodeOrigin(picked.codeOrigin);
  };

  const handleCpInputChange = (val: string) => {
    setCpSearchInput(val);
    setShowCpDropdown(true);
    setValue('postalCode', val, { shouldValidate: /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(val.trim()) });
    setValue('locality', undefined);
    setValue('province', undefined);
  };

  const handleCpPick = (entry: PostalCodeEntry) => {
    setCpSearchInput(entry.postalCode);
    setShowCpDropdown(false);
    setValue('postalCode', entry.postalCode, { shouldValidate: true });
    setValue('locality', entry.locality);
    setValue('province', entry.province);
  };

  const toggleManualMode = () => {
    const nextManual = !manualMode;
    setManualMode(nextManual);
    setVehicleSearch('');
    setValue('brand', '');
    setValue('model', '');
    setValue('version', '');
    setValue('infoAutoCode', undefined);
    setValue('vehicleValue', undefined);
  };

  const resolvedLocality =
    selectedLocality ?? (cpLookupQuery.data?.found ? cpLookupQuery.data.primary?.locality : undefined);
  const resolvedProvince =
    selectedProvince ?? (cpLookupQuery.data?.found ? cpLookupQuery.data.primary?.province : undefined);

  const handleFormSubmit = (values: FormValues) => {
    onSubmit({
      ...values,
      infoAutoCode: values.infoAutoCode || undefined,
      locality: resolvedLocality || undefined,
      province: resolvedProvince || undefined,
      vehicleValue:
        typeof values.vehicleValue === 'number' && !Number.isNaN(values.vehicleValue)
          ? values.vehicleValue
          : undefined,
      gncValue:
        values.hasGnc && typeof values.gncValue === 'number' && !Number.isNaN(values.gncValue)
          ? values.gncValue
          : undefined,
    });
  };

  const inputBase =
    'w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const inputNormal =
    'border-slate-200/90 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10';
  const inputError =
    'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-4 focus:ring-red-500/10';

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Fila 1: Año y Código Postal / Localidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Año
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className={`${inputBase} ${errors.year ? inputError : inputNormal} appearance-none cursor-pointer`}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {errors.year && (
            <span className="text-red-600 text-xs font-medium mt-1 block">
              {errors.year.message}
            </span>
          )}
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Código Postal o Localidad
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={cpSearchInput}
              onChange={(e) => handleCpInputChange(e.target.value)}
              onFocus={() => setShowCpDropdown(true)}
              onBlur={() => setTimeout(() => setShowCpDropdown(false), 160)}
              className={`${inputBase} ${errors.postalCode ? inputError : inputNormal}`}
              placeholder="Ej: 5000, C1425 o Rosario"
              autoComplete="off"
            />
          </div>

          {/* Dropdown de autocompletado de localidades AR */}
          {showCpDropdown && (cpSearchQuery.data?.length ?? 0) > 0 && (
            <ul className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
              {cpSearchQuery.data!.map((entry, idx) => (
                <li key={`${entry.postalCode}-${entry.province}-${idx}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleCpPick(entry);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {entry.locality}{' '}
                      <span className="font-normal text-slate-500">· {entry.province}</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                      {entry.postalCode}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {errors.postalCode ? (
            <span className="text-red-600 text-xs font-medium mt-1 block">
              {errors.postalCode.message}
            </span>
          ) : resolvedLocality && resolvedProvince ? (
            <span className="text-emerald-700 text-[11px] font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              {resolvedLocality}, {resolvedProvince}
            </span>
          ) : cpPatternValid && cpLookupQuery.isSuccess && !cpLookupQuery.data.found ? (
            <span className="text-amber-700 text-[11px] font-medium mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              CP no encontrado en padrón AR (buscá por ciudad)
            </span>
          ) : null}
        </div>
      </div>

      {/* Selector de Vehículo: Buscador rápido + Catálogo encadenado o Manual */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {effectiveManualMode ? 'Vehículo (carga manual)' : 'Vehículo (catálogo InfoAuto)'}
          </span>
          <button
            type="button"
            onClick={toggleManualMode}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            <PencilLine className="w-3 h-3" />
            {effectiveManualMode ? 'Usar catálogo' : '¿No está? Cargar manual'}
          </button>
        </div>

        {!effectiveManualMode ? (
          <>
            {/* Buscador instantáneo por modelo o código InfoAuto */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={vehicleSearch}
                onChange={(e) => {
                  setVehicleSearch(e.target.value);
                  setShowVehicleResults(true);
                }}
                onFocus={() => setShowVehicleResults(true)}
                onBlur={() => setTimeout(() => setShowVehicleResults(false), 160)}
                placeholder="Búsqueda inteligente: ej. vw gol 2020, 208 automatico, hilux 4x4..."
                className="w-full pl-10 pr-3.5 py-2 bg-blue-50/40 hover:bg-blue-50/70 focus:bg-white border border-blue-200/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all"
              />

              {showVehicleResults && debouncedVehicleSearch.length >= 2 && (
                <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {quickSearchQuery.isLoading ? (
                    <div className="p-3 text-xs text-slate-500 text-center">Buscando...</div>
                  ) : (quickSearchQuery.data?.length ?? 0) > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {quickSearchQuery.data!.map((item) => (
                        <li key={item.infoAutoCode}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              applyCatalogVehicle(item);
                              setVehicleSearch('');
                              setShowVehicleResults(false);
                            }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-900 truncate">
                                {item.brand} {item.model}{' '}
                                <span className="font-medium text-slate-600">{item.version}</span>
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                Años {item.yearFrom}–{Math.min(item.yearTo, CURRENT_YEAR)} ·{' '}
                                {item.fuel}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded shrink-0">
                              #{item.infoAutoCode}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      Sin resultados para &ldquo;{debouncedVehicleSearch}&rdquo;. Podés usar carga manual.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Marca (catálogo) */}
            <div>
              <div className="relative">
                <CarFront className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  disabled={brandsQuery.isLoading}
                  className={`${inputBase} ${errors.brand ? inputError : inputNormal} appearance-none cursor-pointer`}
                >
                  <option value="">
                    {brandsQuery.isLoading ? 'Cargando marcas...' : 'Seleccioná la marca'}
                  </option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
              {errors.brand && (
                <span className="text-red-600 text-xs font-medium mt-1 block">
                  {errors.brand.message}
                </span>
              )}
            </div>

            {/* Modelo y Versión (catálogo encadenado) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="relative">
                  <CarFront className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    disabled={!selectedBrand || modelsQuery.isLoading}
                    className={`${inputBase} ${errors.model ? inputError : inputNormal} appearance-none cursor-pointer`}
                  >
                    <option value="">
                      {!selectedBrand
                        ? 'Elegí marca primero'
                        : modelsQuery.isLoading
                          ? 'Cargando modelos...'
                          : 'Seleccioná el modelo'}
                    </option>
                    {models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.model && (
                  <span className="text-red-600 text-xs font-medium mt-1 block">
                    {errors.model.message}
                  </span>
                )}
              </div>

              <div>
                <div className="relative">
                  <Settings2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={selectedInfoAutoCode ?? ''}
                    onChange={(e) => handleVersionSelect(e.target.value)}
                    disabled={!selectedModel || versionsQuery.isLoading}
                    className={`${inputBase} ${errors.version ? inputError : inputNormal} appearance-none cursor-pointer`}
                  >
                    <option value="">
                      {!selectedModel
                        ? 'Elegí modelo primero'
                        : versionsQuery.isLoading
                          ? 'Cargando versiones...'
                          : 'Seleccioná la versión'}
                    </option>
                    {versions.map((v) => (
                      <option key={v.infoAutoCode} value={v.infoAutoCode}>
                        {v.version}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.version && (
                  <span className="text-red-600 text-xs font-medium mt-1 block">
                    {errors.version.message}
                  </span>
                )}
              </div>
            </div>

            {/* Badge transparente de origen InfoAuto + Suma Asegurada de referencia */}
            {selectedInfoAutoCode && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-900 flex-wrap">
                <span className="flex items-center gap-1.5 font-semibold">
                  <BadgeCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  {selectedCodeOrigin === 'infoauto'
                    ? `InfoAuto oficial #${selectedInfoAutoCode}`
                    : `Cód. catálogo ref. #${selectedInfoAutoCode} (demo)`}
                </span>
                {selectedVehicleValue && (
                  <span className="text-blue-700 font-medium">
                    Suma ref.: {formatArs(selectedVehicleValue)}
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <div className="relative">
                <CarFront className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  {...register('brand')}
                  className={`${inputBase} ${errors.brand ? inputError : inputNormal}`}
                  placeholder="Marca (ej: Volkswagen, Toyota...)"
                />
              </div>
              {errors.brand && (
                <span className="text-red-600 text-xs font-medium mt-1 block">
                  {errors.brand.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="relative">
                  <CarFront className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    {...register('model')}
                    className={`${inputBase} ${errors.model ? inputError : inputNormal}`}
                    placeholder="Modelo (ej: Gol Trend)"
                  />
                </div>
                {errors.model && (
                  <span className="text-red-600 text-xs font-medium mt-1 block">
                    {errors.model.message}
                  </span>
                )}
              </div>

              <div>
                <div className="relative">
                  <Settings2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    {...register('version')}
                    className={`${inputBase} ${errors.version ? inputError : inputNormal}`}
                    placeholder="Versión (ej: 1.6 Trendline)"
                  />
                </div>
                {errors.version && (
                  <span className="text-red-600 text-xs font-medium mt-1 block">
                    {errors.version.message}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
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

      {/* Tarjetas interactivas para GNC, 0KM y Garage */}
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Características adicionales
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          <label
            className={`flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all select-none ${
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
              <span className="block text-[10px] text-slate-500">Declarado</span>
            </div>
          </label>

          <label
            title={
              canBeZeroKm
                ? 'Marcar si el vehículo es 0 KM'
                : `Disponible solo para modelos ${CURRENT_YEAR - 1} o posteriores`
            }
            className={`flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-sm font-medium transition-all select-none ${
              !canBeZeroKm
                ? 'bg-slate-100/70 border-slate-200/70 text-slate-400 opacity-60 cursor-not-allowed'
                : isZeroKm
                  ? 'bg-blue-50/80 border-blue-600 text-blue-950 ring-2 ring-blue-600/10 cursor-pointer'
                  : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80 cursor-pointer'
            }`}
          >
            <input
              type="checkbox"
              disabled={!canBeZeroKm}
              {...register('isZeroKm')}
              className="sr-only"
            />
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                canBeZeroKm && isZeroKm ? 'bg-blue-600 text-white' : 'bg-slate-200/70 text-slate-500'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold leading-tight">Es 0 KM</span>
              <span className="block text-[10px] text-slate-500">
                {canBeZeroKm ? 'Sin rodar' : `${CURRENT_YEAR - 1}+`}
              </span>
            </div>
          </label>

          <label
            className={`flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all select-none ${
              hasGarage
                ? 'bg-blue-50/80 border-blue-600 text-blue-950 ring-2 ring-blue-600/10'
                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
            }`}
          >
            <input type="checkbox" {...register('hasGarage')} className="sr-only" />
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                hasGarage ? 'bg-blue-600 text-white' : 'bg-slate-200/70 text-slate-500'
              }`}
            >
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold leading-tight">Garage</span>
              <span className="block text-[10px] text-slate-500">Cochera fija</span>
            </div>
          </label>
        </div>

        {hasGnc && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Valor estimado del equipo GNC (opcional, en ARS)
            </label>
            <input
              type="number"
              {...register('gncValue', {
                setValueAs: (val) => (val === '' || val === null ? undefined : Number(val)),
              })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              placeholder="Ej: 900000"
            />
          </div>
        )}
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
            <span>Comparando aseguradoras...</span>
          </>
        ) : (
          <>
            <span>Comparar Cotizaciones</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <Lock className="w-3.5 h-3.5 text-emerald-600" />
        <span>Cotización 100% gratuita y sin datos personales</span>
      </div>
    </form>
  );
}
