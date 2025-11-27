import React from 'react';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="bg-gray-500/80 text-white px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
