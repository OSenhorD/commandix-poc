import { Module } from '@nestjs/common';

import {
  ExecutionDetailController,
  ExecutionsController,
} from './executions.controller.js';
import { ExecutionsService } from './executions.service.js';

@Module({
  controllers: [ExecutionsController, ExecutionDetailController],
  providers: [ExecutionsService],
})
export class ExecutionsModule {}
