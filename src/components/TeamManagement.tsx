import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { 
  Shield, Briefcase, Users, UserPlus, RefreshCw, 
  Trash2, Edit3, CheckCircle2, AlertCircle, KeyRound, 
  Search, Lock, Mail, User, Sparkles, X, Check, Eye, LockKeyhole, Filter
} from 'lucide-react';

interface TeamManagementProps {
  users: UserProfile[];
  currentAdminUser: UserProfile | null;
  isDark: boolean;
  onRefreshUsers: () => void;
  addToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export type TeamFilterMode = 'all' | 'admin' | 'seller' | 'pending';

export const TeamManagement: React.FC<TeamManagementProps> = ({
  users,
  currentAdminUser,
  isDark,
  onRefreshUsers,
  addToast
}) => {
  const isAdmin = currentAdminUser?.role === 'admin';

  // Form State
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<UserRole>('admin');
  const [tempPassInput, setTempPassInput] = useState('evidencia2026');
  const [isSellerInput, setIsSellerInput] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<TeamFilterMode>('all');

  // Modals State
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('admin');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [deletingMember, setDeletingMember] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter team members (only users with role 'admin', 'seller', or isAuthorizedCollaborator)
  const teamMembers = users.filter(u => u.role === 'admin' || u.role === 'seller' || u.isAuthorizedCollaborator);

  const filteredTeam = teamMembers.filter(m => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !searchLower || (
      (m.name && m.name.toLowerCase().includes(searchLower)) ||
      (m.email && m.email.toLowerCase().includes(searchLower))
    );
    
    return matchesSearch;
  });

  // Calculate Metrics
  const totalTeam = teamMembers.length;
  const totalAdmins = teamMembers.filter(m => m.role === 'admin' || !m.role || m.role === 'seller').length;
  const totalSellers = teamMembers.filter(m => m.role === 'seller').length;
  const totalPendingReset = teamMembers.filter(m => m.requiresPasswordChange).length;


  // Handle Form Submission (Register New Team Member / Whitelist)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameInput.trim() || !emailInput.trim()) {
      addToast('Campos Incompletos', 'Por favor, informe o nome e o e-mail da Conta Google do colaborador.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await firebaseAuthService.registerTeamMember(
        nameInput.trim(),
        emailInput.trim(),
        'admin',
        isSellerInput
      );

      addToast(
        'Colaborador Autorizado!',
        `${nameInput.trim()} (${emailInput.trim()}) foi cadastrado na equipe.${isSellerInput ? ' Ativo para vendas no checkout.' : ''}`,
        'success'
      );

      // Reset Form State
      setNameInput('');
      setEmailInput('');
      setRoleInput('admin');
      setIsSellerInput(true);

      // Refresh list
      onRefreshUsers();

    } catch (err: any) {
      console.error(err);
      addToast('Erro no Cadastro', err.message || 'Não foi possível cadastrar o colaborador.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Handle Role Change
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setIsUpdatingRole(true);
      await firebaseAuthService.updateTeamMemberRole(editingMember.uid, newRole);
      addToast('Permissão Atualizada', `O cargo de ${editingMember.name} foi alterado para ${newRole === 'admin' ? 'Administrador' : 'Vendedor'}.`, 'success');
      setEditingMember(null);
      onRefreshUsers();
    } catch (err: any) {
      console.error(err);
      addToast('Erro ao Atualizar', err.message || 'Não foi possível atualizar o cargo do colaborador.', 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Handle Deactivation / Deletion
  const handleConfirmDelete = async () => {
    if (!deletingMember) return;

    try {
      setIsDeleting(true);
      await firebaseAuthService.deleteTeamMember(deletingMember.uid);
      addToast('Acesso Desativado', `O acesso do colaborador ${deletingMember.name} foi removido da equipe.`, 'info');
      setDeletingMember(null);
      onRefreshUsers();
    } catch (err: any) {
      console.error(err);
      addToast('Erro ao Desativar', err.message || 'Não foi possível remover o acesso do colaborador.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. HEADER SECTION & QUICK STATS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-500 dark:text-amber-300 border border-amber-400/30 shadow-sm mb-2.5">
            <Shield className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            <span>Módulo de Gestão de Equipe & Autorização de Acesso</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center space-x-2">
            <span className={isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300' : 'text-slate-900'}>
              Gestão de Colaboradores da Equipe
            </span>
          </h2>
          <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Autorização de e-mails via Google Auth para acesso completo ao painel administrativo
          </p>
        </div>

        <button
          onClick={onRefreshUsers}
          className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 shadow-sm active:scale-95 ${
            isDark 
              ? 'bg-slate-900/90 border-slate-800 text-slate-200 hover:text-white hover:border-amber-400/40' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
          title="Atualizar lista da equipe"
        >
          <RefreshCw className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          <span>Atualizar Lista</span>
        </button>
      </div>



      {/* 2. FORMULÁRIO DE AUTORIZAÇÃO DE NOVO COLABORADOR */}
      {isAdmin && (
        <div className={`rounded-3xl border backdrop-blur-xl overflow-hidden p-5 sm:p-6 space-y-6 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          
          <div className={`flex items-center space-x-3 border-b pb-4 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
            <div className="p-2.5 rounded-2xl bg-amber-400/10 text-amber-500 dark:text-amber-400 border border-amber-400/20 shadow-inner">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Autorizar Novo Colaborador (Whitelist Google)</h3>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Cadastra o e-mail do colaborador para autorização imediata de acesso completo via Conta Google
              </p>
            </div>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            
            {/* Input Row: Nome, Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-extrabold uppercase tracking-widest block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nome Completo do Colaborador
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Ex: Carlos Andrade"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs font-semibold border rounded-xl focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500 focus:border-slate-800'
                    }`}
                  />
                  <User className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* E-mail de Acesso (Conta Google) */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-extrabold uppercase tracking-widest block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  E-mail da Conta Google (Autorização)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="colaborador@gmail.com"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs font-semibold border rounded-xl focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950/90 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500 focus:border-slate-800'
                    }`}
                  />
                  <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                </div>
              </div>
            </div>

            {/* STATUS DE VENDEDOR NO E-COMMERCE */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between space-x-3 transition-all ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isSellerCheckbox"
                  checked={isSellerInput}
                  onChange={(e) => setIsSellerInput(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400 border-slate-700 cursor-pointer accent-amber-400"
                />
                <label htmlFor="isSellerCheckbox" className="cursor-pointer space-y-0.5">
                  <span className={`text-xs font-bold block ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    👤 Exibir como Vendedor Ativo no E-Commerce
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Quando marcado, o colaborador aparecerá na lista de vendedores do checkout para ser selecionado pelos clientes.
                  </span>
                </label>
              </div>
            </div>


            {/* AVISO DE ACESSO UNIFICADO TOTAIS */}
            <div className={`p-4 rounded-2xl border flex items-center space-x-3 ${
              isDark ? 'bg-amber-400/5 border-amber-400/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <Shield className="h-5 w-5 text-amber-400 shrink-0" />
              <p className="text-xs font-medium">
                <b>Acesso Completo e Unificado:</b> Todo colaborador cadastrado terá privilégios de Administrador com acesso total a todas as abas e ferramentas do painel.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-400/20 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                <span>{isSubmitting ? 'Cadastrando Autorização...' : 'Autorizar Colaborador'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 3. LISTAGEM DA EQUIPE ATIVA */}
      <div className={`rounded-3xl border backdrop-blur-xl overflow-hidden space-y-4 p-5 sm:p-6 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        
        {/* Toolbar: Search & Role Filters */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
          <div>
            <h3 className={`text-sm font-black uppercase tracking-wider flex items-center space-x-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <span>Membros da Equipe Ativa</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                {filteredTeam.length}
              </span>
            </h3>
            <p className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {roleFilter === 'all' && 'Exibindo todos os colaboradores cadastrados'}
              {roleFilter === 'admin' && 'Filtrando apenas Administradores'}
              {roleFilter === 'seller' && 'Filtrando apenas Vendedores'}
              {roleFilter === 'pending' && 'Filtrando apenas colaboradores aguardando troca de senha inicial'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className={`w-full pl-8 pr-3 py-2 text-xs font-medium border rounded-xl focus:outline-none transition-all ${
                  isDark ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500'
                }`}
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Role Filter Selector */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className={`px-3.5 py-2 text-xs font-bold border rounded-xl focus:outline-none transition-all ${
                isDark ? 'bg-slate-950/80 border-slate-800 text-slate-200 focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">Todos os Colaboradores ({totalTeam})</option>
              <option value="admin">Administradores ({totalAdmins})</option>
            </select>
          </div>
        </div>

        {/* Team Table */}
        <div className={`overflow-x-auto rounded-2xl border ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${
                isDark ? 'border-slate-800 bg-slate-950/90 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}>
                <th className="p-4">Colaborador / E-mail</th>
                <th className="p-4">Cargo / Acesso</th>
                <th className="p-4">Vendedor no Checkout</th>
                <th className="p-4">Autorização Google</th>
                <th className="p-4">Data Cadastro</th>
                {isAdmin && <th className="p-4 text-right">Ações de Gestão</th>}
              </tr>
            </thead>
            <tbody className={`divide-y font-semibold ${isDark ? 'divide-slate-800/40' : 'divide-slate-200'}`}>
              {filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-slate-400">
                    <AlertCircle className="h-7 w-7 mx-auto text-slate-500 mb-2" />
                    <p className="font-bold text-xs">Nenhum membro da equipe encontrado para os filtros aplicados.</p>
                  </td>
                </tr>
              ) : (
                filteredTeam.map((member) => {
                  const isSelf = currentAdminUser?.uid === member.uid;
                  const isSellerActive = member.isSeller !== false;

                  return (
                    <tr key={member.uid} className={`transition-colors ${isDark ? 'hover:bg-amber-400/[0.02]' : 'hover:bg-slate-50'}`}>
                      {/* Name & Email */}
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-md bg-amber-400 text-slate-950">
                            {member.name ? member.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{member.name}</p>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  Você (Logado)
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{member.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-4">
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                          <Shield className="h-3 w-3" />
                          <span>Administrador</span>
                        </span>
                      </td>

                      {/* Seller Status Toggle */}
                      <td className="p-4">
                        <button
                          onClick={async () => {
                            const newStatus = !isSellerActive;
                            await firebaseAuthService.updateTeamMemberSellerStatus(member.uid, newStatus);
                            addToast(
                              'Status de Vendedor Atualizado',
                              `${member.name} ${newStatus ? 'agora é exibido no checkout como Vendedor Ativo' : 'não será mais listado como vendedor no checkout'}.`,
                              'success'
                            );
                            onRefreshUsers();
                          }}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            isSellerActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                          }`}
                          title="Clique para alternar se este colaborador deve aparecer na lista de vendedores do checkout"
                        >
                          {isSellerActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span>✓ Vendedor Ativo</span>
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 text-slate-400" />
                              <span>Apenas Gestão</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Google Authorization Status Badge */}
                      <td className="p-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                          <span>✓ Liberado via Google</span>
                        </span>
                      </td>



                      {/* Created At */}
                      <td className={`p-4 text-[11px] font-mono font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>

                      {/* Management Actions */}
                      {isAdmin && (
                        <td className="p-4 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => setDeletingMember(member)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-pointer transition-all active:scale-95 text-xs font-bold flex items-center space-x-1.5 ml-auto"
                              title="Desativar Acesso do Colaborador"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remover Acesso</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CONFIRMAÇÃO DE DESATIVAÇÃO DE ACESSO */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 text-center rounded-3xl border shadow-2xl space-y-5 ${
            isDark ? 'bg-slate-900 border-rose-500/40 text-white' : 'bg-white border-rose-200 text-slate-900'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/30 mx-auto flex items-center justify-center">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-rose-500">Desativar Acesso do Colaborador?</h3>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Tem certeza que deseja remover o acesso do colaborador <b>{deletingMember.name}</b> ({deletingMember.email})?
              </p>
              <p className={`text-[10px] pt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Essa ação removerá o privilégio de acesso ao painel administrativo.</p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                } cursor-pointer`}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Removendo...' : 'Sim, Desativar Acesso'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
