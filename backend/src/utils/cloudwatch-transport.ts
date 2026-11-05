import Transport from 'winston-transport';
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

interface CloudWatchTransportOptions {
  logGroupName: string;
  logStreamName: string;
  region: string;
  flushIntervalMs?: number;
}

export class CloudWatchTransport extends Transport {
  private client: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private buffer: Array<{ timestamp: number; message: string }> = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private ready = false;

  constructor(opts: CloudWatchTransportOptions) {
    super();
    this.logGroupName  = opts.logGroupName;
    this.logStreamName = opts.logStreamName;
    this.client = new CloudWatchLogsClient({ region: opts.region });
    this.setup(opts.flushIntervalMs ?? 5000);
  }

  private async setup(flushIntervalMs: number): Promise<void> {
    try {
      await this.client.send(new CreateLogGroupCommand({ logGroupName: this.logGroupName }));
    } catch (e: any) {
      if (e.name !== 'ResourceAlreadyExistsException') return;
    }
    try {
      await this.client.send(new CreateLogStreamCommand({
        logGroupName:  this.logGroupName,
        logStreamName: this.logStreamName,
      }));
    } catch (e: any) {
      if (e.name !== 'ResourceAlreadyExistsException') return;
    }
    this.ready = true;
    this.timer = setInterval(() => void this.flush(), flushIntervalMs);
    this.timer.unref(); // don't prevent process exit
  }

  private async flush(): Promise<void> {
    if (!this.ready || this.buffer.length === 0) return;
    const events = this.buffer.splice(0, 100); // CloudWatch limit: 10k events/call
    try {
      await this.client.send(new PutLogEventsCommand({
        logGroupName:  this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents:     events,
      }));
    } catch {
      this.buffer.unshift(...events); // retry next flush
    }
  }

  log(info: Record<string, unknown>, callback: () => void): void {
    this.buffer.push({
      timestamp: Date.now(),
      message:   JSON.stringify(info),
    });
    this.emit('logged', info);
    callback();
  }
}
