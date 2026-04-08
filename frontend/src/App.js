import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { FiRefreshCw, FiDownload } from 'react-icons/fi';
import Configuracion from './components/Configuracion';
import IngresarNumero from './components/IngresarNumero';
import Estadisticas from './components/Estadisticas';
import Historial from './components/Historial';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [estadisticas, setEstadisticas] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [ultimoNumero, setUltimoNumero] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargarEstadisticas = async () => {
    try {
      const response = await axios.get(`${API_URL}/estadisticas`);
      setEstadisticas(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      toast.error('Error al cargar estadísticas');
    }
  };

  const cargarHistorial = async () => {
    try {
      const response = await axios.get(`${API_URL}/historial`);
      setHistorial(response.data);
    } catch (error) {
      console.error('Error cargando historial:', error);
      toast.error('Error al cargar historial');
    }
  };

  const agregarNumero = async (numero) => {
    setCargando(true);
    try {
      const response = await axios.post(`${API_URL}/numero`, { numero });
      setUltimoNumero(response.data);
      
      // Mostrar notificaciones según resultado
      if (response.data.resultado.acierto === true) {
        toast.success(`🎯 ¡Acierto! ${response.data.resultado.mensaje}`);
      } else if (response.data.resultado.acierto === false) {
        toast.error(`❌ Fallo: ${response.data.resultado.mensaje}`);
      } else {
        toast.info(response.data.resultado.mensaje);
      }
      
      // Actualizar datos
      await cargarEstadisticas();
      await cargarHistorial();
    } catch (error) {
      console.error('Error agregando número:', error);
      toast.error('Error al procesar el número');
    } finally {
      setCargando(false);
    }
  };

  const resetSesion = async () => {
    try {
      await axios.post(`${API_URL}/reset`);
      await cargarEstadisticas();
      await cargarHistorial();
      setUltimoNumero(null);
      toast.success('Sesión reiniciada correctamente');
    } catch (error) {
      console.error('Error reiniciando sesión:', error);
      toast.error('Error al reiniciar sesión');
    }
  };

  useEffect(() => {
    cargarEstadisticas();
    cargarHistorial();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      <Toaster position="top-right" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            🎰 Predictor de Ruleta
          </h1>
          <p className="text-white text-opacity-90 text-lg">
            Sistema de análisis de patrones C-D-E con Martingala
          </p>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Configuración y entrada */}
          <div className="space-y-6">
            <Configuracion 
              config={estadisticas?.config} 
              onConfigChange={cargarEstadisticas}
              apiUrl={API_URL}
            />
            <IngresarNumero 
              onSubmit={agregarNumero}
              cargando={cargando}
              ultimoNumero={ultimoNumero}
            />
            
            {/* Botones de acción */}
            <div className="flex gap-3">
              <button
                onClick={resetSesion}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                <FiRefreshCw /> Reiniciar Sesión
              </button>
              <button
                onClick={() => {
                  // TODO: Exportar a CSV
                  toast.info('Funcionalidad en desarrollo');
                }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                <FiDownload /> Exportar CSV
              </button>
            </div>
          </div>

          {/* Columna derecha - Estadísticas */}
          <div className="lg:col-span-2">
            <Estadisticas estadisticas={estadisticas} />
          </div>
        </div>

        {/* Historial */}
        <div className="mt-8">
          <Historial historial={historial} />
        </div>
      </div>
    </div>
  );
}

export default App;
