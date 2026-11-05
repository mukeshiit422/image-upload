import winston from 'winston';
import { config } from '../../config';

const { combine, timestamp, errors, colorize, printf, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${stack ?? message}${metaStr}`;
  })
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: config.isDevelopment ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});

// Production-only: CloudWatch Logs + S3 error archival
if (process.env.NODE_ENV === 'production') {
  const { CloudWatchTransport } = require('./cloudwatch-transport');
  const { S3ErrorTransport }    = require('./s3-error-transport');

  const region       = config.aws.region;
  const logGroup     = process.env.CLOUDWATCH_LOG_GROUP ?? '/image-upload/backend';
  const streamDate   = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const logStreamName = `app-${streamDate}`;

  // All logs → CloudWatch
  logger.add(new CloudWatchTransport({ logGroupName: logGroup, logStreamName, region }));
  logger.exceptions.handle(new CloudWatchTransport({ logGroupName: logGroup, logStreamName: `exceptions-${streamDate}`, region }));

  // Error-level logs → S3 for long-term storage / alerting
  const logBucket = process.env.LOG_S3_BUCKET ?? config.aws.bucket;
  if (logBucket) {
    logger.add(new S3ErrorTransport({ bucket: logBucket, region }));
  }
}
