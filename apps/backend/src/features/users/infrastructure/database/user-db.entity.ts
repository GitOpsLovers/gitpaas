import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { UserRole } from '../../domain/models/user.model';

/**
 * Users database entity
 */
@Entity('users')
export class UserDbEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column({ type: 'text', unique: true })
    public email!: string;

    @Column({ type: 'text' })
    public passwordHash!: string;

    @Column({ type: 'text', default: UserRole.User })
    public role!: UserRole;

    @Column({ type: 'boolean', default: true })
    public isActive!: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    public updatedAt!: Date;
}
