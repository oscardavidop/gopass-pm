
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const notificationModel = (prisma as PrismaClient & {
  notification: {
    deleteMany: (args: any) => Promise<any>;
    createMany: (args: any) => Promise<any>;
  };
}).notification;

const activityLogModel = prisma.activityLog as {
  deleteMany: (args: any) => Promise<any>;
  createMany: (args: any) => Promise<any>;
};

async function main() {
  console.log('🌱 Seeding database...');

  // ── Users ──────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const managerHash = await bcrypt.hash('Manager123!', 12);
  const userHash = await bcrypt.hash('User123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tasku.pro' },
    update: { emailVerified: true, emailVerifiedAt: new Date() },
    create: {
      email: 'admin@tasku.pro',
      username: 'admin',
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'GoPass',
      role: 'ADMIN',
      bio: 'Platform administrator',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@tasku.pro' },
    update: { emailVerified: true, emailVerifiedAt: new Date() },
    create: {
      email: 'manager@tasku.pro',
      username: 'manager',
      password: managerHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      role: 'MANAGER',
      bio: 'Engineering manager',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'user@tasku.pro' },
    update: { emailVerified: true, emailVerifiedAt: new Date() },
    create: {
      email: 'user@tasku.pro',
      username: 'john_doe',
      password: userHash,
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
      bio: 'Frontend developer',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@tasku.pro' },
    update: { emailVerified: true, emailVerifiedAt: new Date() },
    create: {
      email: 'jane@tasku.pro',
      username: 'jane_smith',
      password: userHash,
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'USER',
      bio: 'Backend developer',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('✅ Users created');

  // ── Projects ───────────────────────────────────
  const project1 = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      name: 'GoPass Platform',
      description: 'Core SaaS platform development — authentication, billing, and user management.',
      color: '#6366f1',
      status: 'ACTIVE',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: manager.id, role: 'ADMIN' },
          { userId: user1.id, role: 'MEMBER' },
          { userId: user2.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const project2 = await prisma.project.upsert({
    where: { id: 'seed-project-2' },
    update: {},
    create: {
      id: 'seed-project-2',
      name: 'Design System',
      description: 'Component library and design tokens for all GoPass products.',
      color: '#ec4899',
      status: 'ACTIVE',
      startDate: new Date('2024-03-01'),
      ownerId: manager.id,
      members: {
        create: [
          { userId: manager.id, role: 'OWNER' },
          { userId: user1.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const project3 = await prisma.project.upsert({
    where: { id: 'seed-project-3' },
    update: {},
    create: {
      id: 'seed-project-3',
      name: 'Mobile App v2',
      description: 'React Native rewrite with offline-first architecture.',
      color: '#f59e0b',
      status: 'ON_HOLD',
      startDate: new Date('2024-06-01'),
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: user2.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('✅ Projects created');

  // Keep seed idempotent for task-related entities.
  await notificationModel.deleteMany({
    where: { userId: { in: [admin.id, manager.id, user1.id, user2.id] } },
  });
  await activityLogModel.deleteMany({
    where: { projectId: { in: [project1.id, project2.id, project3.id] } },
  });
  await prisma.task.deleteMany({
    where: { projectId: { in: [project1.id, project2.id, project3.id] } },
  });

  // ── Tasks for Project 1 ────────────────────────
  const tasks: Prisma.TaskUncheckedCreateInput[] = [
    {
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment.',
      priority: 'HIGH',
      status: 'DONE',
      projectId: project1.id,
      creatorId: admin.id,
      assigneeId: manager.id,
      tags: ['devops', 'ci'],
      position: 0,
    },
    {
      title: 'Implement JWT authentication',
      description: 'Access + Refresh token strategy with secure cookie storage.',
      priority: 'CRITICAL',
      status: 'DONE',
      projectId: project1.id,
      creatorId: admin.id,
      assigneeId: user2.id,
      tags: ['auth', 'security'],
      position: 1,
    },
    {
      title: 'User profile management',
      description: 'CRUD endpoints for user profile, avatar upload and preferences.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      projectId: project1.id,
      creatorId: manager.id,
      assigneeId: user1.id,
      tags: ['users'],
      position: 0,
    },
    {
      title: 'Rate limiting & security headers',
      description: 'Apply Helmet, CORS config and throttler to all endpoints.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      projectId: project1.id,
      creatorId: admin.id,
      assigneeId: user2.id,
      tags: ['security'],
      position: 1,
    },
    {
      title: 'Dashboard analytics API',
      description: 'Aggregate queries for stats: projects, tasks, productivity metrics.',
      priority: 'MEDIUM',
      status: 'REVIEW',
      projectId: project1.id,
      creatorId: manager.id,
      assigneeId: user1.id,
      tags: ['dashboard', 'analytics'],
      position: 0,
    },
    {
      title: 'WebSocket real-time events',
      description: 'Socket.IO gateway for live task updates and notifications.',
      priority: 'HIGH',
      status: 'TODO',
      projectId: project1.id,
      creatorId: admin.id,
      assigneeId: null,
      tags: ['realtime', 'websockets'],
      position: 0,
    },
    {
      title: 'Write unit tests — auth module',
      description: 'Jest tests covering login, refresh and logout flows.',
      priority: 'MEDIUM',
      status: 'TODO',
      projectId: project1.id,
      creatorId: manager.id,
      assigneeId: user2.id,
      tags: ['testing'],
      position: 1,
    },
    {
      title: 'Email notifications',
      description: 'Nodemailer integration for password reset and task assignment emails.',
      priority: 'LOW',
      status: 'TODO',
      projectId: project1.id,
      creatorId: admin.id,
      assigneeId: null,
      tags: ['email', 'notifications'],
      position: 2,
    },
  ];

  for (const taskData of tasks) {
    await prisma.task.create({ data: taskData });
  }

  // ── Tasks for Project 2 ────────────────────────
  const designTasks: Prisma.TaskUncheckedCreateInput[] = [
    {
      title: 'Define color tokens',
      priority: 'HIGH',
      status: 'DONE',
      projectId: project2.id,
      creatorId: manager.id,
      assigneeId: user1.id,
      tags: ['design', 'tokens'],
      position: 0,
    },
    {
      title: 'Button component variants',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      projectId: project2.id,
      creatorId: manager.id,
      assigneeId: user1.id,
      tags: ['components'],
      position: 0,
    },
    {
      title: 'Modal & Dialog patterns',
      priority: 'MEDIUM',
      status: 'TODO',
      projectId: project2.id,
      creatorId: manager.id,
      assigneeId: null,
      tags: ['components'],
      position: 0,
    },
  ];

  for (const taskData of designTasks) {
    await prisma.task.create({ data: taskData });
  }

  const project1Tasks = await prisma.task.findMany({ where: { projectId: project1.id } });
  const firstTask = project1Tasks[0];

  if (firstTask) {
    await activityLogModel.createMany({
      data: [
        {
          action: 'CREATED',
          entity: 'Task',
          entityId: firstTask.id,
          userId: admin.id,
          taskId: firstTask.id,
          projectId: project1.id,
        },
        {
          action: 'UPDATED',
          entity: 'Task',
          entityId: firstTask.id,
          userId: manager.id,
          taskId: firstTask.id,
          projectId: project1.id,
          newValue: { status: 'DONE' },
        },
      ],
    });
  }

  await notificationModel.createMany({
    data: [
      {
        userId: manager.id,
        title: 'Task assigned',
        body: 'You were assigned to Setup CI/CD pipeline',
        type: 'task_assigned',
      },
      {
        userId: user1.id,
        title: 'Project invitation accepted',
        body: 'Welcome to Design System project',
        type: 'project_update',
        readAt: new Date(),
      },
      {
        userId: user2.id,
        title: 'New comment on task',
        body: 'A teammate commented on JWT authentication task',
        type: 'comment',
      },
    ],
  });

  console.log('✅ Tasks created');
  console.log('✅ Notifications and activity logs created');
  console.log('\n🎉 Seed completed successfully!\n');
  console.log('Demo accounts:');
  console.log('  admin@tasku.pro    / Admin123!   (ADMIN)');
  console.log('  manager@tasku.pro  / Manager123! (MANAGER)');
  console.log('  user@tasku.pro     / User123!    (USER)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
