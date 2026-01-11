import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
  }

  static ok<T>(
    data: T,
    meta?: ApiResponseDto<unknown>['meta'],
  ): ApiResponseDto<T> {
    return new ApiResponseDto({ success: true, data, meta });
  }

  static error<T>(error: string): ApiResponseDto<T> {
    return new ApiResponseDto({ success: false, error });
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): ApiResponseDto<T[]> {
    return new ApiResponseDto({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
}
