import {
    ProviderRegistration,
    ProviderRegistrationConversion,
} from '../../domain/models/provider-registration.models';

import { DbProviderRegistrationEntity } from './db-provider-registration.entity';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

/**
 * The columns the conversion of a manifest writes on a pending registration.
 */
export type SealedProviderRegistrationConversion = Pick<
    DbProviderRegistrationEntity,
    'appId' | 'appSlug' | 'encryptedPrivateKey'
>;

/**
 * Maps a pending registration database entity into its domain model.
 *
 * @param entity Pending registration database entity
 *
 * @returns Domain pending registration
 */
export function toProviderRegistration(entity: DbProviderRegistrationEntity): ProviderRegistration {
    return {
        id: entity.id,
        state: entity.state,
        name: entity.name,
        ownerType: entity.ownerType,
        ownerLogin: entity.ownerLogin,
        step: entity.step,
        appId: entity.appId,
        appSlug: entity.appSlug,
        encryptedPrivateKey: entity.encryptedPrivateKey,
        createdAt: entity.createdAt,
        expiresAt: entity.expiresAt,
    };
}

/**
 * Maps the configuration GitHub answered the conversion with into the columns of the row.
 *
 * @param cipher Secret cipher
 * @param conversion Configuration of the application, with its private key in clear
 *
 * @returns The columns of the pending registration, with the sealed private key
 */
export function toSealedProviderRegistrationConversion(
    cipher: SecretCipher,
    conversion: ProviderRegistrationConversion,
): SealedProviderRegistrationConversion {
    return {
        appId: conversion.appId,
        appSlug: conversion.appSlug,
        encryptedPrivateKey: cipher.encryptSecret(conversion.privateKey),
    };
}
