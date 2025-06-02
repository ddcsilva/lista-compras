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
   * Log de debug - apenas em desenvolvimento
   */
  debug(message: string, data?: any, source?: string): void {
    if (!this.isProduction) {
      this.log(LogLevel.DEBUG, message, data, source);
    }
  }

  /**
   * Log informativo
   */
  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  /**
   * Log de aviso
   */
  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  /**
   * Log de erro - sempre registrado
   */
  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
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

    this.error(`Unhandled Error: ${error.message}`, logData, context);
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

    this.error(`HTTP Error ${status}: ${statusText}`, logData, 'HttpInterceptor');
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
   * Exporta logs para análise
   */
  exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Método interno para registrar logs
   */
  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      source,
      sessionId: this.sessionId,
    };

    // Console output com cores baseadas no nível
    this.outputToConsole(logEntry);

    // Armazenamento local para desenvolvimento/debug
    this.storeLog(logEntry);

    // TODO: Enviar para serviço externo em produção
    if (this.isProduction && level >= LogLevel.ERROR) {
      this.sendToExternalService(logEntry);
    }
  }

  /**
   * Output formatado para console
   */
  private outputToConsole(logEntry: LogEntry): void {
    const { timestamp, level, message, data, source } = logEntry;
    const timeStr = timestamp.toISOString();
    const sourceStr = source ? `[${source}]` : '';
    const fullMessage = `${timeStr} ${sourceStr} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage, data);
        break;
      case LogLevel.INFO:
        console.info(fullMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, data);
        break;
      case LogLevel.ERROR:
        console.error(fullMessage, data);
        break;
    }
  }

  /**
   * Armazena log localmente
   */
  private storeLog(logEntry: LogEntry): void {
    try {
      const logs = this.getLogs();
      logs.push(logEntry);

      // Mantém apenas os últimos N logs
      while (logs.length > this.MAX_LOGS_STORED) {
        logs.shift();
      }

      localStorage.setItem(this.LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Erro ao armazenar log:', error);
    }
  }

  /**
   * Placeholder para integração futura com serviços externos
   */
  private sendToExternalService(logEntry: LogEntry): void {
    // TODO: Implementar integração com Sentry, Firebase, etc.
    // Exemplo:
    // if (window.Sentry) {
    //   window.Sentry.addBreadcrumb({
    //     message: logEntry.message,
    //     level: this.mapLogLevelToSentry(logEntry.level),
    //     data: logEntry.data
    //   });
    // }
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
