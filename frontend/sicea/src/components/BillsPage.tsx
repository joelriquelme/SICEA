import React, { useEffect, useState } from 'react';
import ConfirmModal from './ConfirmModal'; // Importar el nuevo componente
import EditBillModal from './EditBillModal'; // Importar el nuevo componente
import NavBar from './NavBar';
import { Droplets, Zap, Trash2, Edit3, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'; // Agregar iconos de ordenamiento
import axios from 'axios'; // Importar axios
import { useAuth } from '../hooks/AuthContext';
import { API_BASE } from '../services/config';

type Meter = {
  id: number;
  name: string;
  client_number: string;
  meter_type: 'WATER' | 'ELECTRICITY';
};

type Bill = {
  total_to_pay: string;
  id: number;
  month?: number | string;
  year?: number | string;
  total_amount?: number | string;
  meter?: string;
};

type Charge = {
  id: number;
  name: string;
  value: number;
  value_type: string;
  charge: number;
};

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function BillsPage(): JSX.Element {
  const [bills, setBills] = useState<Bill[]>([]);
  const [totalBills, setTotalBills] = useState<number>(0);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meterType, setMeterType] = useState<'WATER' | 'ELECTRICITY' | ''>('');
  const [selectedMeter, setSelectedMeter] = useState<number | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [billToEdit, setBillToEdit] = useState<Bill | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: 'meter' | 'month' | 'year' | 'total_to_pay'; direction: 'asc' | 'desc' } | null>(null);
  const [startMonth, setStartMonth] = useState<string>(''); // Nuevo mes de inicio
  const [startYear, setStartYear] = useState<string>(''); // Nuevo año de inicio
  const [endMonth, setEndMonth] = useState<string>(''); // Nuevo mes de fin
  const [endYear, setEndYear] = useState<string>(''); // Nuevo año de fin
  const [filters, setFilters] = useState({ meterType, selectedMeter, startMonth, startYear, endMonth, endYear }); // Estado para filtros
  const [expandedBillId, setExpandedBillId] = useState<number | null>(null); // Estado para expandir cargos
  const [charges, setCharges] = useState<Charge[]>([]); // Estado para almacenar los cargos de la factura
  const { user } = useAuth(); // Obtener el usuario autenticado

  const fetchMeters = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reader/meters/`, { withCredentials: true });
      setMeters(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar medidores.');
    }
  };

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filters.meterType) params.meter_type = filters.meterType;
      if (filters.selectedMeter) {
        const selectedMeterObj = meters.find((m) => m.id === filters.selectedMeter);
        if (selectedMeterObj) {
          params.client_number = selectedMeterObj.client_number;
        }
      }
      if (filters.startMonth && filters.startYear) params.start_date = `${filters.startYear}-${filters.startMonth}`;
      if (filters.endMonth && filters.endYear) params.end_date = `${filters.endYear}-${filters.endMonth}`;

      const res = await axios.get(`${API_BASE}/reader/bills/`, {
        params,
        withCredentials: true,
      });
      console.log('Facturas cargadas:', res.data);
      const items: Bill[] = Array.isArray(res.data) ? res.data : res.data.results || [];
      const count: number = res.data.count || items.length;
      setBills(items);
      setTotalBills(count);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al cargar facturas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeters();
  }, []);

  const applyFilters = () => {
    // Validar que la fecha inicial sea menor o igual a la final
    if (startYear && startMonth && endYear && endMonth) {
      const startDate = new Date(Number(startYear), Number(startMonth) - 1);
      const endDate = new Date(Number(endYear), Number(endMonth) - 1);

      if (startDate > endDate) {
        setError('La fecha inicial debe ser menor o igual a la fecha final.');
        return;
      }
    }

    // Usar la fecha actual si no se llena el campo "Hasta"
    const currentDate = new Date();
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const currentYear = currentDate.getFullYear().toString();

    setFilters({
      meterType,
      selectedMeter,
      startMonth,
      startYear,
      endMonth: endMonth || currentMonth,
      endYear: endYear || currentYear,
    });
    setError(null); // Limpiar errores si todo es válido
  };

  useEffect(() => {
    fetchBills();
  }, [filters]); // Llamar a la API solo cuando se apliquen los filtros

  // Función para formatear el monto como dinero
  const formatCurrency = (amount: string | number): string => {
    if (!amount) return 'N/A';
    return parseFloat(amount.toString())
      .toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })
      .replace(/\s*CLP/, '');
  };

  const handleEdit = (billId: number) => {
    const bill = bills.find((b) => b.id === billId);
    if (bill) {
      setBillToEdit(bill);
      setIsEditModalOpen(true);
    }
  };

  const handleDelete = async (billId: number) => {
    setBillToDelete(billId);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (billToDelete === null) return;
    try {
      await axios.delete(`${API_BASE}/reader/bills/${billToDelete}/`, { withCredentials: true });
      console.log(`Boleta con ID ${billToDelete} eliminada`);
      setBills((prevBills) => prevBills.filter((bill) => bill.id !== billToDelete));
    } catch (err: any) {
      console.error('Error al eliminar la boleta:', err);
    } finally {
      setIsModalOpen(false);
      setBillToDelete(null);
    }
  };

  const saveEditedBill = async (updatedBill: { id: number; month: number; year: number; total_to_pay: string }) => {
    try {
      const res = await axios.put(
        `${API_BASE}/reader/bills/${updatedBill.id}/`,
        updatedBill,
        { withCredentials: true }
      );
      console.log('Boleta actualizada:', res.data);
      setBills((prevBills) =>
        prevBills.map((bill) => (bill.id === updatedBill.id ? { ...bill, ...updatedBill } : bill))
      );
    } catch (err: any) {
      console.error('Error al actualizar la boleta:', err);
    } finally {
      setIsEditModalOpen(false);
      setBillToEdit(null);
    }
  };

  const handleSort = (key: 'meter' | 'month' | 'year' | 'total_to_pay') => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        // Toggle direction if the same column is clicked
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' }; // Default to ascending
    });
  };

  const getSortIcon = (key: 'meter' | 'month' | 'year' | 'total_to_pay') => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4" /> 
      : <ArrowDown className="w-4 h-4" />;
  };

  const sortedBills = React.useMemo(() => {
    if (!sortConfig) return bills;
    const sorted = [...bills].sort((a, b) => {
      let aValue: number | string = a[sortConfig.key] || 0;
      let bValue: number | string = b[sortConfig.key] || 0;

      // Convert total_to_pay to a number for sorting
      if (sortConfig.key === 'total_to_pay') {
        aValue = parseFloat(aValue.toString());
        bValue = parseFloat(bValue.toString());
      }

      // Sort by meter name (string)
      if (sortConfig.key === 'meter') {
        aValue = (aValue as string).toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortConfig.key === 'year' || sortConfig.key === 'month') {
        // Sort by year first, then by month
        if (a.year !== b.year) {
          return sortConfig.direction === 'asc'
            ? Number(a.year) - Number(b.year)
            : Number(b.year) - Number(a.year);
        }
        if (a.month !== b.month) {
          return sortConfig.direction === 'asc'
            ? Number(a.month) - Number(b.month)
            : Number(b.month) - Number(a.month);
        }
      }

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
    return sorted;
  }, [bills, sortConfig]);

  const fetchCharges = async (billId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/reader/bills/${billId}/charges/`, {
        withCredentials: true,
      });
      console.log('Charges fetched:', res.data);
      setCharges(res.data); // Actualizar los cargos con los datos obtenidos
    } catch (err: any) {
      console.error('Error al cargar los cargos:', err);
      setCharges([]); // Limpiar los cargos en caso de error
    }
  };

  const toggleCharges = (billId: number) => {
    if (expandedBillId === billId) {
      setExpandedBillId(null); // Colapsar la fila si ya está expandida
      setCharges([]); // Limpiar los cargos
    } else {
      setExpandedBillId(billId); // Expandir la fila
      fetchCharges(billId); // Buscar los cargos de la factura
    }
  };

  const downloadPDF = async (billId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/reader/bills/${billId}/download/`, {
        responseType: 'blob', // Indicar que se espera un archivo binario
        withCredentials: true,
      });

      // Crear un enlace para descargar el archivo
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factura_${billId}.pdf`); // Nombre del archivo
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      console.error('Error al descargar el PDF:', err);
      setError('Error al descargar el archivo PDF.');
    }
  };

  return (
    <>
      <NavBar />
      <div className="pt-20 min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center px-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-10 w-full max-w-4xl border border-white/20">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Facturas</h1>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por tipo de medidor */}
            <div>
              <label className="block text-blue-100 mb-2 font-medium">Tipo de Medidor</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setMeterType((prev) => (prev === 'WATER' ? '' : 'WATER'))}
                  className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    meterType === 'WATER'
                      ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
                      : 'bg-white/10 text-blue-200 hover:bg-white/20'
                  }`}
                >
                  <Droplets className="w-5 h-5" />
                  Agua
                </button>
                <button
                  type="button"
                  onClick={() => setMeterType((prev) => (prev === 'ELECTRICITY' ? '' : 'ELECTRICITY'))}
                  className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    meterType === 'ELECTRICITY'
                      ? 'bg-yellow-500 text-white shadow-lg hover:bg-yellow-600'
                      : 'bg-white/10 text-blue-200 hover:bg-white/20'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  Electricidad
                </button>
              </div>
            </div>

            {/* Filtro por medidor */}
            <div>
              <label className="block text-blue-100 mb-2 font-medium">Medidor</label>
              <select
                value={selectedMeter}
                onChange={(e) => setSelectedMeter(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full bg-slate-800 text-white py-3 px-4 rounded-lg border border-white/30"
              >
                <option value="">Todos los medidores</option>
                {meters
                  .filter((m) => !meterType || m.meter_type === meterType)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Cliente: {m.client_number})
                    </option>
                  ))}
              </select>
            </div>

            {/* Filtro por rango de mes y año */}
            <div className="col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-blue-100 font-medium">Desde:</label>
                <label className="text-blue-100 font-medium ml-20">Hasta:</label>
              </div>
              <div className="flex justify-between gap-4">
                {/* Selector de mes y año de inicio */}
                <div className="flex gap-2">
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="bg-slate-800 text-white py-3 px-4 rounded-lg border border-white/30"
                  >
                    <option value="">Mes Inicio</option>
                    {monthNames.map((month, index) => (
                      <option key={index} value={(index + 1).toString().padStart(2, '0')}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    placeholder="Año Inicio"
                    className="bg-slate-800 text-white py-3 px-4 rounded-lg border border-white/30"
                  />
                </div>

                {/* Selector de mes y año de fin */}
                <div className="flex gap-2">
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="bg-slate-800 text-white py-3 px-4 rounded-lg border border-white/30"
                  >
                    <option value="">Mes Fin</option>
                    {monthNames.map((month, index) => (
                      <option key={index} value={(index + 1).toString().padStart(2, '0')}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    placeholder="Año Fin"
                    className="bg-slate-800 text-white py-3 px-4 rounded-lg border border-white/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botón de Filtrar */}
          <div className="flex justify-end mb-6">
            <button
              onClick={applyFilters}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2 font-semibold"
            >
              <Filter className="w-5 h-5" />
              Filtrar
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-center text-sm">
              {error}
            </div>
          )}
          {loading && <p className="text-white">Cargando...</p>}
          {!loading && !error && (
            <>
              <div className="mb-2">
                <p className="text-white text-sm">Total: {totalBills} {totalBills === 1 ? 'factura' : 'facturas'}</p>
              </div>
              <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-white">
                <thead>
                  <tr>
                    <th 
                      className="border-b border-gray-600 px-4 py-2 text-left cursor-pointer hover:bg-white/10 transition-colors select-none"
                      onClick={() => handleSort('meter')}
                    >
                      <div className="flex items-center gap-2">
                        Medidor
                        {getSortIcon('meter')}
                      </div>
                    </th>
                    <th 
                      className="border-b border-gray-600 px-4 py-2 text-left cursor-pointer hover:bg-white/10 transition-colors select-none"
                      onClick={() => handleSort('month')}
                    >
                      <div className="flex items-center gap-2">
                        Mes
                        {getSortIcon('month')}
                      </div>
                    </th>
                    <th 
                      className="border-b border-gray-600 px-4 py-2 text-left cursor-pointer hover:bg-white/10 transition-colors select-none"
                      onClick={() => handleSort('year')}
                    >
                      <div className="flex items-center gap-2">
                        Año
                        {getSortIcon('year')}
                      </div>
                    </th>
                    <th 
                      className="border-b border-gray-600 px-4 py-2 text-left cursor-pointer hover:bg-white/10 transition-colors select-none"
                      onClick={() => handleSort('total_to_pay')}
                    >
                      <div className="flex items-center gap-2">
                        Total a Pagar
                        {getSortIcon('total_to_pay')}
                      </div>
                    </th>
                    <th className="border-b border-gray-600 px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBills.map((b) => (
                    <React.Fragment key={b.id}>
                      <tr
                        className={`hover:bg-blue-700/50 transition-colors cursor-pointer ${
                          expandedBillId === b.id ? 'bg-blue-700/50' : ''
                        }`}
                        onClick={() => toggleCharges(b.id)}
                      >
                        <td className="border-b border-gray-700 px-4 py-2">{b.meter || 'N/A'}</td>
                        <td className="border-b border-gray-700 px-4 py-2">
                          {b.month ? monthNames[Number(b.month) - 1] : 'N/A'}
                        </td>
                        <td className="border-b border-gray-700 px-4 py-2">
                          {b.year && Number(b.year) >= 0 ? b.year : 'N/A'}
                        </td>
                        <td className="border-b border-gray-700 px-4 py-2">{formatCurrency(b.total_to_pay)}</td>
                        <td className="border-b border-gray-700 px-4 py-2 flex gap-2">
                          {user?.is_staff && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evitar que se active el evento de la fila
                              handleEdit(b.id);
                            }}
                            className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          )}
                          {user?.is_staff && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evitar que se active el evento de la fila
                              handleDelete(b.id);
                            }}
                            className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
                            title="Eliminar"
                          >
                          
                            <Trash2 className="w-5 h-5" />
                          </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evitar que se active el evento de la fila
                              downloadPDF(b.id);
                            }}
                            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
                            title="Descargar PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                      {expandedBillId === b.id && (
                        <tr>
                          <td colSpan={5} className="bg-blue-900/50 px-4 py-2">
                            <h4 className="text-white font-semibold mb-2">Cargos:</h4>
                            <ul className="list-disc pl-6 text-blue-200">
                              {charges.length > 0 ? (
                                charges.map((charge) => (
                                  <li key={charge.id}>
                                    {charge.name} ({parseFloat(charge.value.toString()).toString()} {charge.value_type}): {formatCurrency(charge.charge)}
                                  </li>
                                ))
                              ) : (
                                <li>No hay cargos disponibles.</li>
                              )}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {bills.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-300">
                        No hay facturas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
        <div className="text-center mt-12">
          <p className="text-blue-200/60 text-sm">© 2025 SICEA. Todos los derechos reservados.</p>
        </div>
      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={isModalOpen}
        title="Confirmar eliminación"
        message="¿Estás seguro de que deseas eliminar esta factura?"
        onConfirm={confirmDelete}
        onCancel={() => setIsModalOpen(false)}
      />

      {/* Modal de edición */}
      <EditBillModal
        isOpen={isEditModalOpen}
        bill={billToEdit}
        onSave={saveEditedBill}
        onCancel={() => setIsEditModalOpen(false)}
      />
    </>
  );
}
