import React, { useEffect, useState } from "react";
import NavBar from "./NavBar";
import axios from "axios";
import { Trash2, Edit3, Droplets, Zap } from "lucide-react"; // Cambia Filter por Droplets y Zap

type Meter = {
  id: number;
  name: string;
  client_number: string;
  meter_type: "WATER" | "ELECTRICITY";
  coverage: string;
};

const meterTypeLabels = {
  WATER: "Agua",
  ELECTRICITY: "Electricidad",
};

const MetersPage: React.FC = () => {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [meterToEdit, setMeterToEdit] = useState<Meter | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [meterTypeFilter, setMeterTypeFilter] = useState<"WATER" | "ELECTRICITY" | "">("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [meterToDelete, setMeterToDelete] = useState<Meter | null>(null);

  // Form state for add/edit
  const [form, setForm] = useState<Partial<Meter>>({
    name: "",
    client_number: "",
    meter_type: "WATER",
    coverage: "",
  });

  const fetchMeters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("http://localhost:8000/api/reader/meters/", { withCredentials: true });
      setMeters(res.data);
    } catch (err: any) {
      setError("Error al cargar medidores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeters();
  }, []);

  const openEditModal = (meter: Meter) => {
    setMeterToEdit(meter);
    // Elimina el campo id del form para evitar enviarlo al backend
    const { id, ...meterData } = meter;
    setForm({ ...meterData, meter_type: meter.meter_type || "WATER" });
    setIsEditModalOpen(true);
  };

  const openAddModal = () => {
    setForm({
      name: "",
      client_number: "",
      meter_type: "WATER",
      coverage: "",
    });
    setIsAddModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value: any = e.target.value;
    // Asegura que meter_type sea siempre "WATER" o "ELECTRICITY"
    if (e.target.name === "meter_type") {
      value = value === "ELECTRICITY" ? "ELECTRICITY" : "WATER";
    }
    setForm({ ...form, [e.target.name]: value });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterToEdit) return;
    setLoading(true);
    setError(null);
    try {
      // Solo envía los campos editables
      const { name, client_number, meter_type, coverage } = form;
      await axios.put(
        `http://localhost:8000/api/reader/meters/${meterToEdit.id}/update/`,
        { name, client_number, meter_type, coverage },
        { withCredentials: true }
      );
      setIsEditModalOpen(false);
      await fetchMeters();
      setMeterToEdit(null);
    } catch (err: any) {
      setError("Error al editar el medidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await axios.post(
        "http://localhost:8000/api/reader/meters/create/",
        form,
        { withCredentials: true }
      );
      setIsAddModalOpen(false);
      fetchMeters();
    } catch (err: any) {
      setError("Error al agregar el medidor.");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (meter: Meter) => {
    setMeterToDelete(meter);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!meterToDelete) return;
    setLoading(true);
    setError(null);
    try {
      await axios.delete(
        `http://localhost:8000/api/reader/meters/${meterToDelete.id}/delete/`,
        { withCredentials: true }
      );
      setIsDeleteModalOpen(false);
      setMeterToDelete(null);
      fetchMeters();
    } catch (err: any) {
      setError("Error al eliminar el medidor.");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar medidores por tipo
  const filteredMeters = meterTypeFilter
    ? meters.filter((m) => m.meter_type === meterTypeFilter)
    : meters;

  return (
    <div>
      <NavBar />
      <div className="pt-20 min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center px-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-10 w-full max-w-3xl border border-white/20">
          <h1 className="text-3xl font-bold text-white text-center mb-6">Gestión de Medidores</h1>
          {/* Filtro por tipo de medidor */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setMeterTypeFilter(meterTypeFilter === "WATER" ? "" : "WATER")}
              className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
                meterTypeFilter === "WATER"
                  ? "bg-blue-600 text-white shadow-lg hover:bg-blue-700"
                  : "bg-white/10 text-blue-200 hover:bg-white/20"
              }`}
            >
              <Droplets className="w-5 h-5" />
              Agua
            </button>
            <button
              type="button"
              onClick={() => setMeterTypeFilter(meterTypeFilter === "ELECTRICITY" ? "" : "ELECTRICITY")}
              className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
                meterTypeFilter === "ELECTRICITY"
                  ? "bg-yellow-500 text-white shadow-lg hover:bg-yellow-600"
                  : "bg-white/10 text-blue-200 hover:bg-white/20"
              }`}
            >
              <Zap className="w-5 h-5" />
              Electricidad
            </button>
          </div>
          <div className="flex justify-end mb-6">
            <button
              onClick={openAddModal}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Agregar Medidor
            </button>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-center text-sm">
              {error}
            </div>
          )}
          {loading && <p className="text-white">Cargando...</p>}
          {!loading && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-white">
                <thead>
                  <tr>
                    <th className="border-b border-gray-600 px-4 py-2 text-left">Nombre</th>
                    <th className="border-b border-gray-600 px-4 py-2 text-left">Cliente</th>
                    <th className="border-b border-gray-600 px-4 py-2 text-left">Tipo</th>
                    <th className="border-b border-gray-600 px-4 py-2 text-left">Cobertura</th>
                    <th className="border-b border-gray-600 px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeters.map((m) => (
                    <tr key={m.id} className="hover:bg-blue-700/50 transition-colors">
                      <td className="border-b border-gray-700 px-4 py-2">{m.name}</td>
                      <td className="border-b border-gray-700 px-4 py-2">{m.client_number}</td>
                      <td className="border-b border-gray-700 px-4 py-2">{meterTypeLabels[m.meter_type]}</td>
                      <td className="border-b border-gray-700 px-4 py-2">{m.coverage}</td>
                      <td className="border-b border-gray-700 px-4 py-2 flex gap-2">
                        <button
                          onClick={() => openEditModal(m)}
                          className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(m)}
                          className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMeters.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-300">
                        No hay medidores
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Editar Medidor</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Nombre</label>
                  <input
                    name="name"
                    type="text"
                    value={form.name || ""}
                    onChange={handleFormChange}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Número de Cliente</label>
                  <input
                    name="client_number"
                    type="text"
                    value={form.client_number || ""}
                    onChange={handleFormChange}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Tipo de Medidor</label>
                  <select
                    name="meter_type"
                    value={form.meter_type || "WATER"}
                    onChange={handleFormChange}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
                  >
                    <option value="WATER">Agua</option>
                    <option value="ELECTRICITY">Electricidad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Cobertura</label>
                  <input
                    name="coverage"
                    type="text"
                    value={form.coverage || ""}
                    onChange={handleFormChange}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
                  />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="bg-gray-500/80 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Add Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Agregar Medidor</h2>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Nombre</label>
                  <input
                    name="name"
                    type="text"
                    value={form.name || ""}
                    onChange={handleFormChange}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Número de Cliente</label>
                  <input
                    name="client_number"
                    type="text"
                    value={form.client_number || ""}
                    onChange={handleFormChange}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Tipo de Medidor</label>
                  <select
                    name="meter_type"
                    value={form.meter_type || "WATER"}
                    onChange={handleFormChange}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
                  >
                    <option value="WATER">Agua</option>
                    <option value="ELECTRICITY">Electricidad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Cobertura</label>
                  <input
                    name="coverage"
                    type="text"
                    value={form.coverage || ""}
                    onChange={handleFormChange}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/30"
                  />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="bg-gray-500/80 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Eliminar Medidor</h2>
              <p className="text-blue-200 mb-4">
                ¿Estás seguro de que deseas eliminar el medidor <span className="font-bold">{meterToDelete?.name}</span>?
              </p>
              <p className="text-red-400 mb-6 text-sm font-semibold">
                <span className="font-bold">Advertencia:</span> Al eliminar este medidor, <u>todas las facturas asociadas</u> también serán eliminadas.
              </p>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="bg-gray-500/80 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors"
                  disabled={loading}
                >
                  {loading ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="text-center mt-12">
          <p className="text-blue-200/60 text-sm">© 2025 SICEA. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default MetersPage;