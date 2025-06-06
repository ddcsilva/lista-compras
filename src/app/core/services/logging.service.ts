import { Injectable } from '@angular/core';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
  userId?: string;
  sessionId?: string;
}

export type LogExtra = Record<string, any>;

/**
 * Configuração de níveis de log
 * Reduzi drasticamente para desenvolvimento mais limpo
 */
const LOG_CONFIG = {
  // Só mostra logs críticos em desenvolvimento
  enableConsoleLogging: false, // DESABILITADO para desenvolvimento limpo
  enableLocalStorage: false,
  enableRemoteLogging: false,
  maxEntries: 100,

  // Só permite logs de nível ERROR ou superior
  logLevels: {
    ERROR: true,
    WARN: false,
    INFO: false,
    DEBUG: false,
  },
};

/**
 * Serviço centralizado de logging
 * Fornece interface unificada para logs da aplicação
 * Preparado para integração futura com serviços externos (Sentry, Firebase)
 */
@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private readonly LOG_STORAGE_KEY = 'vai-na-lista-logs';
  private readonly MAX_LOGS_STORED = 100;
  private readonly isProduction = false; // TODO: configurar baseado no environment
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.info('LoggingService initialized', { sessionId: this.sessionId });
  }

  /**
   * Log de erro (sempre exibido)
   */
  error(message: string, extra?: LogExtra): void {
    if (!LOG_CONFIG.logLevels.ERROR) return;

    this.log('ERROR', message, extra);
  }

  /**
   * Log de aviso (desabilitado por padrão)
   */
  warn(message: string, extra?: LogExtra): void {
    if (!LOG_CONFIG.logLevels.WARN) return;

    this.log('WARN', message, extra);
  }

  /**
   * Log informativo (desabilitado por padrão)
   */
  info(message: string, extra?: LogExtra): void {
    if (!LOG_CONFIG.logLevels.INFO) return;

    this.log('INFO', message, extra);
  }

  /**
   * Log de debug (desabilitado por padrão)
   */
  debug(message: string, extra?: LogExtra): void {
    if (!LOG_CONFIG.logLevels.DEBUG) return;

    this.log('DEBUG', message, extra);
  }

  /**
   * Registra um erro completo com stack trace
   */
  logError(error: Error, context?: string, additionalData?: any): void {
    const logData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      additionalData,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.error(`Unhandled Error: ${error.message}`, logData);
  }

  /**
   * Registra erro HTTP com detalhes específicos
   */
  logHttpError(status: number, statusText: string, url: string, method: string, errorBody?: any): void {
    const logData = {
      status,
      statusText,
      url,
      method,
      errorBody,
      timestamp: new Date().toISOString(),
    };

    this.error(`HTTP Error ${status}: ${statusText}`, logData);
  }

  /**
   * Obtém logs armazenados localmente
   */
  getLogs(level?: LogLevel): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.LOG_STORAGE_KEY);
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];

      if (level !== undefined) {
        return logs.filter(log => log.level >= level);
      }

      return logs;
    } catch (error) {
      console.error('Erro ao recuperar logs:', error);
      return [];
    }
  }

  /**
   * Limpa todos os logs armazenados
   */
  clearLogs(): void {
    try {
      localStorage.removeItem(this.LOG_STORAGE_KEY);
      this.info('Logs cleared');
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
    }
  }

  /**
   * Exporta logs como arquivo JSON
   */
  exportLogs(): void {
    try {
      const logs = this.getLogs();
      const dataStr = JSON.stringify(logs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vai-na-lista-logs-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      URL.revokeObjectURL(url);

      this.info('Logs exported successfully');
    } catch (error: unknown) {
      this.error('Failed to export logs', { error: (error as Error).message });
    }
  }

  /**
   * Método principal de logging (simplificado)
   */
  private log(level: string, message: string, extra?: LogExtra): void {
    if (!LOG_CONFIG.enableConsoleLogging) return;

    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}  ${message}`;

    // Console output mínimo
    if (level === 'ERROR') {
      console.error(logMessage, extra || '');
    }
  }

  /**
   * Gera ID único para a sessão
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas dos logs
   */
  getLogStats(): { total: number; byLevel: Record<string, number> } {
    const logs = this.getLogs();
    const byLevel = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    logs.forEach(log => {
      switch (log.level) {
        case LogLevel.DEBUG:
          byLevel.debug++;
          break;
        case LogLevel.INFO:
          byLevel.info++;
          break;
        case LogLevel.WARN:
          byLevel.warn++;
          break;
        case LogLevel.ERROR:
          byLevel.error++;
          break;
      }
    });

    return {
      total: logs.length,
      byLevel,
    };
  }
}
