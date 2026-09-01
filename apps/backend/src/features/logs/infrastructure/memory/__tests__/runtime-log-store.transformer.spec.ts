import { toCreateRuntimeLogDto, toRuntimeLogLine } from '../runtime-log-store.transformer';

describe('runtime-log-store.transformer', () => {
    const receivedAt = new Date('2026-08-21T12:00:00.000Z');

    describe('toCreateRuntimeLogDto', () => {
        it('maps the line onto the data of its row, under the container it comes from', () => {
            const result = toCreateRuntimeLogDto(
                'container-1',
                { timestamp: '2026-08-21T11:59:00.000Z', source: 'stderr', text: 'boom' },
                receivedAt,
            );

            expect(result).toEqual({
                containerId: 'container-1',
                timestamp: new Date('2026-08-21T11:59:00.000Z'),
                source: 'stderr',
                text: 'boom',
            });
        });

        it('takes the moment the store got the line when the line names no instant', () => {
            const result = toCreateRuntimeLogDto(
                'container-1',
                { timestamp: 'not-a-date', source: 'stdout', text: 'started' },
                receivedAt,
            );

            expect(result.timestamp).toEqual(receivedAt);
        });
    });

    describe('toRuntimeLogLine', () => {
        it('maps the instant of a line onto the text of the contract', () => {
            const result = toRuntimeLogLine({
                timestamp: new Date('2026-08-21T11:59:00.000Z'),
                source: 'stdout',
                text: 'started',
            });

            expect(result).toEqual({
                timestamp: '2026-08-21T11:59:00.000Z',
                source: 'stdout',
                text: 'started',
            });
        });
    });
});
