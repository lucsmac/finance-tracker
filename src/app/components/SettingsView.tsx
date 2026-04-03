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
          <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--app-text)]">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="text-center pt-4 pb-2">
        <h1 className="mb-2 text-2xl font-bold text-[var(--app-text)] sm:text-4xl">Configurações</h1>
        <p className="text-sm text-[var(--app-text-muted)]">Personalize seu AutoMoney</p>
      </div>

      {/* Settings Form */}
      <div className="app-panel space-y-6 rounded-2xl p-6 sm:rounded-3xl">
        {/* Saldo Inicial */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
            <DollarSign className="w-4 h-4" />
            Saldo Inicial
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">R$</span>
            <input
              type="number"
              step="0.01"
              value={form.initialBalance}
              onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full rounded-xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)] pl-10 pr-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
              placeholder="0,00"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--app-text-faint)]">
            O saldo que você tem disponível no início do período de controle
          </p>
        </div>

        {/* Data de Início do Saldo */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
            <Calendar className="w-4 h-4" />
            Data de Início do Saldo
          </label>
          <input
            type="date"
            value={form.balanceStartDate}
            onChange={(e) => setForm({ ...form, balanceStartDate: e.target.value })}
            className="w-full rounded-xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
          />
          <p className="mt-1 text-xs text-[var(--app-text-faint)]">
            A partir desta data, o sistema começará a descontar os gastos diários do seu saldo
          </p>
        </div>

        {/* Dia do Salário */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
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
            className="w-full rounded-xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)] px-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
            placeholder="5"
          />
          <p className="mt-1 text-xs text-[var(--app-text-faint)]">
            Dia do mês em que você recebe seu salário (usado para calcular a projeção)
          </p>
        </div>

        {/* Valor do Salário */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
            <DollarSign className="w-4 h-4" />
            Valor do Salário
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">R$</span>
            <input
              type="number"
              step="0.01"
              value={form.mainIncomeAmount}
              onChange={(e) => setForm({ ...form, mainIncomeAmount: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full rounded-xl border border-[var(--app-field-border)] bg-[var(--app-field-bg)] pl-10 pr-4 py-3 text-[var(--app-text)] placeholder:text-[var(--app-field-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
              placeholder="0,00"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--app-text-faint)]">
            Valor mensal do seu salário ou principal fonte de renda
          </p>
        </div>

        {/* Info Box */}
        <div className="rounded-xl border border-[rgba(133,55,253,0.2)] bg-[rgba(133,55,253,0.1)] p-4">
          <p className="text-sm text-[var(--app-text-muted)]">
            <strong className="text-[var(--app-accent)]">💡 Importante:</strong> Alterar a data de início do saldo
            recalculará todos os valores do calendário a partir dessa nova data. Certifique-se de que
            a data escolhida corresponde ao momento em que você começou a usar o AutoMoney.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] px-6 py-4 font-semibold text-[var(--app-accent-foreground)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-90"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
