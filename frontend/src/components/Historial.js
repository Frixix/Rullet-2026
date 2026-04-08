import React from 'react';

function Historial({ historial }) {
  const ordenado = [...historial].reverse().slice(0, 15);

  if (!historial.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Historial</h2>
        <p className="text-gray-600">Registra un número para empezar a ver el historial.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Historial</h2>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {ordenado.map((item, index) => (
          <div
            key={`${item.timestamp}-${index}`}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-gray-100 to-white shadow-sm"
          >
            <div>
              <p className="font-bold text-lg">
                #{item.numero} <span className="text-sm text-gray-500">({item.color})</span>
              </p>
              <p className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleTimeString('es-CO')}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                item.color === 'rojo'
                  ? 'bg-red-100 text-red-700'
                  : item.color === 'negro'
                    ? 'bg-gray-800 text-white'
                    : 'bg-green-100 text-green-800'
              }`}
            >
              {item.color}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Historial;
