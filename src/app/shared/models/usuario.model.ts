/**
 * Interface para dados básicos do usuário
 * Usado para exibir informações de membros em listas compartilhadas
 * Evita dependência do AuthService para dados de outros usuários
 */
export interface UsuarioBasico {
  uid: string;
  email: string;
  nome: string;
  photoURL?: string;
  criadoEm?: Date;
}

/**
 * Interface para resultado da busca por email
 * Inclui status da busca para feedback ao usuário
 */
export interface ResultadoBuscaUsuario {
  encontrado: boolean;
  usuario?: UsuarioBasico;
  erro?: string;
}

/**
 * Interface para validação de email
 * Usado em formulários de compartilhamento
 */
export interface ValidacaoEmail {
  email: string;
  valido: boolean;
  formatoCorreto: boolean;
  usuarioExiste?: boolean;
  usuario?: UsuarioBasico;
  mensagemErro?: string;
}
