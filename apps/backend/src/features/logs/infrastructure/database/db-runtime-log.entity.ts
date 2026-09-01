import type { RuntimeLogSource } from '@gitpaas/contracts';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Runtime logs database entity
 */
@Entity('runtime_logs')
@Index(['containerId', 'timestamp'])
@Index(['createdAt'])
export class DbRuntimeLogEntity {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    public id!: string;

    @Column({ type: 'varchar', length: 64 })
    public containerId!: string;

    @Column({ type: 'timestamptz' })
    public timestamp!: Date;

    @Column({ type: 'text' })
    public source!: RuntimeLogSource;

    @Column({ type: 'text' })
    public text!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    public createdAt!: Date;
}
