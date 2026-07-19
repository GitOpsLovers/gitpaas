/* eslint-disable no-secrets/no-secrets */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaselineSchema1784449334868 implements MigrationInterface {
    public name = 'BaselineSchema1784449334868';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // uuid DEFAULT uuid_generate_v4() (matching PrimaryGeneratedColumn('uuid'))
        // needs the uuid-ossp extension. TypeORM synchronize created it implicitly;
        // with synchronize off in production the migration must create it itself.
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await queryRunner.query('CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" text NOT NULL, "passwordHash" text NOT NULL, "role" text NOT NULL DEFAULT \'user\', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "jti" uuid NOT NULL, "tokenHash" text NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f3752400c98d5c0b3dca54d66d5" UNIQUE ("jti"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "projectId" uuid NOT NULL, "repositoryId" text NOT NULL DEFAULT \'\', "deploymentBranch" text NOT NULL DEFAULT \'\', "composerPath" text NOT NULL DEFAULT \'\', CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TABLE "deployments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "serviceId" uuid NOT NULL, "status" text NOT NULL DEFAULT \'pending\', "branch" text NOT NULL DEFAULT \'\', "commit" text, "commitMessage" text, "composerPath" text NOT NULL DEFAULT \'\', "triggeredBy" text NOT NULL DEFAULT \'\', "error" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "finishedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_1e5627acb3c950deb83fe98fc48" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TABLE "deployment_queue_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deploymentId" uuid NOT NULL, "repositoryId" integer NOT NULL, "commit" text NOT NULL, "composerPath" text NOT NULL, "projectName" text NOT NULL, "status" text NOT NULL DEFAULT \'queued\', "attempts" integer NOT NULL DEFAULT \'0\', "lastError" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9c0feddf4ca9a08192bea4bc727" PRIMARY KEY ("id"))');
        await queryRunner.query('CREATE TABLE "logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deploymentId" uuid NOT NULL, "seq" integer NOT NULL, "type" text NOT NULL, "content" text, "status" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id"))');
        await queryRunner.query('ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "services" ADD CONSTRAINT "FK_939f1c7659751696307d7357711" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "deployments" ADD CONSTRAINT "FK_f083ccb82822f2b3f81bbc891b6" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
        await queryRunner.query('ALTER TABLE "logs" ADD CONSTRAINT "FK_0ffc3d43271862a2232ba140ea8" FOREIGN KEY ("deploymentId") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "logs" DROP CONSTRAINT "FK_0ffc3d43271862a2232ba140ea8"');
        await queryRunner.query('ALTER TABLE "deployments" DROP CONSTRAINT "FK_f083ccb82822f2b3f81bbc891b6"');
        await queryRunner.query('ALTER TABLE "services" DROP CONSTRAINT "FK_939f1c7659751696307d7357711"');
        await queryRunner.query('ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"');
        await queryRunner.query('DROP TABLE "logs"');
        await queryRunner.query('DROP TABLE "deployment_queue_tasks"');
        await queryRunner.query('DROP TABLE "deployments"');
        await queryRunner.query('DROP TABLE "services"');
        await queryRunner.query('DROP TABLE "projects"');
        await queryRunner.query('DROP TABLE "refresh_tokens"');
        await queryRunner.query('DROP TABLE "users"');
    }
}
