import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class BootstrapTenantDto {
  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'tenantSlug must be URL-friendly (lowercase letters, numbers, hyphens)',
  })
  tenantSlug!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;
}
