import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  get resolvedPage(): number {
    return this.page ?? 1;
  }

  get resolvedLimit(): number {
    return this.limit ?? 20;
  }

  get offset(): number {
    return (this.resolvedPage - 1) * this.resolvedLimit;
  }
}
