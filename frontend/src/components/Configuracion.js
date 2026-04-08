import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiSettings } from 'react-icons/fi';

function Configuracion({ config, onConfigChange, apiUrl }) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [configLocal, setConfigLocal] = useState(config || {
    tipoRuleta: "Física",
    tipoJuego: "Contra humanos",
    usarMartingala: false,
    modoMartingala: 1,
    valorApuestaBase: 1000
  });

  const guardarConfiguracion = async () => {
    try {
      await axios.post(`${apiUrl}/config`, configLocal);
      toast.success('Configuración guardada');
      onConfigChange();
      setMostrarModal(false);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast.error('Error al guardar configuración');
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiSettings /> Configuración
          </h2>
          <button
            onClick={() => setMostrarModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
          >
            Editar
          </button>
        </div>
        
        {config && (
          <div className="space-y-2 text-gray-600">
            <p><strong>🎲 Ruleta:</strong> {config.tipoRuleta}</p>
            <p><strong>👥 Juego:</strong> {config.tipoJuego}</p>
            <p><strong>💰 Martingala:</strong> {config.usarMartingala ? 'Activada' : 'Desactivada'}</p>
            {config.usarMartingala && (
              <>
                <p><strong>📊 Modo:</strong> {config.modoMartingala === 1 ? 'Conteo' : 'Escalonada'}</p>
                <p><strong>💵 Apuesta base:</strong> ${config.valorApuestaBase}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de configuración */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-4">Configuración Avanzada</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Ruleta
                </label>
                <select
                  value={configLocal.tipoRuleta}
                  onChange={(e) => setConfigLocal({...configLocal, tipoRuleta: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option>Física</option>
                  <option>Virtual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Juego
                </label>
                <select
                  value={configLocal.tipoJuego}
                  onChange={(e) => setConfigLocal({...configLocal, tipoJuego: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option>Contra humanos</option>
                  <option>Contra la máquina</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={configLocal.usarMartingala}
                    onChange={(e) => setConfigLocal({...configLocal, usarMartingala: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Usar Martingala</span>
                </label>
              </div>

              {configLocal.usarMartingala && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modo Martingala
                    </label>
                    <select
                      value={configLocal.modoMartingala}
                      onChange={(e) => setConfigLocal({...configLocal, modoMartingala: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value={1}>Conteo básico (+1/-1)</option>
                      <option value={2}>Escalonada (niveles)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor base de apuesta
                    </label>
                    <input
                      type="number"
                      value={configLocal.valorApuestaBase}
                      onChange={(e) => setConfigLocal({...configLocal, valorApuestaBase: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={guardarConfiguracion}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg"
              >
                Guardar
              </button>
              <button
                onClick={() => setMostrarModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Configuracion;
