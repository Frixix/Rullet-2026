import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { FiBarChart2 } from 'react-icons/fi';

const COLORS = ['#ef4444', '#000000', '#10b981'];

function Estadisticas({ estadisticas }) {
  if (!estadisticas) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const datosColores = [
    { name: 'Rojo', value: estadisticas.colores.rojo },
    { name: 'Negro', value: estadisticas.colores.negro },
    { name: 'Verde', value: estadisticas.colores.verde },
  ];

  const porcentaje = (item) =>
    estadisticas.total ? Math.round((item.veces / estadisticas.total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <FiBarChart2 /> Estadísticas
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de colores */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Distribución de Colores</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={datosColores}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {datosColores.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top números */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Top 5 Números</h3>
          <div className="space-y-2">
            {estadisticas.topNumeros.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-bold text-lg">#{item.numero}</span>
                <div className="flex-1 mx-4">
                  <div className="bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 rounded-full h-2"
                      style={{ width: `${porcentaje(item)}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm text-gray-600">{item.veces} veces</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{estadisticas.total}</div>
          <div className="text-xs text-gray-600">Total Tiradas</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {estadisticas.saldoMartingala ?? 0}
          </div>
          <div className="text-xs text-gray-600">Saldo Martingala</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            ${estadisticas.config?.valorApuestaBase ?? 0}
          </div>
          <div className="text-xs text-gray-600">Apuesta base</div>
        </div>
      </div>
    </div>
  );
}

export default Estadisticas;
