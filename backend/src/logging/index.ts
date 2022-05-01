import winston from 'winston';
import {config as dotenvConfig} from 'dotenv';

dotenvConfig();

const logger =  winston.createLogger({
  level: 'http',
  transports: [
    new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: './logs/status.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;