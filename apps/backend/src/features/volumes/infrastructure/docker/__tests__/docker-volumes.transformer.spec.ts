import { toDaemonVolume } from '../docker-volumes.transformer';

import type { RuntimeVolumeSummary } from '@core/domain/models/container-runtime.models';

describe('toDaemonVolume', () => {
    it('keeps the name, the driver and the mountpoint of the summary of the runtime', () => {
        const summary: RuntimeVolumeSummary = {
            name: 'api_pgdata',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/api_pgdata/_data',
            scope: 'local',
            labels: { 'com.docker.compose.project': 'api' },
        };

        expect(toDaemonVolume(summary)).toEqual({
            name: 'api_pgdata',
            driver: 'local',
            mountpoint: '/var/lib/docker/volumes/api_pgdata/_data',
        });
    });

    it('drops the scope and the labels, which the tab never shows', () => {
        const summary: RuntimeVolumeSummary = {
            name: 'api_pgdata', driver: 'local', mountpoint: '/data', scope: 'local', labels: {},
        };

        const result = toDaemonVolume(summary);

        expect(result).not.toHaveProperty('scope');
        expect(result).not.toHaveProperty('labels');
    });
});
