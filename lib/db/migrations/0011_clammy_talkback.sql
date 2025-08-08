ALTER TABLE "ManagedFile" ADD COLUMN "originalChatId" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ManagedFile" ADD CONSTRAINT "ManagedFile_originalChatId_Chat_id_fk" FOREIGN KEY ("originalChatId") REFERENCES "public"."Chat"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "managedFile_originalChatId_idx" ON "ManagedFile" USING btree ("originalChatId");