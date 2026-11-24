/**
 * Mapeamento e tradução amigável de erros do Firebase Auth e Firestore para pt-BR
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'Ocorreu um erro inesperado. Tente novamente.';

  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está sendo utilizado por outra conta. Utilize outro e-mail ou faça login com ele.';
    case 'auth/invalid-email':
      return 'O formato do e-mail informado é inválido.';
    case 'auth/weak-password':
      return 'A senha é fraca demais. Crie uma senha com no mínimo 6 caracteres, combinando letras e números.';
    case 'auth/user-not-found':
      return 'Cadastro não encontrado para o CPF informado. Verifique os dados digitados.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'CPF ou senha incorretos. Verifique e tente novamente.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas consecutivas. Por segurança, aguarde alguns minutos antes de tentar novamente.';
    case 'auth/network-request-failed':
      return 'Não foi possível conectar aos servidores. Verifique sua conexão com a internet.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Entre em contato com a equipe de atendimento.';
    case 'auth/requires-recent-login':
      return 'Por motivos de segurança, é necessário confirmar sua senha atual antes de alterar seu e-mail.';
    case 'auth/operation-not-allowed':
      return 'Operação não habilitada nas configurações do sistema. Contate o suporte.';
    case 'permission-denied':
      return 'Acesso negado no banco de dados. Verifique suas permissões.';
    case 'unavailable':
      return 'Serviço temporariamente indisponível. Tente novamente em instantes.';
    default:
      if (message && typeof message === 'string' && !message.includes('Firebase:')) {
        return message;
      }
      return 'Ocorreu um erro ao processar sua solicitação. Verifique os dados e tente novamente.';
  }
}
