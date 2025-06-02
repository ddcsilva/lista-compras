import { Usuario } from '../services/auth.service';

/**
 * Interface para validação de email
 * Usado em formulários de compartilhamento
 */
export interface ValidacaoEmail {
  email: string;
  valido: boolean;
  formatoCorreto: boolean;
  usuarioExiste?: boolean;
  usuario?: Usuario;
  mensagemErro?: string;
}
