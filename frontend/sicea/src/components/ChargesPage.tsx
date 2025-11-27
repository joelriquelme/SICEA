import React, { useEffect, useState } from 'react';

type Charge = {
  id: number;
  description?: string;
  amount?: number | string;
  // otros campos según modelo
};

export default function ChargesPage(): JSX.Element {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharges = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reader/charges/', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: Charge[] = Array.isArray(data) ? data : (data.results || []);
      setCharges(items);
    } catch (err: any) {
      setError(err.message || 'Error al cargar cargos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Cargos individuales</h1>

      <div className="mb-4">
        <button onClick={fetchCharges} className="bg-blue-600 text-white px-3 py-1 rounded">Recargar</button>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <ul className="space-y-2">
          {charges.length === 0 && <li className="text-gray-600">No hay cargos</li>}
          {charges.map(c => (
            <li key={c.id} className="border p-3 rounded">
              <div className="font-medium">{c.description || `Cargo ${c.id}`}</div>
              <div className="text-sm text-gray-700">Monto: {c.amount ?? '-'}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
