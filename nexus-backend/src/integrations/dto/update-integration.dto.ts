import { PartialType } from '@nestjs/swagger';

import { CreateIntegrationDto } from './create-integration.dto.js';

export class UpdateIntegrationDto extends PartialType(CreateIntegrationDto) {}
