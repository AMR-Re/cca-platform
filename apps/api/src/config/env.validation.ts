import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  @IsOptional()
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsUrl({ require_tld: false })
  @IsOptional()
  WEB_APP_URL?: string;

  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  @IsOptional()
  LOG_LEVEL: string = 'info';
}

/**
 * Fails fast at boot if required env vars are missing/malformed instead of
 * surfacing a confusing runtime error later.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.toString()}`);
  }

  return validated;
}
