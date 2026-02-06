import { Controller, Get, Post, Body } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) { }

  @Post('notify')
  async notify(@Body() data: any) {
    return this.jobsService.sendNotification(data);
  }
}
