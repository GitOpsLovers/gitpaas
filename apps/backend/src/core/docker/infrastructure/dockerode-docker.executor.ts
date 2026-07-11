import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import DockerodeCompose from 'dockerode-compose';

import { DockerExecutor } from '../domain/executors/docker.executor';

import { DockerClient } from './docker.client';

@Injectable()

/**
 * Dockerode Docker executor
 */
export class DockerodeDockerExecutor implements DockerExecutor {
    private readonly logger = new Logger(DockerodeDockerExecutor.name);

    constructor(private readonly docker: DockerClient) {}

    public async up(composeContent: string, projectName: string): Promise<void> {
        const directory = await mkdtemp(join(tmpdir(), 'artifactory-deploy-'));
        const composeFile = join(directory, 'docker-compose.yml');

        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            await writeFile(composeFile, composeContent);

            const compose = new DockerodeCompose(this.docker.getClient(), composeFile, projectName);

            this.logger.log(`Pulling images for project "${projectName}"`);

            await compose.pull();

            this.logger.log(`Bringing project "${projectName}" up`);

            await compose.up();
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    }
}
