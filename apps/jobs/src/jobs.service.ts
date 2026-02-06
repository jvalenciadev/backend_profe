import { Injectable } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

@Injectable()
@Processor('notifications')
export class JobsService extends WorkerHost {
  constructor(@InjectQueue('notifications') private notificationQueue: Queue) {
    super();
  }

  async sendNotification(data: any) {
    await this.notificationQueue.add('send-email', data, {
      attempts: 3,
      backoff: 1000,
    });
    return { status: 'Queued' };
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'send-email':
        console.log(`Processing notification for: ${job.data.email}`);
        // simulate work
        await new Promise(res => setTimeout(res, 1000));
        console.log(`Notification sent to: ${job.data.email}`);
        return { success: true };
    }
  }
}
