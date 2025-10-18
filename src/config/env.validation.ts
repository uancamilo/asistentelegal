import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsEnum, validateSync, MinLength } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  // Existentes (de Fase 1 y 2)
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  ADMIN_EMAIL!: string;

  @IsString()
  @MinLength(8)
  ADMIN_PASSWORD!: string;

  @IsString()
  @MinLength(8)
  SECONDARY_ADMIN_PASSWORD!: string;

  @IsString()
  @MinLength(8)
  EDITOR_PASSWORD!: string;

  // Nuevas para Fase 3A
  @IsNumber()
  PORT: number = 3000;

  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRATION: string = '15m';

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_REFRESH_EXPIRATION: string = '7d';

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
