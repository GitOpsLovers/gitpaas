-- `logs` — the persisted, replayable log lines of a deployment.
--
-- Last table of the baseline schema: it hangs off `deployments`, so it comes
-- after 005.

CREATE TABLE IF NOT EXISTS "logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deploymentId" uuid NOT NULL, "seq" integer NOT NULL, "type" text NOT NULL, "content" text, "status" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id"));

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_0ffc3d43271862a2232ba140ea8') THEN
        ALTER TABLE "logs" ADD CONSTRAINT "FK_0ffc3d43271862a2232ba140ea8" FOREIGN KEY ("deploymentId") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END
$$;
