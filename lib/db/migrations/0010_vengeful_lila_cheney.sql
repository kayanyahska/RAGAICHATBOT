CREATE TABLE IF NOT EXISTS "ChatFile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"fileId" uuid NOT NULL,
	"addedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ChatFile" ADD CONSTRAINT "ChatFile_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ChatFile" ADD CONSTRAINT "ChatFile_fileId_ManagedFile_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."ManagedFile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatFile_chatId_fileId_idx" ON "ChatFile" USING btree ("chatId","fileId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatFile_chatId_idx" ON "ChatFile" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatFile_fileId_idx" ON "ChatFile" USING btree ("fileId");