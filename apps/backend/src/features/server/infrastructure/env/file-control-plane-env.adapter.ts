import { readFile, writeFile } from 'node:fs/promises';

import { Injectable } from '@nestjs/common';

import { CONTROL_PLANE_ENV_PATH } from '../../domain/constants/platform-settings.constants';
import type { ControlPlaneEnvFile } from '../../domain/ports/control-plane-env-file.port';

/**
 * File control plane environment adapter
 */
@Injectable()
export class FileControlPlaneEnvAdapter implements ControlPlaneEnvFile {
    public async writeDomain(domain: string): Promise<void> {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const raw = await readFile(CONTROL_PLANE_ENV_PATH, 'utf8');

        // eslint-disable-next-line security/detect-non-literal-fs-filename
        await writeFile(CONTROL_PLANE_ENV_PATH, this.applyEntries(raw, this.buildEntries(domain)), 'utf8');
    }

    /**
     * Builds the value each variable of the control plane takes for a domain.
     *
     * @param domain Host name the control plane answers on
     *
     * @returns One entry per variable the file must carry
     */
    private buildEntries(domain: string): Map<string, string> {
        return new Map([
            ['CONTROL_PLANE_DOMAIN', domain],
            ['CONTROL_PLANE_PROXY', 'true'],
            ['CORS_ORIGIN', `https://${domain}`],
            ['APP_BASE_URL', `https://${domain}`],
        ]);
    }

    /**
     * Rewrites the assignment of each given variable, and keeps every other line of the file.
     *
     * @param raw Content of the file of the environment
     * @param entries Value each variable of the control plane takes
     *
     * @returns The content the file takes, with the same comments, order and trailing newline
     */
    private applyEntries(raw: string, entries: Map<string, string>): string {
        const lines = raw.split('\n');
        const endsWithNewline = lines.at(-1) === '';

        if (endsWithNewline) {
            lines.pop();
        }

        const missing = new Set(entries.keys());

        const written = lines.map((line) => {
            for (const [key, value] of entries) {
                // eslint-disable-next-line security/detect-non-literal-regexp
                if (new RegExp(`^\\s*${key}=`).test(line)) {
                    missing.delete(key);

                    return `${key}=${value}`;
                }
            }

            return line;
        });

        // A file that the installer wrote before this variable existed carries none of it, so the
        // absent assignment joins the end rather than replacing a line that is not there.
        for (const key of missing) {
            written.push(`${key}=${entries.get(key) ?? ''}`);
        }

        return endsWithNewline ? `${written.join('\n')}\n` : written.join('\n');
    }
}
