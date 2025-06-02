import { Usuario } from '../services/auth.service';

/**
 * Interface para resultado da busca por email
 * Inclui status da busca para feedback ao usuário
 */
export interface ResultadoBuscaUsuario {
  encontrado: boolean;
  usuario?: Usuario;
  erro?: string;
}
