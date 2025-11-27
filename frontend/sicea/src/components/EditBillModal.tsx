import React, { useState, useEffect } from 'react';
import axios from 'axios';

type EditBillModalProps = {
  isOpen: boolean;
  bill: {
    id: number;
    month?: number | string;
    year?: number | string;
    total_to_pay: string;
  } | null;
  onSave: (updatedBill: { id: number; month: number; year: number; total_to_pay: string }) => void;
  onCancel: () => void;
};

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const EditBillModal: React.FC<EditBillModalProps> = ({ isOpen, bill, onSave, onCancel }) => {
  const [month, setMonth] = useState<number | string>('');
  const [year, setYear] = useState<number | string>('');
  const [totalToPay, setTotalToPay] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bill) {
      setMonth(bill.month || '');
      setYear(bill.year || '');
      setTotalToPay(bill.total_to_pay || '');
    }
  }, [bill]);

  if (!isOpen || !bill) return null;

  const handleSave = async () => {
    if (!month || !year || !totalToPay || Number(year) < 0) {
      alert('Todos los campos son obligatorios y el año no puede ser negativo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedBill = {
        id: bill.id,
        month: Number(month),
        year: Number(year),
        total_to_pay: totalToPay,
      };

      // Enviar la solicitud PUT al endpoint correspondiente
      const response = await axios.put(
        `http://localhost:8000/api/reader/bills/${bill.id}/`,
        updatedBill,
        { withCredentials: true }
      );

      console.log('Factura actualizada:', response.data);

      // Llamar a la función onSave para actualizar el estado en el componente padre
      onSave(updatedBill);
    } catch (err: any) {
      console.error('Error al actualizar la factura:', err);
      setError('Error al actualizar la factura. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-4">Editar Factura</h2>
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-center">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Mes</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
          >
            <option value="">Selecciona un mes</option>
            {monthNames.map((name, index) => (
              <option key={index} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Año</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Math.max(0, Number(e.target.value)))}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">Total a Pagar</label>
          <input
            type="text"
            value={totalToPay}
            onChange={(e) => setTotalToPay(e.target.value)}
            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
          />
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="bg-gray-500/80 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBillModal;
