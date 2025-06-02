import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

/**
 * Configuração do Firebase para autenticação e Firestore
 * Projeto: Vai na Lista
 * Config obtida de environment para segurança
 */

// Inicializa o Firebase
const app = initializeApp(environment.firebase);

// Inicializa o Firebase Auth
export const auth = getAuth(app);

// Inicializa o Firestore
export const db = getFirestore(app);

// Configuração para desenvolvimento local (opcional)
// if (location.hostname === 'localhost') {
//   connectAuthEmulator(auth, 'http://127.0.0.1:9099');
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

export default app;
