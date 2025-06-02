import { Injectable, signal } from '@angular/core';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase.config';
import { LoggingService } from './logging.service';
import { ToastService } from './toast.service';
import { UsuarioBasico, ResultadoBuscaUsuario, ValidacaoEmail } from '../models/usuario.model';

/**
 * Serviço para gerenciar operações com usuários
 * Focado em busca por email para funcionalidades de compartilhamento
 * Inclui cache para otimizar performance
 */
@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly COLLECTION_USUARIOS = 'usuarios';
  private readonly CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutos

  // Cache simples para usuários buscados recentemente
  private cacheUsuarios = new Map<string, { usuario: UsuarioBasico; timestamp: number }>();

  // Signal para histórico de emails validados (para autocomplete futuro)
  private historicoEmails = signal<string[]>([]);

  constructor(
    private loggingService: LoggingService,
    private toastService: ToastService
  ) {
    this.carregarHistoricoLocal();
  }

  /**
   * Busca usuário por email no Firestore
   * Inclui cache para evitar consultas repetidas
   */
  async buscarUsuarioPorEmail(email: string): Promise<ResultadoBuscaUsuario> {
    const emailLimpo = email.trim().toLowerCase();

    this.loggingService.info('Iniciando busca de usuário por email', {
      email: emailLimpo,
      temCache: this.temCacheValido(emailLimpo),
    });

    try {
      // Verifica cache primeiro
      const cacheItem = this.cacheUsuarios.get(emailLimpo);
      if (cacheItem && this.isCacheValido(cacheItem.timestamp)) {
        this.loggingService.debug('Usuário encontrado no cache', {
          email: emailLimpo,
          usuario: cacheItem.usuario.nome,
        });

        return {
          encontrado: true,
          usuario: cacheItem.usuario,
        };
      }

      // Busca no Firestore por email
      const usuariosQuery = query(collection(db, this.COLLECTION_USUARIOS), where('email', '==', emailLimpo), limit(1));

      const querySnapshot = await getDocs(usuariosQuery);

      if (querySnapshot.empty) {
        this.loggingService.info('Usuário não encontrado por email', {
          email: emailLimpo,
        });

        return {
          encontrado: false,
          erro: 'Usuário não encontrado',
        };
      }

      // Processa resultado
      const doc = querySnapshot.docs[0];
      const dadosUsuario = doc.data();

      const usuario: UsuarioBasico = {
        uid: doc.id,
        email: dadosUsuario['email'],
        nome: dadosUsuario['nome'] || dadosUsuario['displayName'] || 'Usuário',
        photoURL: dadosUsuario['photoURL'],
        criadoEm: dadosUsuario['criadoEm']?.toDate(),
      };

      // Adiciona ao cache
      this.adicionarAoCache(emailLimpo, usuario);

      // Adiciona ao histórico para autocomplete
      this.adicionarAoHistorico(emailLimpo);

      this.loggingService.info('Usuário encontrado com sucesso', {
        email: emailLimpo,
        uid: usuario.uid,
        nome: usuario.nome,
      });

      return {
        encontrado: true,
        usuario,
      };
    } catch (error: unknown) {
      this.loggingService.error('Erro ao buscar usuário por email', {
        email: emailLimpo,
        error: (error as Error).message,
      });

      return {
        encontrado: false,
        erro: 'Erro interno ao buscar usuário',
      };
    }
  }

  /**
   * Busca múltiplos usuários por suas UIDs
   * Usado para carregar dados de membros de listas compartilhadas
   */
  async buscarUsuariosPorIds(uids: string[]): Promise<UsuarioBasico[]> {
    this.loggingService.info('Buscando múltiplos usuários por UID', {
      count: uids.length,
      uids: uids.slice(0, 3), // Log apenas os primeiros 3 para privacidade
    });

    try {
      const promises = uids.map(async uid => {
        try {
          const docRef = doc(db, this.COLLECTION_USUARIOS, uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const dados = docSnap.data();
            return {
              uid,
              email: dados['email'],
              nome: dados['nome'] || dados['displayName'] || 'Usuário',
              photoURL: dados['photoURL'],
              criadoEm: dados['criadoEm']?.toDate(),
            };
          }

          this.loggingService.warn('Usuário não encontrado por UID', { uid });
          return null;
        } catch (error) {
          this.loggingService.error('Erro ao buscar usuário individual', {
            uid,
            error: (error as Error).message,
          });
          return null;
        }
      });

      const resultados = await Promise.all(promises);
      const usuariosValidos = resultados.filter((usuario): usuario is UsuarioBasico => usuario !== null);

      this.loggingService.info('Busca múltipla concluída', {
        solicitados: uids.length,
        encontrados: usuariosValidos.length,
      });

      return usuariosValidos;
    } catch (error: unknown) {
      this.loggingService.error('Erro na busca múltipla de usuários', {
        error: (error as Error).message,
        uidsCount: uids.length,
      });

      this.toastService.error('Erro ao carregar dados dos usuários');
      return [];
    }
  }

  /**
   * Valida formato de email e existência do usuário
   * Usado em tempo real em formulários
   */
  async validarEmail(email: string): Promise<ValidacaoEmail> {
    const emailLimpo = email.trim().toLowerCase();

    // Validação de formato primeiro
    const formatoCorreto = this.validarFormatoEmail(emailLimpo);

    if (!formatoCorreto) {
      return {
        email: emailLimpo,
        valido: false,
        formatoCorreto: false,
        mensagemErro: 'Formato de email inválido',
      };
    }

    // Busca se usuário existe
    try {
      const resultado = await this.buscarUsuarioPorEmail(emailLimpo);

      return {
        email: emailLimpo,
        valido: resultado.encontrado,
        formatoCorreto: true,
        usuarioExiste: resultado.encontrado,
        usuario: resultado.usuario,
        mensagemErro: resultado.encontrado ? undefined : 'Usuário não encontrado',
      };
    } catch (error) {
      return {
        email: emailLimpo,
        valido: false,
        formatoCorreto: true,
        usuarioExiste: false,
        mensagemErro: 'Erro ao validar email',
      };
    }
  }

  /**
   * Obtém histórico de emails para autocomplete
   */
  obterHistoricoEmails(): string[] {
    return this.historicoEmails();
  }

  /**
   * Limpa cache de usuários
   */
  limparCache(): void {
    this.cacheUsuarios.clear();
    this.loggingService.info('Cache de usuários limpo');
  }

  /**
   * Verifica se formato do email é válido
   */
  private validarFormatoEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Verifica se cache do usuário ainda é válido
   */
  private isCacheValido(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_EXPIRATION_MS;
  }

  /**
   * Verifica se tem cache válido para email
   */
  private temCacheValido(email: string): boolean {
    const cacheItem = this.cacheUsuarios.get(email);
    return cacheItem ? this.isCacheValido(cacheItem.timestamp) : false;
  }

  /**
   * Adiciona usuário ao cache
   */
  private adicionarAoCache(email: string, usuario: UsuarioBasico): void {
    this.cacheUsuarios.set(email, {
      usuario,
      timestamp: Date.now(),
    });

    // Limita tamanho do cache (máximo 100 usuários)
    if (this.cacheUsuarios.size > 100) {
      const primeiraChave = this.cacheUsuarios.keys().next().value;
      this.cacheUsuarios.delete(primeiraChave);
    }
  }

  /**
   * Adiciona email ao histórico para autocomplete
   */
  private adicionarAoHistorico(email: string): void {
    const historicoAtual = this.historicoEmails();

    if (!historicoAtual.includes(email)) {
      const novoHistorico = [email, ...historicoAtual].slice(0, 20); // Máximo 20 emails
      this.historicoEmails.set(novoHistorico);
      this.salvarHistoricoLocal(novoHistorico);
    }
  }

  /**
   * Carrega histórico do localStorage
   */
  private carregarHistoricoLocal(): void {
    try {
      const historico = localStorage.getItem('vai-na-lista-historico-emails');
      if (historico) {
        const emails = JSON.parse(historico);
        this.historicoEmails.set(emails);
      }
    } catch (error) {
      this.loggingService.warn('Erro ao carregar histórico de emails', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Salva histórico no localStorage
   */
  private salvarHistoricoLocal(emails: string[]): void {
    try {
      localStorage.setItem('vai-na-lista-historico-emails', JSON.stringify(emails));
    } catch (error) {
      this.loggingService.warn('Erro ao salvar histórico de emails', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Obtém estatísticas do cache para debugging
   */
  obterEstatisticasCache(): { tamanho: number; itensValidos: number } {
    const agora = Date.now();
    let itensValidos = 0;

    for (const item of this.cacheUsuarios.values()) {
      if (this.isCacheValido(item.timestamp)) {
        itensValidos++;
      }
    }

    return {
      tamanho: this.cacheUsuarios.size,
      itensValidos,
    };
  }
}
