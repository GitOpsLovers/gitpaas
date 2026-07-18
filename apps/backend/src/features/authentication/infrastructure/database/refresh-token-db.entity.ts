import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { UserDbEntity } from '@features/users/infrastructure/database/user-db.entity';

/**
 * Refresh tokens database entity.
 *
 * Stores only the hash of each issued refresh token so a database leak never
 * exposes a usable token. Rows are revoked (never deleted) on rotation and
 * logout, and cascade-deleted with their owning user.
 */
@Entity('refresh_tokens')
export class RefreshTokenDbEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public userId!: string;

    @Column({ type: 'uuid', unique: true })
    public jti!: string;

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

    @ManyToOne(() => UserDbEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    public user?: UserDbEntity;
}
