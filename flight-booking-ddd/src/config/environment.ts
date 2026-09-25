import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/**
 * Fail-fast configuration contract. The process refuses to boot with a weak or
 * missing admin key, so no insecure default ever reaches an environment.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  CORS_ORIGINS = '';

  @IsString()
  @MinLength(1, { message: 'DATABASE_URL is required' })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, {
    message: 'ADMIN_API_KEY must be at least 32 characters long',
  })
  ADMIN_API_KEY!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  RATE_LIMIT_TTL_MS = 60_000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  RATE_LIMIT_LIMIT = 120;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(600)
  SEAT_HOLD_TTL_SECONDS = 420;
}

export function validateEnvironment(
  raw: Record<string, unknown>,
): EnvironmentVariables {
  const config = plainToInstance(EnvironmentVariables, raw, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = validateSync(config, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join(' | ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return config;
}
