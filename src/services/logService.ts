import { LOG_LEVELS } from '@/config/constants';

type LogLevel = keyof typeof LOG_LEVELS;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class LogService {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logQueue: LogEntry[] = [];
  private readonly MAX_QUEUE_SIZE = 100;

  constructor() {
    // Enviar logs periodicamente em produção
    if (!this.isDevelopment) {
      setInterval(() => this.flushLogs(), 30000);
    }
  }

  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const module = entry.module.padEnd(15);
    const message = entry.message;
    const data = entry.data ? `\n${JSON.stringify(entry.data, null, 2)}` : '';

    return `${timestamp} [${level}] [${module}] ${message}${data}`;
  }

  private createLogEntry(level: LogLevel, module: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data: this.sanitizeData(data)
    };
  }

  private sanitizeData(data: any): any {
    if (!data) return undefined;

    // Clone o objeto para não modificar o original
    const sanitized = { ...data };

    // Lista de campos sensíveis para redação
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];

    // Função recursiva para redação de campos sensíveis
    const redact = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      Object.keys(obj).forEach(key => {
        if (sensitiveFields.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          redact(obj[key]);
        }
      });
    };

    redact(sanitized);
    return sanitized;
  }

  private async flushLogs() {
    if (this.logQueue.length === 0) return;

    try {
      // Em produção, enviar logs para um serviço externo
      if (!this.isDevelopment) {
        // TODO: Implementar envio para serviço de logging externo
        // await this.sendToExternalService(this.logQueue);
      }

      this.logQueue = [];
    } catch (error) {
      console.error('Erro ao enviar logs:', error);
    }
  }

  private addToQueue(entry: LogEntry) {
    this.logQueue.push(entry);
    if (this.logQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flushLogs();
    }
  }

  error(module: string, message: string, data?: any) {
    const entry = this.createLogEntry('ERROR', module, message, data);
    console.error(this.formatLog(entry));
    this.addToQueue(entry);
  }

  warn(module: string, message: string, data?: any) {
    const entry = this.createLogEntry('WARN', module, message, data);
    console.warn(this.formatLog(entry));
    this.addToQueue(entry);
  }

  info(module: string, message: string, data?: any) {
    const entry = this.createLogEntry('INFO', module, message, data);
    console.info(this.formatLog(entry));
    this.addToQueue(entry);
  }

  debug(module: string, message: string, data?: any) {
    if (this.isDevelopment) {
      const entry = this.createLogEntry('DEBUG', module, message, data);
      console.debug(this.formatLog(entry));
      this.addToQueue(entry);
    }
  }
}

export const logService = new LogService(); 
