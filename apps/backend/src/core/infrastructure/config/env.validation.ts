import { plainToInstance } from 'class-transformer';
import { IsDefined, IsEnum, IsNotEmpty, IsNumber, IsString, validateSync } from 'class-validator';

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
 * Every variable is mandatory: the app fails fast at boot if any is missing,
 * in all environments including development, rather than degrading to insecure
 * defaults. Validation also rejects values that are present but malformed
 * (e.g. a non-numeric port or an unknown {@link Environment}).
 */
export class EnvironmentVariables {
    @IsDefined()
    @IsEnum(Environment)
    public NODE_ENV!: Environment;

    @IsDefined()
    @IsNumber()
    public PORT!: number;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public DB_HOST!: string;

    @IsDefined()
    @IsNumber()
    public DB_PORT!: number;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public DB_USER!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public DB_PASSWORD!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public DB_NAME!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public REDIS_HOST!: string;

    @IsDefined()
    @IsNumber()
    public REDIS_PORT!: number;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public GITHUB_APP_ID!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public GITHUB_APP_PRIVATE_KEY!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public GITHUB_APP_INSTALLATION_ID!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public VPS_DOCKER_HOST!: string;

    @IsDefined()
    @IsNumber()
    public VPS_DOCKER_PORT!: number;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public VPS_DOCKER_CERT_PATH!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public CORS_ORIGIN!: string;

    @IsDefined()
    @IsNumber()
    public THROTTLE_TTL!: number;

    @IsDefined()
    @IsNumber()
    public THROTTLE_LIMIT!: number;

    @IsDefined()
    @IsNumber()
    public THROTTLE_STREAM_TTL!: number;

    @IsDefined()
    @IsNumber()
    public THROTTLE_STREAM_LIMIT!: number;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public JWT_ACCESS_SECRET!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public JWT_ACCESS_EXPIRES_IN!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public JWT_REFRESH_SECRET!: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    public JWT_REFRESH_EXPIRES_IN!: string;
}

/**
 * Validates the raw environment at boot and fails fast when a variable is
 * missing or malformed. Wired into `ConfigModule.forRoot({ validate })`.
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
