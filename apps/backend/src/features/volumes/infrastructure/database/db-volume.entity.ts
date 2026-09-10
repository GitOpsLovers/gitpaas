import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Volumes database entity.
 */
@Entity('volumes')
@Unique('UQ_volumes_serviceId_name', ['serviceId', 'name'])
// eslint-disable-next-line no-secrets/no-secrets
@Unique('UQ_volumes_serviceId_daemonKey', ['serviceId', 'daemonKey'])
export class DbVolumeEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public serviceId!: string;

    @Column('text')
    public name!: string;

    @Column('text')
    public daemonKey!: string;

    @ManyToOne(() => DbServiceEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serviceId', foreignKeyConstraintName: 'FK_volumes_serviceId' })
    public service?: DbServiceEntity;
}
