import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { DbUserEntity } from '@features/users/infrastructure/database/db-user.entity';

/**
 * Refresh tokens database entity.
 */
@Entity('refresh_tokens')
// eslint-disable-next-line no-secrets/no-secrets
@Index('IDX_refresh_tokens_family_id', ['familyId'])
export class DbRefreshTokenEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public userId!: string;

    @Column({ type: 'uuid', unique: true })
    public jti!: string;

    @Column({ type: 'uuid' })
    public familyId!: string;

    @Column({ type: 'text' })
    public tokenHash!: string;

    @Column({ type: 'timestamptz' })
    public expiresAt!: Date;

    @Column({ type: 'boolean', default: false })
    public revoked!: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    public updatedAt!: Date;

    @ManyToOne(() => DbUserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    public user?: DbUserEntity;
}
