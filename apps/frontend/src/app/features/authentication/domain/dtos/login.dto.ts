/**
 * Credentials sent to `POST /auth/login`.
 */
export interface LoginDto {
    email: string;
    password: string;
}
