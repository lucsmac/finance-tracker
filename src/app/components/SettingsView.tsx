import { Settings } from 'lucide-react';

export function SettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Configurações</h2>
        <p className="text-sm text-gray-500 mt-1">Personalize seu AutoMoney</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Configurações em desenvolvimento
        </h3>
        <p className="text-sm text-gray-600">
          Opções de personalização estarão disponíveis em breve
        </p>
      </div>
    </div>
  );
}
