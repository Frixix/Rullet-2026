import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';

function IngresarNumero({ onSubmit, cargando, ultimoNumero }) {
  const [numero, setNumero] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(numero);
    if (isNaN(num) || num < 0 || num > 36) {
      alert('Por favor ingresa un número válido entre 0 y 36');
      return;
    }
    onSubmit(num);
    setNumero('');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FiPlus /> Ingresar Número
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="number"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Número (0-36)"
            className="w-full text-2xl text-center border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
            disabled={cargando}
            autoFocus
          />
        </div>
        
        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50"
        >
          {cargando ? 'Procesando...' : 'Agregar Número'}
        </button>
      </form>

      {ultimoNumero && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Último:</strong> {ultimoNumero.numero} ({ultimoNumero.color})
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {ultimoNumero.resultado.mensaje}
          </p>
          {ultimoNumero.martingala && (
            <p className="text-xs font-bold mt-1">
              💰 Saldo Martingala: {ultimoNumero.martingala.saldo}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default IngresarNumero;
