import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

/**
 * Runtime environment the application boots into.
 */
enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

/**
 * Shape and constraints of the environment variables the backend understands.
 *
 * Every variable is optional so boot preserves today's default-driven behavior;
 * validation only rejects values that are present but malformed (e.g. a
 * non-numeric port or an unknown {@link Environment}).
 */
export class EnvironmentVariables {
    @IsOptional()
    @IsEnum(Environment)
    public NODE_ENV: Environment = Environment.Development;

    @IsOptional()
    @IsNumber()
    public PORT?: number;

    @IsOptional()
    @IsString()
    public DB_HOST?: string;

    @IsOptional()
    @IsNumber()
    public DB_PORT?: number;

    @IsOptional()
    @IsString()
    public DB_USER?: string;

    @IsOptional()
    @IsString()
    public DB_PASSWORD?: string;

    @IsOptional()
    @IsString()
    public DB_NAME?: string;

    @IsOptional()
    @IsString()
    public REDIS_HOST?: string;

    @IsOptional()
    @IsNumber()
    public REDIS_PORT?: number;

    @IsOptional()
    @IsString()
    public GITHUB_APP_ID?: string;

    @IsOptional()
    @IsString()
    public GITHUB_APP_PRIVATE_KEY?: string;

    @IsOptional()
    @IsString()
    public GITHUB_APP_INSTALLATION_ID?: string;

    @IsOptional()
    @IsString()
    public VPS_DOCKER_HOST?: string;

    @IsOptional()
    @IsNumber()
    public VPS_DOCKER_PORT?: number;

    @IsOptional()
    @IsString()
    public VPS_DOCKER_CERT_PATH?: string;

    @IsOptional()
    @IsString()
    public CORS_ORIGIN?: string;

    @IsOptional()
    @IsNumber()
    public THROTTLE_TTL?: number;

    @IsOptional()
    @IsNumber()
    public THROTTLE_LIMIT?: number;

    @IsOptional()
    @IsNumber()
    public THROTTLE_STREAM_TTL?: number;

    @IsOptional()
    @IsNumber()
    public THROTTLE_STREAM_LIMIT?: number;
}

/**
 * Validates the raw environment at boot and fails fast when a variable is
 * malformed. Wired into `ConfigModule.forRoot({ validate })`.
 *
 * @param config Raw environment record (typically `process.env` merged with `.env`)
 *
 * @returns The validated, type-coerced configuration
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
    const validatedConfig = plainToInstance(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
        forbidUnknownValues: false,
    });

    if (errors.length > 0) {
        const details = errors
            .map((error) => Object.values(error.constraints ?? {}).join(', '))
            .join('; ');

        throw new Error(`Invalid environment configuration: ${details}`);
    }

    return validatedConfig;
}
