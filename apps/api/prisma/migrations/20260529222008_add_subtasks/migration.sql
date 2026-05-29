-- CreateTable
CREATE TABLE "subtasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "parent_task_id" TEXT NOT NULL,

    CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subtasks_parent_task_id_idx" ON "subtasks"("parent_task_id");

-- CreateIndex
CREATE INDEX "subtasks_parent_task_id_position_idx" ON "subtasks"("parent_task_id", "position");

-- AddForeignKey
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
