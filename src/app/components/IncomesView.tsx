import { useState } from 'react';
import { Calendar as CalendarIcon, Check, X, AlertCircle, Plus, ChevronLeft, ChevronRight, Edit, DollarSign } from 'lucide-react';
import { mockTransactions } from '../data/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';

export function IncomesView() {
  const today = new Date('2026-01-08');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 0, 8)); // Janeiro 2026

  // Estados do modal de cadastro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [incomeForm, setIncomeForm] = useState({
    description: '',
    category: '',
    amount: '',
    date: '',
    recurring: false,
  });

  // Filtrar entradas do mês selecionado
  const incomes = mockTransactions
    .filter(t =>
      t.type === 'income' &&
      new Date(t.date).getMonth() === selectedDate.getMonth() &&
      new Date(t.date).getFullYear() === selectedDate.getFullYear()
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const received = incomes.filter(c => c.paid);
  const pending = incomes.filter(c => !c.paid);
  const overdue = pending.filter(c => new Date(c.date) < today);

  const totalExpected = incomes.reduce((sum, c) => sum + c.amount, 0);
  const totalReceived = received.reduce((sum, c) => sum + c.amount, 0);
  const totalPending = pending.reduce((sum, c) => sum + c.amount, 0);

  // Funções de navegação de mês
  const navigateToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const navigateToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const formatMonthYear = (date: Date) => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Função para salvar entrada
  const handleSaveIncome = () => {
    // TODO: Implementar salvamento real
    console.log('Salvando entrada:', incomeForm);
    setIsAddModalOpen(false);
    setIncomeForm({
      description: '',
      category: '',
      amount: '',
      date: '',
      recurring: false,
    });
  };

  // Função para abrir modal de cadastro
  const handleOpenModal = () => {
    setIsAddModalOpen(true);
    // Definir data padrão como hoje
    const todayStr = today.toISOString().split('T')[0];
    setIncomeForm({ ...incomeForm, date: todayStr });
  };

  // Função para abrir modal de edição
  const handleEditIncome = (income: any) => {
    setEditingId(income.id);
    setIncomeForm({
      description: income.description,
      category: income.category,
      amount: income.amount.toString(),
      date: income.date,
      recurring: income.recurring || false,
    });
    setIsEditModalOpen(true);
  };

  // Função para salvar edição
  const handleSaveEdit = () => {
    // TODO: Implementar salvamento real da edição
    console.log('Editando entrada:', editingId, incomeForm);
    setIsEditModalOpen(false);
    setEditingId('');
    setIncomeForm({
      description: '',
      category: '',
      amount: '',
      date: '',
      recurring: false,
    });
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Entradas</h2>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar Entrada
          </button>
        </div>

        {/* Month/Year Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={navigateToPreviousMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5 text-[#9B97CE]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">
                <span className="text-[#9B97CE] text-lg font-medium">
                  {formatMonthYear(selectedDate)}
                </span>
                <CalendarIcon className="w-4 h-4 text-[#9B97CE]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#161618] border-white/20">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <button
            onClick={navigateToNextMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-5 h-5 text-[#9B97CE]" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <p className="text-sm text-[#9CA3AF] mb-2">Total Esperado</p>
          <p className="text-3xl font-bold text-white">R$ {totalExpected.toFixed(2)}</p>
          <p className="text-xs text-[#9CA3AF] mt-1">{incomes.length} entradas</p>
        </div>

        <div className="bg-[#76C893]/10 rounded-xl border border-[#76C893]/30 p-6">
          <p className="text-sm text-[#76C893] mb-2">Recebidos</p>
          <p className="text-3xl font-bold text-[#76C893]">R$ {totalReceived.toFixed(2)}</p>
          <p className="text-xs text-[#76C893] mt-1">{received.length} itens</p>
        </div>

        <div className="bg-[#9B97CE]/10 rounded-xl border border-[#9B97CE]/30 p-6">
          <p className="text-sm text-[#9B97CE] mb-2">A Receber</p>
          <p className="text-3xl font-bold text-[#9B97CE]">R$ {totalPending.toFixed(2)}</p>
          <p className="text-xs text-[#9B97CE] mt-1">{pending.length} itens</p>
        </div>

        <div className="bg-[#D97B7B]/10 rounded-xl border border-[#D97B7B]/50 p-6">
          <p className="text-sm text-[#D97B7B] mb-2">Atrasados</p>
          <p className="text-3xl font-bold text-[#D97B7B]">
            {overdue.length > 0 ? overdue.length : '0'}
          </p>
          <p className="text-xs text-[#D97B7B] mt-1">
            {overdue.length > 0 ? 'Necessita atenção' : 'Tudo em dia'}
          </p>
        </div>
      </div>

      {/* Entradas Atrasadas */}
      {overdue.length > 0 && (
        <div className="bg-[#D97B7B]/10 border border-[#D97B7B]/50 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-[#D97B7B]">Entradas Atrasadas</h3>
              <p className="text-sm text-[#D97B7B] mt-1">
                Você tem {overdue.length} entrada(s) pendente(s) com data anterior a hoje.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {overdue.map(income => (
              <div key={income.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{income.description}</p>
                  <p className="text-sm text-[#D97B7B] mt-1">
                    Previsto para {new Date(income.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">R$ {income.amount.toFixed(2)}</p>
                  <button className="mt-2 px-3 py-1 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] text-sm rounded font-medium transition-colors">
                    Marcar como Recebido
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A Receber */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-white/10 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">A Receber</h3>
          <p className="text-sm text-[#9CA3AF] mt-1">{pending.length - overdue.length} entradas previstas</p>
        </div>

        <div className="divide-y divide-white/10">
          {pending.filter(c => new Date(c.date) >= today).map(income => (
            <div key={income.id} className="px-6 py-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#9B97CE]/10 border border-[#9B97CE]/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-[#9B97CE]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-medium text-white">
                        {income.description}
                      </h4>
                      {income.recurring && (
                        <span className="inline-block px-2 py-1 bg-[#76C893]/20 text-[#76C893] rounded text-xs font-medium">
                          Recorrente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-[#9CA3AF]">
                      <span>Previsto para {new Date(income.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{income.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      R$ {income.amount.toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleEditIncome(income)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5 text-[#9CA3AF]" />
                  </button>

                  <button className="px-4 py-2 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-lg text-sm font-medium transition-colors">
                    Marcar como Recebido
                  </button>
                </div>
              </div>
            </div>
          ))}

          {pending.filter(c => new Date(c.date) >= today).length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[#9CA3AF]">Nenhuma entrada pendente</p>
            </div>
          )}
        </div>
      </div>

      {/* Recebidos */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-white/10 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Recebidos</h3>
          <p className="text-sm text-[#9CA3AF] mt-1">{received.length} entradas recebidas</p>
        </div>

        <div className="divide-y divide-white/10">
          {received.map(income => (
            <div key={income.id} className="px-6 py-4 bg-[#76C893]/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#76C893]/10 border border-[#76C893]/30 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-[#76C893]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-medium text-white">
                        {income.description}
                      </h4>
                      {income.recurring && (
                        <span className="inline-block px-2 py-1 bg-[#76C893]/20 text-[#76C893] rounded text-xs font-medium">
                          Recorrente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-[#9CA3AF]">
                      <span>Recebido em {new Date(income.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{income.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      R$ {income.amount.toFixed(2)}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 bg-[#76C893]/20 text-[#76C893] rounded text-xs font-medium">
                      Recebido
                    </span>
                  </div>

                  <button
                    onClick={() => handleEditIncome(income)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5 text-[#9CA3AF]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Timeline de Entradas</h3>

        <div className="space-y-4">
          {incomes.map((income, index) => {
            const incomeDate = new Date(income.date);
            const isPast = incomeDate < today;
            const isToday = incomeDate.toDateString() === today.toDateString();

            return (
              <div key={income.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${income.paid
                      ? 'bg-[#76C893]'
                      : isPast
                        ? 'bg-[#D97B7B]'
                        : isToday
                          ? 'bg-[#9B97CE]'
                          : 'bg-gray-300'
                    }`}></div>
                  {index < incomes.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-200"></div>
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-white">
                    {incomeDate.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long'
                    })}
                  </p>
                  <p className="text-sm text-[#9CA3AF] mt-1">
                    {income.description} - R$ {income.amount.toFixed(2)}
                  </p>
                  {income.paid && (
                    <span className="inline-block mt-1 text-xs text-[#76C893]">✓ Recebido</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Cadastro de Entrada */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Adicionar Entrada
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Cadastre entradas recorrentes ou outras receitas planejadas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Salário, Freelance, Bônus"
                value={incomeForm.description}
                onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Salário, Trabalho Autônomo, Investimentos"
                value={incomeForm.category}
                onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Valor *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Data de Recebimento *
              </label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Recorrente */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring"
                checked={incomeForm.recurring}
                onChange={(e) => setIncomeForm({ ...incomeForm, recurring: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 text-[#76C893] focus:ring-[#76C893]"
              />
              <label htmlFor="recurring" className="text-sm font-medium text-[#9CA3AF]">
                Entrada recorrente (repete todo mês)
              </label>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-[#9CA3AF] rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveIncome}
              disabled={!incomeForm.description || !incomeForm.category || !incomeForm.amount || !incomeForm.date}
              className="flex-1 px-4 py-3 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Entrada
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Entrada */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Editar Entrada
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Atualize as informações da entrada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Salário, Freelance, Bônus"
                value={incomeForm.description}
                onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Salário, Trabalho Autônomo, Investimentos"
                value={incomeForm.category}
                onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Valor *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Data de Recebimento *
              </label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#76C893] focus:border-transparent"
              />
            </div>

            {/* Recorrente */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring-edit"
                checked={incomeForm.recurring}
                onChange={(e) => setIncomeForm({ ...incomeForm, recurring: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 text-[#76C893] focus:ring-[#76C893]"
              />
              <label htmlFor="recurring-edit" className="text-sm font-medium text-[#9CA3AF]">
                Entrada recorrente (repete todo mês)
              </label>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 text-[#9CA3AF] rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={!incomeForm.description || !incomeForm.category || !incomeForm.amount || !incomeForm.date}
              className="flex-1 px-4 py-3 bg-[#76C893] hover:bg-[#9B97CE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Alterações
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
