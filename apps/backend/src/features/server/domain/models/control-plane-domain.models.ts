import type { ControlPlaneDomainWarningReason } from '@gitpaas/contracts';

/**
 * The answer of the check that compares the domain of the control plane with the host.
 */
export interface ControlPlaneDomainCheck {
    readonly host: string;
    readonly resolvedAddresses: string[];
    readonly hostAddress: string | null;
    readonly pointsAtHost: boolean;
    readonly provider: string | null;
    readonly reason: ControlPlaneDomainWarningReason | null;
}
