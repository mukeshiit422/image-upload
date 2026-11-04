import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { config } from '../../config';
import { logger } from '../utils/logger';
import { StorageUploadResult } from '../types';

class StorageService {
  private s3Client: S3Client | null = null;
  private readonly mode: 'local' | 's3';

  constructor() {
    this.mode = this.resolveMode();

    if (this.mode === 's3') {
        const s3Config: ConstructorParameters<typeof S3Client>[0] = {
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId!,
          secretAccessKey: config.aws.secretAccessKey!,
        },
        ...(config.aws.endpointUrl
          ? { endpoint: config.aws.endpointUrl, forcePathStyle: true }
          : {}),
      };
      this.s3Client = new S3Client(s3Config);
      logger.info('Storage mode: S3');
    } else {
      this.ensureLocalDir();
      logger.info('Storage mode: local filesystem');
    }
  }

  private resolveMode(): 'local' | 's3' {
    if (
      config.storage.mode === 's3' &&
      config.aws.accessKeyId &&
      config.aws.secretAccessKey &&
      config.aws.bucket
    ) {
      return 's3';
    }
    if (config.storage.mode === 's3') {
      logger.warn('S3 mode requested but credentials/bucket missing — falling back to local storage');
    }
    return 'local';
  }

  private ensureLocalDir(): void {
    if (!fs.existsSync(config.storage.localUploadDir)) {
      fs.mkdirSync(config.storage.localUploadDir, { recursive: true });
    }
  }

  async upload(
    buffer: Buffer,
    key: string,
    mimeType: string
  ): Promise<StorageUploadResult> {
    if (this.mode === 's3') {
      return this.uploadToS3(buffer, key, mimeType);
    }
    return this.uploadToLocal(buffer, key);
  }

  private async uploadToS3(
    buffer: Buffer,
    key: string,
    mimeType: string
  ): Promise<StorageUploadResult> {
    const command = new PutObjectCommand({
      Bucket: config.aws.bucket!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    });

    await this.s3Client!.send(command);

    const url = config.aws.endpointUrl
      ? `${config.aws.endpointUrl}/${config.aws.bucket}/${key}`
      : `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;

    return { key, url };
  }

  private async uploadToLocal(buffer: Buffer, key: string): Promise<StorageUploadResult> {
    const filePath = path.join(config.storage.localUploadDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
    const url = `/uploads/${key}`;
    return { key, url };
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.mode === 's3') {
        await this.s3Client!.send(
          new DeleteObjectCommand({ Bucket: config.aws.bucket!, Key: key })
        );
      } else {
        const filePath = path.join(config.storage.localUploadDir, key);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (err) {
      logger.warn('Failed to delete storage file', { key, err });
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (this.mode !== 's3' || !this.s3Client) {
      return `/uploads/${key}`;
    }
    const command = new GetObjectCommand({ Bucket: config.aws.bucket!, Key: key });
    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  getMode(): 'local' | 's3' {
    return this.mode;
  }
}

export const storageService = new StorageService();
