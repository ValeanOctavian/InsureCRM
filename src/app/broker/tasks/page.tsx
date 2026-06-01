import { getCurrentProfile } from "@/lib/auth/middleware";
import { getTasks, getTasksGrouped, getClientsForTaskForm } from "@/features/tasks/queries";
import { PageHeader } from "@/components/shared/page-header";
import { TasksView } from "./tasks-view";

export default async function TasksPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return <div className="p-6 text-zinc-500">Unable to load profile.</div>;
  }

  const [tasks, grouped, clients] = await Promise.all([
    getTasks(profile.id),
    getTasksGrouped(profile.id),
    getClientsForTaskForm(profile.id),
  ]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage your daily tasks and priorities"
      />

      <TasksView
        tasks={tasks}
        todo={grouped.todo}
        inProgress={grouped.in_progress}
        done={grouped.done}
        clients={clients}
      />
    </div>
  );
}
