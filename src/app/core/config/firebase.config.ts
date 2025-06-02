import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { environment } from '../../../environments/environment';

/**
 * Configuração do Firebase para autenticação
 * Projeto: Vai na Lista
 * Config obtida de environment para segurança
 */

// Inicializa o Firebase
const app = initializeApp(environment.firebase);

// Inicializa o Firebase Auth
export const auth = getAuth(app);

// Configuração para desenvolvimento local (opcional)
// if (location.hostname === 'localhost') {
//   connectAuthEmulator(auth, 'http://127.0.0.1:9099');
// }

export default app;
