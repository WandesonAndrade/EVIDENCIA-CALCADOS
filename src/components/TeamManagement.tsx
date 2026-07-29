import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { 
  Shield, Briefcase, Users, UserPlus, RefreshCw, 
  Trash2, Edit3, CheckCircle2, AlertCircle, KeyRound, 
  Search, Lock, Mail, User, Sparkles, X, Check, Eye, ChevronRight, LockKeyhole
} from 'lucide-react';

interface TeamManagementProps {
  users: UserProfile[];
  currentAdminUser: UserProfile | null;
  isDark: boolean;
  onRefreshUsers: () => void;
  addToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

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
  const [roleInput, setRoleInput] = useState<UserRole>('seller');
  const [tempPassInput, setTempPassInput] = useState('evidencia2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'seller'>('all');

  // Modals State
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('seller');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [deletingMember, setDeletingMember] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter team members (only users with role 'admin' or 'seller')
  const teamMembers = users.filter(u => u.role === 'admin' || u.role === 'seller');

  const filteredTeam = teamMembers.filter(m => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !searchLower || (
      (m.name && m.name.toLowerCase().includes(searchLower)) ||
      (m.email && m.email.toLowerCase().includes(searchLower))
    );
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate Metrics
  const totalTeam = teamMembers.length;
  const totalAdmins = teamMembers.filter(m => m.role === 'admin').length;
  const totalSellers = teamMembers.filter(m => m.role === 'seller').length;
  const totalPendingReset = teamMembers.filter(m => m.requiresPasswordChange).length;

  // Handle Form Submission (Register New Team Member)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameInput.trim() || !emailInput.trim() || !tempPassInput.trim()) {
      addToast('Campos Incompletos', 'Por favor, preencha todos os campos obrigatórios do formulário.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await firebaseAuthService.registerTeamMember(
        nameInput.trim(),
        emailInput.trim(),
        roleInput,
        tempPassInput.trim()
      );

      addToast(
        'Colaborador Cadastrado!',
        `${nameInput.trim()} foi registrado como ${roleInput === 'admin' ? 'Administrador' : 'Vendedor'}.`,
        'success'
      );

      // Reset Form State
      setNameInput('');
      setEmailInput('');
      setRoleInput('seller');
      setTempPassInput('evidencia2026');

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
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-400 border border-amber-400/30 mb-2">
            <Shield className="h-3.5 w-3.5" />
            <span>Módulo de Gestão de Equipe & Segurança</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
            <span>Gestão de Colaboradores & Permissões</span>
          </h2>
          <p className="text-xs text-slate-400">
            Cadastre novos membros da equipe, controle níveis de acesso por papel e acompanhe a equipe ativa
          </p>
        </div>

        <button
          onClick={onRefreshUsers}
          className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Atualizar lista da equipe"
        >
          <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
          <span>Atualizar Equipe</span>
        </button>
      </div>

      {/* METRIC STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border backdrop-blur-xl space-y-1.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total da Equipe</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black">{totalTeam}</p>
          <p className="text-[10px] text-slate-400 font-medium">Colaboradores com acesso ao painel</p>
        </div>

        <div className={`p-5 rounded-2xl border backdrop-blur-xl space-y-1.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Administradores</span>
            <Shield className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{totalAdmins}</p>
          <p className="text-[10px] text-slate-400 font-medium">Acesso irrestrito a todas as abas</p>
        </div>

        <div className={`p-5 rounded-2xl border backdrop-blur-xl space-y-1.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Vendedores</span>
            <Briefcase className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-400">{totalSellers}</p>
          <p className="text-[10px] text-slate-400 font-medium">Acesso focado em vendas & pedidos</p>
        </div>

        <div className={`p-5 rounded-2xl border backdrop-blur-xl space-y-1.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[10px] font-black uppercase tracking-wider">1º Acesso Pendente</span>
            <KeyRound className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400">{totalPendingReset}</p>
          <p className="text-[10px] text-slate-400 font-medium">Aguardando troca de senha inicial</p>
        </div>
      </div>

      {/* 2. FORMULÁRIO DE CADASTRO DE COLABORADOR COM SELETORES VISUAIS DE CARGO */}
      {isAdmin && (
        <div className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-xl space-y-6 ${
          isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center space-x-3 border-b pb-4 border-slate-800/60">
            <div className="p-2.5 rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Cadastrar Novo Colaborador da Equipe</h3>
              <p className="text-xs text-slate-400">
                Gera credenciais seguras no Firebase Authentication e cria o registro no Firestore
              </p>
            </div>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            
            {/* Input Row: Nome, Email, Senha */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  Nome Completo
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Ex: Carlos Andrade"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                    }`}
                  />
                  <User className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* E-mail de Acesso */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  E-mail de Acesso (Login)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="vendedor@evidencia.com"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                    }`}
                  />
                  <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Senha Temporária */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  Senha Temporária (1º Acesso)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={tempPassInput}
                    onChange={(e) => setTempPassInput(e.target.value)}
                    placeholder="evidencia2026"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs font-mono border rounded-xl focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950/80 border-slate-800 text-amber-400 focus:border-amber-400' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                    }`}
                  />
                  <LockKeyhole className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* SELETORES VISUAIS DE CARGO (CARDS TÁTEIS - ANTI-SLOP UI) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                Selecione o Nível de Acesso (Cargo / Role)
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vendedor Card */}
                <div
                  onClick={() => setRoleInput('seller')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex items-start space-x-3.5 ${
                    roleInput === 'seller'
                      ? 'bg-sky-400/10 border-sky-400/60 ring-2 ring-sky-400/30 text-white'
                      : isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    roleInput === 'seller' ? 'bg-sky-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-wide text-slate-100">Vendedor (Operacional)</span>
                      {roleInput === 'seller' && (
                        <span className="w-5 h-5 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center text-xs">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Acesso focado no atendimento ao cliente, gestão de pedidos, vendas WhatsApp e consulta de estoque.
                    </p>
                  </div>
                </div>

                {/* Administrador Card */}
                <div
                  onClick={() => setRoleInput('admin')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex items-start space-x-3.5 ${
                    roleInput === 'admin'
                      ? 'bg-amber-400/10 border-amber-400/60 ring-2 ring-amber-400/30 text-white'
                      : isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    roleInput === 'admin' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-wide text-slate-100">Administrador (Acesso Total)</span>
                      {roleInput === 'admin' && (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Acesso irrestrito a todas as configurações da loja, gestão financeira, CMS de banners e cadastro de equipe.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-400/20 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                <span>{isSubmitting ? 'Cadastrando Credenciais...' : 'Cadastrar Colaborador Seguro'}</span>
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
              Membros da Equipe Ativa ({filteredTeam.length})
            </h3>
            <p className="text-[11px] text-slate-400">Usuários cadastrados no sistema administrativo da loja</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar colaborador por nome ou e-mail..."
                className={`w-full pl-8 pr-3 py-2 text-xs border rounded-xl focus:outline-none ${
                  isDark ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Role Filter Selector */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className={`px-3 py-2 text-xs border rounded-xl focus:outline-none ${
                isDark ? 'bg-slate-950/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="all">Todos os Cargos ({totalTeam})</option>
              <option value="admin">Administradores ({totalAdmins})</option>
              <option value="seller">Vendedores ({totalSellers})</option>
            </select>
          </div>
        </div>

        {/* Team Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/60">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                isDark ? 'border-slate-800 bg-slate-950/80 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
              }`}>
                <th className="p-4">Colaborador / E-mail</th>
                <th className="p-4">Cargo / Nível de Acesso</th>
                <th className="p-4">Status de Senha</th>
                <th className="p-4">Data de Cadastro</th>
                {isAdmin && <th className="p-4 text-right">Ações de Gestão</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-semibold">
              {filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-slate-400">
                    <AlertCircle className="h-7 w-7 mx-auto text-slate-500 mb-2" />
                    <p className="font-bold text-xs">Nenhum membro da equipe encontrado para os filtros aplicados.</p>
                  </td>
                </tr>
              ) : (
                filteredTeam.map((member) => {
                  const isMemberAdmin = member.role === 'admin';
                  const isMemberSeller = member.role === 'seller';
                  const isSelf = currentAdminUser?.uid === member.uid;

                  return (
                    <tr key={member.uid} className="hover:bg-slate-800/20 transition-colors">
                      {/* Name & Email */}
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isMemberAdmin ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-md shadow-amber-400/20' :
                            'bg-gradient-to-br from-sky-300 to-sky-500 text-slate-950 shadow-md shadow-sky-400/20'
                          }`}>
                            {member.name ? member.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-black text-slate-100">{member.name}</p>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Você (Logado)
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-4">
                        {isMemberAdmin ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-400/10 text-amber-400 border border-amber-400/30">
                            <Shield className="h-3 w-3" />
                            <span>Administrador</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-sky-400/10 text-sky-400 border border-sky-400/30">
                            <Briefcase className="h-3 w-3" />
                            <span>Vendedor</span>
                          </span>
                        )}
                      </td>

                      {/* Password Status */}
                      <td className="p-4">
                        {member.requiresPasswordChange ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 animate-pulse">
                            <KeyRound className="h-3 w-3 text-purple-400" />
                            <span>1º Acesso Pendente</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>✓ Senha Ativa</span>
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="p-4 text-slate-400 text-[11px] font-mono">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>

                      {/* Management Actions */}
                      {isAdmin && (
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingMember(member);
                              setNewRole(member.role || 'seller');
                            }}
                            className="p-2 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/30 cursor-pointer transition-all active:scale-95"
                            title="Alterar Permissão / Cargo"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => setDeletingMember(member)}
                              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer transition-all active:scale-95"
                              title="Desativar Acesso do Colaborador"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* MODAL: EDITAR CARGO DO COLABORADOR */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-black">Alterar Permissão do Colaborador</h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-200">{editingMember.name}</p>
              <p className="text-slate-400">{editingMember.email}</p>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  Selecione o Novo Cargo / Perfil
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setNewRole('seller')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-2 ${
                      newRole === 'seller'
                        ? 'bg-sky-400/10 border-sky-400 text-white'
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Briefcase className="h-4 w-4 text-sky-400 shrink-0" />
                    <span className="text-xs font-bold">Vendedor</span>
                  </div>

                  <div
                    onClick={() => setNewRole('admin')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center space-x-2 ${
                      newRole === 'admin'
                        ? 'bg-amber-400/10 border-amber-400 text-white'
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold">Administrador</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingRole ? 'Atualizando...' : 'Salvar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <p className="text-xs text-slate-300">
                Tem certeza que deseja remover o acesso do colaborador <b>{deletingMember.name}</b> ({deletingMember.email})?
              </p>
              <p className="text-[10px] text-slate-400 pt-1">Essa ação removerá o privilégio de acesso ao painel administrativo.</p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
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
