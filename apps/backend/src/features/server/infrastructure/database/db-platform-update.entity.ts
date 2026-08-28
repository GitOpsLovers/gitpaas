import type { PlatformUpdateState } from '@gitpaas/contracts';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { UPDATE_INITIAL_STEP } from '../../domain/constants/platform-update.constants';

/**
 * Platform updates database entity
 */
@Entity('platform_updates')
export class DbPlatformUpdateEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('text')
    public targetVersion!: string;

    @Column({ type: 'text', default: UPDATE_INITIAL_STEP })
    public step!: string;

    @Column({ type: 'integer', default: 0 })
    public percent!: number;

    @Column({ type: 'text', default: 'running' })
    public state!: PlatformUpdateState;

    @Column({ type: 'text', nullable: true })
    public error!: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    public startedAt!: Date;
}
