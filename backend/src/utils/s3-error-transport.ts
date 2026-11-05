import Transport from 'winston-transport';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface S3ErrorTransportOptions {
  bucket: string;
  region: string;
  prefix?: string;
}

export class S3ErrorTransport extends Transport {
  private client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(opts: S3ErrorTransportOptions) {
    super({ level: 'error' }); // only receives error-level and above
    this.bucket = opts.bucket;
    this.prefix = opts.prefix ?? 'logs/errors';
    this.client = new S3Client({ region: opts.region });
  }

  log(info: Record<string, unknown>, callback: () => void): void {
    const now    = new Date();
    const yyyy   = now.getFullYear();
    const mm     = String(now.getMonth() + 1).padStart(2, '0');
    const dd     = String(now.getDate()).padStart(2, '0');
    const key    = `${this.prefix}/${yyyy}/${mm}/${dd}/${now.getTime()}-${process.pid}.json`;

    this.client
      .send(new PutObjectCommand({
        Bucket:      this.bucket,
        Key:         key,
        Body:        JSON.stringify({ ...info, timestamp: now.toISOString() }),
        ContentType: 'application/json',
      }))
      .catch(() => {}); // fire-and-forget — never block the app for a log write

    this.emit('logged', info);
    callback();
  }
}
