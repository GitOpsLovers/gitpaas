import { Check, Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * The identifier of the single row that holds the parameters of the deployment system.
 */
export const PLATFORM_SETTINGS_ROW_ID = 1;

/**
 * Platform settings database entity
 */
@Entity('platform_settings')
@Check(`"id" = ${PLATFORM_SETTINGS_ROW_ID}`)
export class DbPlatformSettingsEntity {
    @PrimaryColumn({ type: 'int', default: PLATFORM_SETTINGS_ROW_ID })
    public id!: number;

    @Column('int')
    public logRetentionDays!: number;

    @Column({ type: 'text', nullable: true })
    public gitpaasDomain!: string | null;

    @UpdateDateColumn({ type: 'timestamptz' })
    public updatedAt!: Date;
}
