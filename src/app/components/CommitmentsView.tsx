import { useState } from 'react';
import { Calendar as CalendarIcon, Check, X, AlertCircle, Plus, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { mockTransactions } from '../data/mockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';

export function CommitmentsView() {
  const today = new Date('2026-01-08');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 0, 8)); // Janeiro 2026

  // Estados do modal de cadastro
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [commitmentForm, setCommitmentForm] = useState({
    type: 'expense_fixed' as 'expense_fixed' | 'installment',
    description: '',
    category: '',
    amount: '',
    date: '',
    recurring: false,
    totalInstallments: '',
    installmentNumber: ''
  });

  // Filtrar compromissos do mês selecionado (fixos e parcelas)
  const commitments = mockTransactions
    .filter(t =>
      (t.type === 'expense_fixed' || t.type === 'installment') &&
      new Date(t.date).getMonth() === selectedDate.getMonth() &&
      new Date(t.date).getFullYear() === selectedDate.getFullYear()
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const paid = commitments.filter(c => c.paid);
  const pending = commitments.filter(c => !c.paid);
  const overdue = pending.filter(c => new Date(c.date) < today);

  const totalCommitted = commitments.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = paid.reduce((sum, c) => sum + c.amount, 0);
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

  // Função para salvar compromisso
  const handleSaveCommitment = () => {
    // TODO: Implementar salvamento real
    console.log('Salvando compromisso:', commitmentForm);
    setIsAddModalOpen(false);
    setCommitmentForm({
      type: 'expense_fixed',
      description: '',
      category: '',
      amount: '',
      date: '',
      recurring: false,
      totalInstallments: '',
      installmentNumber: ''
    });
  };

  // Função para abrir modal de cadastro
  const handleOpenModal = () => {
    setIsAddModalOpen(true);
    // Definir data padrão como hoje
    const todayStr = today.toISOString().split('T')[0];
    setCommitmentForm({ ...commitmentForm, date: todayStr });
  };

  // Função para abrir modal de edição
  const handleEditCommitment = (commitment: any) => {
    setEditingId(commitment.id);
    setCommitmentForm({
      type: commitment.type,
      description: commitment.description,
      category: commitment.category,
      amount: commitment.amount.toString(),
      date: commitment.date,
      recurring: commitment.recurring || false,
      totalInstallments: commitment.totalInstallments?.toString() || '',
      installmentNumber: commitment.installmentNumber?.toString() || ''
    });
    setIsEditModalOpen(true);
  };

  // Função para salvar edição
  const handleSaveEdit = () => {
    // TODO: Implementar salvamento real da edição
    console.log('Editando compromisso:', editingId, commitmentForm);
    setIsEditModalOpen(false);
    setEditingId('');
    setCommitmentForm({
      type: 'expense_fixed',
      description: '',
      category: '',
      amount: '',
      date: '',
      recurring: false,
      totalInstallments: '',
      installmentNumber: ''
    });
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Compromissos</h2>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#CEF05D] hover:bg-[#B4B0EE] text-[#161618] rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar Compromisso
          </button>
        </div>

        {/* Month/Year Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={navigateToPreviousMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5 text-[#B4B0EE]" />
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">
                <span className="text-[#B4B0EE] text-lg font-medium">
                  {formatMonthYear(selectedDate)}
                </span>
                <CalendarIcon className="w-4 h-4 text-[#B4B0EE]" />
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
            <ChevronRight className="w-5 h-5 text-[#B4B0EE]" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <p className="text-sm text-[#9CA3AF] mb-2">Total Comprometido</p>
          <p className="text-3xl font-bold text-white">R$ {totalCommitted.toFixed(2)}</p>
          <p className="text-xs text-[#9CA3AF] mt-1">{commitments.length} compromissos</p>
        </div>

        <div className="bg-[#CEF05D]/10 rounded-xl border border-[#CEF05D]/30 p-6">
          <p className="text-sm text-[#CEF05D] mb-2">Pagos</p>
          <p className="text-3xl font-bold text-[#CEF05D]">R$ {totalPaid.toFixed(2)}</p>
          <p className="text-xs text-[#CEF05D] mt-1">{paid.length} itens</p>
        </div>

        <div className="bg-[#9D4EDD]/10 rounded-xl border border-[#9D4EDD]/30 p-6">
          <p className="text-sm text-[#9D4EDD] mb-2">Pendentes</p>
          <p className="text-3xl font-bold text-[#9D4EDD]">R$ {totalPending.toFixed(2)}</p>
          <p className="text-xs text-[#9D4EDD] mt-1">{pending.length} itens</p>
        </div>

        <div className="bg-red-500/100/10 rounded-xl border border-red-500/50 p-6">
          <p className="text-sm text-red-500 mb-2">Atrasados</p>
          <p className="text-3xl font-bold text-red-500">
            {overdue.length > 0 ? overdue.length : '0'}
          </p>
          <p className="text-xs text-red-500 mt-1">
            {overdue.length > 0 ? 'Necessita atenção' : 'Tudo em dia'}
          </p>
        </div>
      </div>

      {/* Compromissos Atrasados */}
      {overdue.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-500">Compromissos Atrasados</h3>
              <p className="text-sm text-red-400 mt-1">
                Você tem {overdue.length} compromisso(s) pendente(s) com vencimento anterior a hoje.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {overdue.map(commitment => (
              <div key={commitment.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{commitment.description}</p>
                  <p className="text-sm text-red-600 mt-1">
                    Venceu em {new Date(commitment.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">R$ {commitment.amount.toFixed(2)}</p>
                  <button className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors">
                    Pagar Agora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pendentes */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-white/10 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Pendentes</h3>
          <p className="text-sm text-[#9CA3AF] mt-1">{pending.length - overdue.length} compromissos a vencer</p>
        </div>

        <div className="divide-y divide-white/10">
          {pending.filter(c => new Date(c.date) >= today).map(commitment => (
            <div key={commitment.id} className="px-6 py-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-[#9D4EDD]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-medium text-white">
                        {commitment.description}
                      </h4>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${commitment.type === 'expense_fixed'
                          ? 'bg-[#9D4EDD]/20 text-[#9D4EDD]'
                          : 'bg-[#9D4EDD]/20 text-[#9D4EDD]'
                        }`}>
                        {commitment.type === 'expense_fixed' ? 'Fixo' : 'Parcela'}
                      </span>
                      {commitment.installmentNumber && (
                        <span className="text-sm text-[#9CA3AF]">
                          {commitment.installmentNumber}/{commitment.totalInstallments}
                        </span>
                      )}
                      {commitment.recurring && (
                        <span className="inline-block px-2 py-1 bg-[#B4B0EE]/20 text-[#B4B0EE] rounded text-xs font-medium">
                          Recorrente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-[#9CA3AF]">
                      <span>Vence em {new Date(commitment.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{commitment.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      R$ {commitment.amount.toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => handleEditCommitment(commitment)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-5 h-5 text-[#9CA3AF]" />
                  </button>

                  <button className="px-4 py-2 bg-[#CEF05D] hover:bg-[#B4B0EE] text-[#161618] rounded-lg text-sm font-medium transition-colors">
                    Marcar como Pago
                  </button>
                </div>
              </div>
            </div>
          ))}

          {pending.filter(c => new Date(c.date) >= today).length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="text-[#9CA3AF]">Nenhum compromisso pendente</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagos */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-white/10 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Pagos</h3>
          <p className="text-sm text-[#9CA3AF] mt-1">{paid.length} compromissos quitados</p>
        </div>

        <div className="divide-y divide-white/10">
          {paid.map(commitment => (
            <div key={commitment.id} className="px-6 py-4 bg-[#CEF05D]/10/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-[#CEF05D]/10 border border-[#CEF05D]/30 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-[#CEF05D]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-medium text-white">
                        {commitment.description}
                      </h4>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${commitment.type === 'expense_fixed'
                          ? 'bg-[#9D4EDD]/20 text-[#9D4EDD]'
                          : 'bg-[#9D4EDD]/20 text-[#9D4EDD]'
                        }`}>
                        {commitment.type === 'expense_fixed' ? 'Fixo' : 'Parcela'}
                      </span>
                      {commitment.installmentNumber && (
                        <span className="text-sm text-[#9CA3AF]">
                          {commitment.installmentNumber}/{commitment.totalInstallments}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-[#9CA3AF]">
                      <span>Pago em {new Date(commitment.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{commitment.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      R$ {commitment.amount.toFixed(2)}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 bg-[#CEF05D]/20 text-[#CEF05D] rounded text-xs font-medium">
                      Pago
                    </span>
                  </div>

                  <button
                    onClick={() => handleEditCommitment(commitment)}
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
        <h3 className="text-lg font-semibold text-white mb-4">Timeline de Vencimentos</h3>

        <div className="space-y-4">
          {commitments.map((commitment, index) => {
            const commitmentDate = new Date(commitment.date);
            const isPast = commitmentDate < today;
            const isToday = commitmentDate.toDateString() === today.toDateString();

            return (
              <div key={commitment.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${commitment.paid
                      ? 'bg-[#CEF05D]/100'
                      : isPast
                        ? 'bg-red-500/100'
                        : isToday
                          ? 'bg-[#B4B0EE]'
                          : 'bg-gray-300'
                    }`}></div>
                  {index < commitments.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-200"></div>
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-white">
                    {commitmentDate.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long'
                    })}
                  </p>
                  <p className="text-sm text-[#9CA3AF] mt-1">
                    {commitment.description} - R$ {commitment.amount.toFixed(2)}
                  </p>
                  {commitment.paid && (
                    <span className="inline-block mt-1 text-xs text-[#CEF05D]">✓ Pago</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Cadastro de Compromisso */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Adicionar Compromisso
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Cadastre gastos fixos recorrentes ou parcelamentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Tipo de Compromisso */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Tipo *
              </label>
              <select
                value={commitmentForm.type}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, type: e.target.value as 'expense_fixed' | 'installment' })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
              >
                <option value="expense_fixed" className="bg-[#161618]">Gasto Fixo</option>
                <option value="installment" className="bg-[#161618]">Parcelamento</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Internet, Notebook"
                value={commitmentForm.description}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Moradia, Contas, Eletrônicos"
                value={commitmentForm.category}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, category: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
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
                value={commitmentForm.amount}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, amount: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
              />
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={commitmentForm.date}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
              />
            </div>

            {/* Recorrente (apenas para gasto fixo) */}
            {commitmentForm.type === 'expense_fixed' && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={commitmentForm.recurring}
                  onChange={(e) => setCommitmentForm({ ...commitmentForm, recurring: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 text-[#CEF05D] focus:ring-[#CEF05D]"
                />
                <label htmlFor="recurring" className="text-sm font-medium text-[#9CA3AF]">
                  Compromisso recorrente (repete todo mês)
                </label>
              </div>
            )}

            {/* Campos de Parcelamento */}
            {commitmentForm.type === 'installment' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    Parcela Atual *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={commitmentForm.installmentNumber}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, installmentNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    Total de Parcelas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="12"
                    value={commitmentForm.totalInstallments}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, totalInstallments: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
                  />
                </div>
              </div>
            )}
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
              onClick={handleSaveCommitment}
              disabled={!commitmentForm.description || !commitmentForm.category || !commitmentForm.amount || !commitmentForm.date}
              className="flex-1 px-4 py-3 bg-[#CEF05D] hover:bg-[#B4B0EE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Compromisso
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Compromisso */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#161618] border-white/20 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              Editar Compromisso
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              Atualize as informações do compromisso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Tipo de Compromisso */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Tipo *
              </label>
              <select
                value={commitmentForm.type}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, type: e.target.value as 'expense_fixed' | 'installment' })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
              >
                <option value="expense_fixed" className="bg-[#161618]">Gasto Fixo</option>
                <option value="installment" className="bg-[#161618]">Parcelamento</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Descrição *
              </label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Internet, Notebook"
                value={commitmentForm.description}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Moradia, Contas, Eletrônicos"
                value={commitmentForm.category}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, category: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
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
                value={commitmentForm.amount}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, amount: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
              />
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                Data de Vencimento *
              </label>
              <input
                type="date"
                value={commitmentForm.date}
                onChange={(e) => setCommitmentForm({ ...commitmentForm, date: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
              />
            </div>

            {/* Recorrente (apenas para gasto fixo) */}
            {commitmentForm.type === 'expense_fixed' && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="recurring-edit"
                  checked={commitmentForm.recurring}
                  onChange={(e) => setCommitmentForm({ ...commitmentForm, recurring: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 text-[#CEF05D] focus:ring-[#CEF05D]"
                />
                <label htmlFor="recurring-edit" className="text-sm font-medium text-[#9CA3AF]">
                  Compromisso recorrente (repete todo mês)
                </label>
              </div>
            )}

            {/* Campos de Parcelamento */}
            {commitmentForm.type === 'installment' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    Parcela Atual *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={commitmentForm.installmentNumber}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, installmentNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    Total de Parcelas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="12"
                    value={commitmentForm.totalInstallments}
                    onChange={(e) => setCommitmentForm({ ...commitmentForm, totalInstallments: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#CEF05D] focus:border-transparent"
                  />
                </div>
              </div>
            )}
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
              disabled={!commitmentForm.description || !commitmentForm.category || !commitmentForm.amount || !commitmentForm.date}
              className="flex-1 px-4 py-3 bg-[#CEF05D] hover:bg-[#B4B0EE] text-[#161618] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Alterações
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
