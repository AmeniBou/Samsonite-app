CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderStatusHistory_orderId_fkey'
  ) THEN
    ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "OrderStatusHistory" ("orderId", "previousStatus", "newStatus", "note", "createdAt")
SELECT "id", NULL, "status", 'Historique initial généré depuis le statut existant', "createdAt"
FROM "Order" o
WHERE NOT EXISTS (
    SELECT 1
    FROM "OrderStatusHistory" h
    WHERE h."orderId" = o."id"
);
