import { SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_KEY } from '@/common/constants/auth-metadata.constants.js';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
