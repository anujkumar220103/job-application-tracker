-- Additive, non-destructive migration: adds indexes on frequently queried
-- foreign keys and the Job.status filter column. Uses IF NOT EXISTS so it is
-- safe to apply even if an index already exists. No data is modified.

CREATE INDEX IF NOT EXISTS "Job_userId_idx" ON "Job"("userId");
CREATE INDEX IF NOT EXISTS "Job_status_idx" ON "Job"("status");
CREATE INDEX IF NOT EXISTS "Job_userId_status_idx" ON "Job"("userId", "status");
CREATE INDEX IF NOT EXISTS "JobTimelineEvent_jobId_idx" ON "JobTimelineEvent"("jobId");
CREATE INDEX IF NOT EXISTS "Interview_jobId_idx" ON "Interview"("jobId");
CREATE INDEX IF NOT EXISTS "Reminder_jobId_idx" ON "Reminder"("jobId");
