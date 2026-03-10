import { useState, useEffect } from 'react';
import { Settings, Save, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useConfig } from '@/lib/hooks/useConfig';
import { getTodayLocal } from '@/lib/utils/dateHelpers';

export function SettingsView() {
  const { user } = useAuth();
  const { config, loading, updateConfig } = useConfig(user?.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    initialBalance: '',
    mainIncomeDay: '',
    mainIncomeAmount: '',
    balanceStartDate: ''
  });

  // Load config data into form when available
  useEffect(() => {
    if (config) {
      setForm({
        initialBalance: config.initialBalance?.toString() || '',
        mainIncomeDay: config.mainIncomeDay?.toString() || '',
        mainIncomeAmount: config.mainIncomeAmount?.toString() || '',
        balanceStartDate: config.balanceStartDate || getTodayLocal()
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateConfig({
        initialBalance: parseFloat(form.initialBalance) || 0,
        mainIncomeDay: parseInt(form.mainIncomeDay) || 1,
        mainIncomeAmount: parseFloat(form.mainIncomeAmount) || 0,
        balanceStartDate: form.balanceStartDate
      });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#76C893] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Configurações</h1>
        <p className="text-sm text-[#9CA3AF]">Personalize seu AutoMoney</p>
      </div>

      {/* Settings Form */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Saldo Inicial */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
            <DollarSign className="w-4 h-4" />
            Saldo Inicial
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">R$</span>
            <input
              type="number"
              step="0.01"
              value={form.initialBalance}
              onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              placeholder="0,00"
            />
          </div>
          <p className="text-xs text-white/50 mt-1">
            O saldo que você tem disponível no início do período de controle
          </p>
        </div>

        {/* Data de Início do Saldo */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
            <Calendar className="w-4 h-4" />
            Data de Início do Saldo
          </label>
          <input
            type="date"
            value={form.balanceStartDate}
            onChange={(e) => setForm({ ...form, balanceStartDate: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
          />
          <p className="text-xs text-white/50 mt-1">
            A partir desta data, o sistema começará a descontar os gastos diários do seu saldo
          </p>
        </div>

        {/* Dia do Salário */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
            <Calendar className="w-4 h-4" />
            Dia do Salário
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={form.mainIncomeDay}
            onChange={(e) => setForm({ ...form, mainIncomeDay: e.target.value })}
            onWheel={(e) => e.currentTarget.blur()}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
            placeholder="5"
          />
          <p className="text-xs text-white/50 mt-1">
            Dia do mês em que você recebe seu salário (usado para calcular a projeção)
          </p>
        </div>

        {/* Valor do Salário */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
            <DollarSign className="w-4 h-4" />
            Valor do Salário
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">R$</span>
            <input
              type="number"
              step="0.01"
              value={form.mainIncomeAmount}
              onChange={(e) => setForm({ ...form, mainIncomeAmount: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              placeholder="0,00"
            />
          </div>
          <p className="text-xs text-white/50 mt-1">
            Valor mensal do seu salário ou principal fonte de renda
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-[#9B97CE]/10 border border-[#9B97CE]/30 rounded-xl">
          <p className="text-sm text-white/70">
            <strong className="text-[#9B97CE]">💡 Importante:</strong> Alterar a data de início do saldo
            recalculará todos os valores do calendário a partir dessa nova data. Certifique-se de que
            a data escolhida corresponde ao momento em que você começou a usar o AutoMoney.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-4 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
