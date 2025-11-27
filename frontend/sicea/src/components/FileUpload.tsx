import { useState } from 'react';
import axios from 'axios';
import { Trash2 } from 'lucide-react';

const FileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<any[] | null>(null);
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    // Agrega los nuevos archivos a los existentes, evitando duplicados por nombre
    setFiles(prev =>
      [...prev, ...newFiles].filter(
        (file, idx, arr) => arr.findIndex(f => f.name === file.name && f.size === file.size) === idx
      )
    );
    setSuccess(null);
    setError(null);
    setValidationResults(null);
    setValidated(false);
  };

  const handleValidate = async () => {
    setError(null);
    setValidationResults(null);
    setValidated(false);
    setValidating(true);

    if (files.length === 0) {
      setError('Selecciona archivos para validar.');
      setValidating(false);
      return;
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await axios.post(
        'http://localhost:8000/api/reader/validate-batch-bills/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      const results = res.data.results;
      setValidationResults(results);
      // Solo se considera validado si todos los archivos tienen status 'correct'
      const allCorrect = results.length > 0 && results.every((r: any) => r.status === 'correct');
      setValidated(allCorrect);
      if (!allCorrect) setError('Existen archivos no válidos o duplicados. Corrige antes de guardar.');
    } catch (err: any) {
      setError('Error al validar archivos');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploading(true);
    setSuccess(null);
    setError(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(
        'http://localhost:8000/api/reader/process-multiple-bills/',
        formData,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setSuccess('Archivos subidos correctamente.');
      setFiles([]);
      setValidationResults(null);
      setValidated(false);
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err: any) {
      setError('Error al subir archivos');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);

    // Actualiza los resultados de validación solo para los archivos restantes
    if (validationResults && validationResults.length > 0) {
      const newValidationResults = validationResults.filter((_, i) => i !== index);
      setValidationResults(newValidationResults);
      // Recalcula si todos los archivos restantes están correctos
      const allCorrect = newValidationResults.length > 0 && newValidationResults.every((r: any) => r.status === 'correct');
      setValidated(allCorrect);
    }

    setSuccess(null);
    setError(null);
    // Limpia el input si no quedan archivos
    if (newFiles.length === 0) {
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
      setValidationResults(null);
      setValidated(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">Subir Facturas</h1>
          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-200 text-center text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-center text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileSelect}
              className="block w-full text-white bg-white/10 border border-white/30 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 hover:bg-white/15"
            />
            <div className="flex gap-4">
              <button
                type="button"
                disabled={files.length === 0 || uploading || validating}
                onClick={handleValidate}
                className={`w-1/2 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-[1.02] flex items-center justify-center`}
              >
                {validating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Validando...
                  </span>
                ) : (
                  "Validar Facturas"
                )}
              </button>
              <button
                type="submit"
                disabled={
                  uploading ||
                  files.length === 0 ||
                  !validated ||
                  Boolean(validationResults && validationResults.some((r: any) => r.status !== 'correct'))
                }
                className={`w-1/2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-[1.02] flex items-center justify-center ${
                  !validated ||
                  files.length === 0 ||
                  (validationResults && validationResults.some((r: any) => r.status !== 'correct'))
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Subiendo...
                  </span>
                ) : (
                  `Guardar archivos`
                )}
              </button>
            </div>
          </form>
          {files.length > 0 && (
            <div className="mt-6">
              <p className="text-blue-200 mb-2">Archivos seleccionados:</p>
              <ul className="list-disc list-inside text-white text-sm">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between py-1">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="ml-2 p-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
                      title="Eliminar"
                      style={{ minWidth: '32px' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validationResults && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-200">Resultado de validación:</p>
                {validationResults.filter((r) => r.status === 'correct').length > 0 && (
                  <div className="bg-green-600/50 backdrop-blur-sm rounded-lg px-3 py-1 border border-green-400/30">
                    <span className="text-green-100 text-xs font-medium">
                      {validationResults.filter((r) => r.status === 'correct').length}{' '}
                      {validationResults.filter((r) => r.status === 'correct').length === 1 ? 'factura' : 'facturas'} lista
                      {validationResults.filter((r) => r.status === 'correct').length === 1 ? '' : 's'} para subir
                    </span>
                  </div>
                )}
              </div>
              <ul className="list-disc list-inside text-white text-sm">
                {validationResults.map((r, idx) => (
                  <li key={idx}>
                    <span className="font-bold">{r.file}:</span>{" "}
                    {r.status === "correct" && <span className="text-green-400">Correcta</span>}
                    {r.status === "duplicated" && <span className="text-yellow-400">Duplicada en lote</span>}
                    {r.status === "in_db" && <span className="text-red-400">Ya existe en la base de datos</span>}
                    {r.status === "invalid" && <span className="text-red-400">Inválida: {r.detail}</span>}
                    {r.status === "not_found" && <span className="text-red-400">El medidor {r.meter} no fue encontrado, si corresponde, cree un nuevo medidor antes de subir esta factura.</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="text-center mt-8">
          <p className="text-blue-200/60 text-sm">
            © 2025 SICEA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;