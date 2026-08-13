-- `deployment_queue_tasks.parent_request_id` — correlation of a background run.
--
-- The runner emits one `deployment.run` telemetry event for every task it
-- consumes. This column persists the `request.id` of the request that queued the
-- task, so the background run connects to the fast `POST /deployments` request
-- that started it. It is nullable, because a task can be enqueued outside a
-- request (for example the recovery of pending rows after a restart).

ALTER TABLE "deployment_queue_tasks" ADD COLUMN IF NOT EXISTS "parent_request_id" text;
