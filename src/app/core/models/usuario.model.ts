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
