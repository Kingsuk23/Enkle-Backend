import winston from 'winston';

const custom_error_levels = {
  levels: { trace: 5, debug: 4, info: 3, warn: 2, error: 1, fatal: 0 },
  colors: {
    trace: 'white',
    debug: 'green',
    info: 'cyan',
    warn: 'yellow',
    error: 'red',
    fatal: 'magenta',
  },
};

const formatter = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.splat(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return `${timestamp} $[${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  }),
);

class Logger {
  private logger: winston.Logger;

  constructor() {
    // define where the log file save
    const pod_transport = new winston.transports.File({
      filename: 'log/error.log',
      level: 'error',
    });

    // define format
    const transport = new winston.transports.Console({
      format: formatter,
    });

    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'development' ? 'trace' : 'error',
      levels: custom_error_levels.levels,
      transports: [
        process.env.NODE_ENV === 'development' ? transport : pod_transport,
      ],
    });

    winston.addColors(custom_error_levels.colors);
  }

  trace(msg: any, meta?: unknown) {
    this.logger.log('trace', msg, meta);
  }
  debug(msg: any, meta?: any) {
    this.logger.debug(msg, meta);
  }

  info(msg: any, meta?: any) {
    this.logger.info(msg, meta);
  }

  warn(msg: any, meta?: any) {
    this.logger.warn(msg, meta);
  }
  error(msg: any, meta?: any) {
    this.logger.error(msg, meta);
  }

  fatal(msg: any, meta?: any) {
    this.logger.log('fatal', msg, meta);
  }
}

export const logger = new Logger();
