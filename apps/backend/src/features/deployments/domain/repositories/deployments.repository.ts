import { CreateDeploymentDto } from '../dtos/create-deployment.dto';
import { UpdateDeploymentDto } from '../dtos/update-deployment.dto';
import { Deployment } from '../models/deployment.model';

/**
 * Deployments repository
 */
export interface DeploymentsRepository {
    /**
     * Get every deployment belonging to a service, most recent first
     *
     * @param serviceId Service identifier
     *
     * @returns List of deployments for the service
     */
    getAllByService: (serviceId: string) => Promise<Deployment[]>;

    /**
     * Find a single deployment by its identifier
     *
     * @param id Deployment identifier
     *
     * @returns Deployment record, or `null` if not found
     */
    findById: (id: string) => Promise<Deployment | null>;

    /**
     * Create a new deployment record in the `pending` state
     *
     * @param createDto Data for creating the deployment
     */
    create: (createDto: CreateDeploymentDto) => Promise<Deployment>;

    /**
     * Update a deployment's status, stamping `finishedAt` on terminal states
     *
     * @param id Deployment identifier
     * @param updateDto New status (and failure message, when the status is `failed`)
     */
    update: (id: string, updateDto: UpdateDeploymentDto) => Promise<Deployment | null>;
}
