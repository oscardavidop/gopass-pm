-- Performance indexes from final pre-production audit
CREATE INDEX "tasks_project_id_status_idx" ON "tasks"("project_id", "status");
CREATE INDEX "tasks_project_id_assignee_id_idx" ON "tasks"("project_id", "assignee_id");
CREATE INDEX "tasks_project_id_due_date_idx" ON "tasks"("project_id", "due_date");

CREATE INDEX "activity_logs_project_id_created_at_idx" ON "activity_logs"("project_id", "created_at");
CREATE INDEX "activity_logs_task_id_created_at_idx" ON "activity_logs"("task_id", "created_at");

CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

CREATE INDEX "files_entity_type_entity_id_created_at_idx" ON "files"("entity_type", "entity_id", "created_at");
