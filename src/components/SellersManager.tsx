import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Seller } from '../types';
import { 
  Users, UserPlus, Search, Edit, Trash2, CheckCircle2, 
  XCircle, Phone, Mail, FileText, X, AlertCircle, Shield, Sparkles, Hash
} from 'lucide-react';

interface SellersManagerProps {
  theme?: 'light' | 'dark';
}

export const SellersManager: React.FC<SellersManagerProps> = ({ theme = 'light' }) => {
  const { sellers = [], saveSeller, deleteSeller, toggleSellerStatus } = useApp();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const openNewModal = () => {
    setEditingSeller(null);
    setName('');
    setCode(`VEND-${String(sellers.length + 1).padStart(3, '0')}`);
    setCpf('');
    setPhone('');
    setEmail('');
    setNotes('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (seller: Seller) => {
    setEditingSeller(seller);
    setName(seller.name || '');
    setCode(seller.code || '');
    setCpf(seller.cpf || '');
    setPhone(seller.phone || '');
    setEmail(seller.email || '');
    setNotes(seller.notes || '');
    setActive(seller.active ?? true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSeller(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const sellerData: Seller = {
        id: editingSeller?.id || `seller_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: name.trim(),
        code: code.trim() || undefined,
        cpf: cpf.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        active,
        createdAt: editingSeller?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveSeller(sellerData);
      closeModal();
    } catch (err) {
      console.error('Erro ao salvar vendedor:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, sellerName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o vendedor "${sellerName}"?`)) {
      await deleteSeller(id);
    }
  };

  const filteredSellers = useMemo(() => {
    return sellers.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.cpf && s.cpf.includes(searchQuery)) ||
        (s.phone && s.phone.includes(searchQuery)) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        filterStatus === 'all' ? true :
        filterStatus === 'active' ? s.active : !s.active;

      return matchesSearch && matchesStatus;
    });
  }, [sellers, searchQuery, filterStatus]);

  const activeCount = useMemo(() => sellers.filter(s => s.active).length, [sellers]);
  const inactiveCount = useMemo(() => sellers.filter(s => !s.active).length, [sellers]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#003B73] via-[#00509E] to-[#006EDB] text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-amber-300" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Cadastro de Vendedores</h2>
          </div>
          <p className="text-xs sm:text-sm text-blue-100/90">
            Gerencie o cadastro da sua equipe de vendas. (Os vendedores não têm acesso ao painel de login no momento)
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Vendedor</span>
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-900/10'} shadow-xs flex items-center justify-between`}>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#52708F]">Total Cadastrados</p>
            <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-[#003B73]'}`}>{sellers.length}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-900/10'} shadow-xs flex items-center justify-between`}>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-600">Vendedores Ativos</p>
            <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-[#003B73]'}`}>{activeCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-900/10'} shadow-xs flex items-center justify-between`}>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-rose-500">Inativos / Pausados</p>
            <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-[#003B73]'}`}>{inactiveCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtro */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-900/10'} shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3`}>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#52708F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, código, CPF..."
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border outline-hidden transition-all ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                : 'bg-slate-50 border-blue-900/10 text-[#003B73] focus:border-[#006EDB]'
            }`}
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-[#003B73] text-white shadow-xs'
                : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-[#003B73]'
            }`}
          >
            Todos ({sellers.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              filterStatus === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-[#003B73]'
            }`}
          >
            Ativos ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              filterStatus === 'inactive'
                ? 'bg-rose-600 text-white shadow-xs'
                : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-[#003B73]'
            }`}
          >
            Inativos ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Tabela de Vendedores */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-900/10'} shadow-xs`}>
        {filteredSellers.length === 0 ? (
          <div className="text-center py-12 p-4">
            <Users className="w-12 h-12 text-[#52708F]/40 mx-auto mb-3" />
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#003B73]'}`}>Nenhum vendedor encontrado</h3>
            <p className="text-xs text-[#52708F] mt-1">
              {searchQuery ? 'Tente ajustar sua busca ou filtro.' : 'Clique no botão acima para cadastrar o primeiro vendedor.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b text-[10px] font-black uppercase tracking-wider ${
                isDark ? 'bg-slate-800/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-blue-900/10 text-[#52708F]'
              }`}>
                <tr>
                  <th className="py-3 px-4">Código / Nome</th>
                  <th className="py-3 px-4">CPF</th>
                  <th className="py-3 px-4">Telefone / WhatsApp</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/5">
                {filteredSellers.map((seller) => (
                  <tr key={seller.id} className={`hover:bg-blue-500/5 transition-colors ${isDark ? 'divide-slate-800' : ''}`}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          seller.active 
                            ? 'bg-blue-100 text-[#003B73] dark:bg-blue-950 dark:text-blue-300' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {seller.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-[#003B73]'}`}>{seller.name}</p>
                          {seller.code && (
                            <span className="text-[10px] font-extrabold text-[#52708F] bg-blue-950/10 dark:bg-white/10 px-1.5 py-0.5 rounded">
                              {seller.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#52708F] font-medium">
                      {seller.cpf || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {seller.phone ? (
                        <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{seller.phone}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#52708F] font-medium">
                      {seller.email ? (
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-[#52708F]" />
                          <span>{seller.email}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleSellerStatus(seller.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          seller.active 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200' 
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200'
                        }`}
                      >
                        {seller.active ? '● Ativo' : '○ Inativo'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(seller)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar Vendedor"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(seller.id, seller.name)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Excluir Vendedor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-blue-900/10 text-[#003B73]'} shadow-2xl overflow-hidden`}>
            {/* Header Modal */}
            <div className="p-5 bg-gradient-to-r from-[#003B73] to-[#006EDB] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-black">
                  {editingSeller ? 'Editar Vendedor' : 'Cadastrar Novo Vendedor'}
                </h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Modal */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Aviso:</strong> Este cadastro é para controle interno e identificação nas vendas. Vendedores não possuem acesso de login no painel.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#52708F]">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-blue-900/10 text-[#003B73] focus:border-[#006EDB]'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#52708F]">
                    Código / Matrícula
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: VEND-001"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-blue-900/10 text-[#003B73] focus:border-[#006EDB]'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#52708F]">
                    CPF
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-blue-900/10 text-[#003B73] focus:border-[#006EDB]'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#52708F]">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(99) 98400-0000"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-blue-900/10 text-[#003B73] focus:border-[#006EDB]'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#52708F]">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendedor@evidencia.com.br"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-blue-900/10 text-[#003B73] focus:border-[#006EDB]'
                    }`}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#52708F]">
                    Observações / Anotações Internas
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anotações internas sobre o vendedor..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-hidden transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-blue-900/10 text-[#003B73] focus:border-[#006EDB]'
                    }`}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="active-seller"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-[#006EDB] rounded border-blue-900/20"
                  />
                  <label htmlFor="active-seller" className="text-xs font-extrabold text-[#003B73] dark:text-slate-200 cursor-pointer">
                    Vendedor Ativo no Sistema
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-blue-900/10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-[#52708F] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#006EDB] hover:bg-[#00509E] text-white text-xs font-black transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Salvação...' : editingSeller ? 'Salvar Alterações' : 'Cadastrar Vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
