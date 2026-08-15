import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { ProviderType } from '../../domain/models/provider.models';

/**
 * Providers database entity
 */
@Entity('providers')
@Unique('UQ_providers_name', ['name'])
export class DbProviderEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column({ type: 'text' })
    public name!: string;

    @Column({ type: 'text', default: ProviderType.GithubApp })
    public type!: ProviderType;

    @Column({ type: 'text' })
    public appId!: string;

    @Column({ type: 'text' })
    public installationId!: string;

    /** The private key, sealed by `secret-cipher`. It never leaves the server. */
    @Column({ type: 'text' })
    public encryptedPrivateKey!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    public updatedAt!: Date;
}
