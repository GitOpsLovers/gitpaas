import { Component } from '@angular/core';

import { ComponentCardComponent } from '@shared/components/component-card/component-card.component';

interface LogLine {
    time: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
}

@Component({
    selector: 'app-service-logs',
    templateUrl: './service-logs.component.html',
    imports: [ComponentCardComponent],
})

/**
 * Presentational card showing the service deployment logs.
 */
export class ServiceLogsComponent {
    // --- Dummy data (placeholder until wired to the backend) ---

    protected readonly logs: LogLine[] = [
        { time: '14:32:01', level: 'INFO', message: 'Starting deployment of v1.4.2' },
        { time: '14:32:03', level: 'INFO', message: 'Pulling image registry.internal/app:v1.4.2' },
        { time: '14:32:08', level: 'INFO', message: 'Image pulled (312 MB) in 4.7s' },
        { time: '14:32:10', level: 'WARN', message: 'Health check retry 1/3 on :8080/healthz' },
        { time: '14:32:14', level: 'INFO', message: 'Container started successfully' },
        { time: '14:32:15', level: 'ERROR', message: 'Metrics exporter failed to bind port 9090, retrying' },
        { time: '14:32:17', level: 'INFO', message: 'Metrics exporter bound on port 9091' },
        { time: '14:32:18', level: 'INFO', message: 'Deployment complete — 2/2 instances healthy' },
    ];

    protected logLevelClass(level: LogLine['level']): string {
        switch (level) {
            case 'ERROR':
                return 'text-red-400';
            case 'WARN':
                return 'text-amber-400';
            default:
                return 'text-emerald-400';
        }
    }
}
