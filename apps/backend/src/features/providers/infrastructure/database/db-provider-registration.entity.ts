import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { ProviderAppOwnerType, ProviderRegistrationStep } from '../../domain/models/provider-registration.models';

/**
 * Pending provider registrations database entity
 */
@Entity('provider_registrations')
@Index('UQ_provider_registrations_state', ['state'], { unique: true })
export class DbProviderRegistrationEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column({ type: 'text' })
    public state!: string;

    @Column({ type: 'text' })
    public name!: string;

    @Column({ type: 'text' })
    public ownerType!: ProviderAppOwnerType;

    @Column({ type: 'text', nullable: true })
    public ownerLogin!: string | null;

    @Column({ type: 'text', default: ProviderRegistrationStep.AwaitingCreation })
    public step!: ProviderRegistrationStep;

    @Column({ type: 'text', nullable: true })
    public appId!: string | null;

    @Column({ type: 'text', nullable: true })
    public appSlug!: string | null;

    @Column({ type: 'text', nullable: true })
    public encryptedPrivateKey!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @Column({ type: 'timestamptz' })
    public expiresAt!: Date;
}
