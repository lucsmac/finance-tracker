import { BarChart3 } from 'lucide-react';

export function ReportsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Relatórios</h2>
        <p className="text-sm text-gray-500 mt-1">Análises e insights financeiros</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Relatórios em desenvolvimento
        </h3>
        <p className="text-sm text-gray-600">
          Gráficos e análises detalhadas estarão disponíveis em breve
        </p>
      </div>
    </div>
  );
}
