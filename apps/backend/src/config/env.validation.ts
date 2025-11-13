import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  validateSync,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Validador personalizado para garantizar que JWT_SECRET y JWT_REFRESH_SECRET sean diferentes.
 * Esto previene que un refresh token pueda ser usado como access token, lo cual violaría
 * el modelo de seguridad de rotación de tokens.
 */
@ValidatorConstraint({ name: 'secretsAreDifferent', async: false })
export class SecretsAreDifferentValidator implements ValidatorConstraintInterface {
  validate(_value: string, args: ValidationArguments): boolean {
    const obj = args.object as EnvironmentVariables;
    return obj.JWT_SECRET !== obj.JWT_REFRESH_SECRET;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'JWT_SECRET and JWT_REFRESH_SECRET must be different';
  }
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
  @Validate(SecretsAreDifferentValidator)
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

  // Redis Configuration (Optional)
  // If not provided, caching and rate limiting will use in-memory fallback
  @IsOptional()
  @IsString()
  REDIS_URL?: string;
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
