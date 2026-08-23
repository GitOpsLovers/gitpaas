import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Service variables database entity.
 */
@Entity('service_variables')
@Unique('UQ_service_variables_serviceId_name', ['serviceId', 'name'])
export class DbServiceVariableEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public serviceId!: string;

    @Column('text')
    public name!: string;

    @Column({ type: 'text', default: '' })
    public value!: string;

    @Column({ type: 'boolean', default: false })
    public secret!: boolean;

    @ManyToOne(() => DbServiceEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serviceId', foreignKeyConstraintName: 'FK_service_variables_serviceId' })
    public service?: DbServiceEntity;
}
