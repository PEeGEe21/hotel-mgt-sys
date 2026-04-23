import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TaskFilterDto } from '../dtos/task-filter.dto';
import { CreateTaskDto } from '../dtos/create-task.dto';
import { UpdateTaskDto } from '../dtos/update-task.dto';

const TASK_INCLUDE = {
  room: {
    select: {
      id: true,
      number: true,
      type: true,
      status: true,
      floorId: true,
      floor: { select: { id: true, name: true, level: true } },
    },
  },
  staff: { select: { id: true, firstName: true, lastName: true, avatar: true } },
} as const;

@Injectable()
export class HousekeepingService {
  constructor(private prisma: PrismaService) {}

  // ── Stats for overview ─────────────────────────────────────────────────────
  async getStats(hotelId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = { hotelId, createdAt: { gte: today, lt: tomorrow } };

    const [total, pending, inProgress, done, blocked, urgent, roomsByStatus, floorSummary] =
      await Promise.all([
        this.prisma.housekeepingTask.count({ where }),
        this.prisma.housekeepingTask.count({ where: { ...where, status: TaskStatus.PENDING } }),
        this.prisma.housekeepingTask.count({ where: { ...where, status: TaskStatus.IN_PROGRESS } }),
        this.prisma.housekeepingTask.count({ where: { ...where, status: TaskStatus.DONE } }),
        this.prisma.housekeepingTask.count({ where: { ...where, status: TaskStatus.SKIPPED } }),
        this.prisma.housekeepingTask.count({ where: { ...where, priority: TaskPriority.URGENT } }),
        // Room status counts
        this.prisma.room.groupBy({ by: ['status'], where: { hotelId }, _count: { status: true } }),
        // Floor-level summary
        this.prisma.floor.findMany({
          where: { hotelId },
          orderBy: { level: 'asc' },
          include: {
            rooms: {
              select: { id: true, status: true },
            },
          },
        }),
      ]);

    const roomStats = roomsByStatus.reduce(
      (acc: any, r) => ({
        ...acc,
        [r.status]: r._count.status,
      }),
      {},
    );

    const floors = floorSummary.map((f) => ({
      id: f.id,
      name: f.name,
      level: f.level,
      ready: f.rooms.filter((r) => r.status === 'AVAILABLE').length,
      dirty: f.rooms.filter((r) => r.status === 'DIRTY').length,
      occupied: f.rooms.filter((r) => r.status === 'OCCUPIED').length,
      maintenance: f.rooms.filter((r) => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_ORDER')
        .length,
      total: f.rooms.length,
    }));

    return { total, pending, inProgress, done, blocked, urgent, roomStats, floors };
  }

  // ── List tasks ─────────────────────────────────────────────────────────────
  async findAll(hotelId: string, filters: TaskFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.type) where.type = filters.type;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.floorId) where.room = { floorId: filters.floorId };
    if (filters.search) {
      where.OR = [
        { room: { number: { contains: filters.search, mode: 'insensitive' } } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
        { staff: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { staff: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.housekeepingTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { dueBy: 'asc' }, { createdAt: 'asc' }],
        include: TASK_INCLUDE,
      }),
      this.prisma.housekeepingTask.count({ where }),
    ]);

    return { tasks, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Single task ─────────────────────────────────────────────────────────────
  async findOne(hotelId: string, id: string) {
    const task = await this.prisma.housekeepingTask.findFirst({
      where: { id, hotelId },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException('Task not found.');
    return task;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(hotelId: string, dto: CreateTaskDto) {
    // Verify room belongs to hotel
    const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, hotelId } });
    if (!room) throw new NotFoundException('Room not found.');
    if (dto.assignedTo) {
      await this.assertStaffBelongsToHotel(hotelId, dto.assignedTo);
    }

    return this.prisma.housekeepingTask.create({
      data: {
        hotelId,
        roomId: dto.roomId,
        type: dto.type,
        priority: dto.priority ?? TaskPriority.NORMAL,
        assignedTo: dto.assignedTo ?? null,
        notes: dto.notes,
        dueBy: dto.dueBy ? new Date(dto.dueBy) : null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
      include: TASK_INCLUDE,
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(hotelId: string, id: string, dto: UpdateTaskDto) {
    await this.findOne(hotelId, id);
    if (dto.assignedTo) {
      await this.assertStaffBelongsToHotel(hotelId, dto.assignedTo);
    }

    const completedAt = dto.status === TaskStatus.DONE ? new Date() : undefined;

    return this.prisma.housekeepingTask.update({
      where: { id },
      data: {
        ...dto,
        dueBy: dto.dueBy ? new Date(dto.dueBy) : undefined,
        completedAt,
        // When marked done, update room status to AVAILABLE
        ...(dto.status === TaskStatus.DONE ? {} : {}),
      },
      include: TASK_INCLUDE,
    });
  }

  // ── Mark done & update room ─────────────────────────────────────────────────
  async markDone(hotelId: string, id: string) {
    const task = await this.findOne(hotelId, id);
    const [updated] = await Promise.all([
      this.prisma.housekeepingTask.update({
        where: { id },
        data: { status: TaskStatus.DONE, completedAt: new Date() },
        include: TASK_INCLUDE,
      }),
      // Only flip room to AVAILABLE if no other pending/in-progress tasks for this room
      this.prisma.housekeepingTask
        .count({
          where: {
            hotelId,
            roomId: task.roomId,
            id: { not: id },
            status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
          },
        })
        .then((remaining) => {
          if (remaining === 0) {
            return this.prisma.room.update({
              where: { id: task.roomId },
              data: { status: 'AVAILABLE' },
            });
          }
        }),
    ]);
    return updated;
  }

  // ── Assign ─────────────────────────────────────────────────────────────────
  async assign(hotelId: string, id: string, staffId: string | null) {
    await this.findOne(hotelId, id);
    if (staffId) {
      await this.assertStaffBelongsToHotel(hotelId, staffId);
    }

    return this.prisma.housekeepingTask.update({
      where: { id },
      data: { assignedTo: staffId },
      include: TASK_INCLUDE,
    });
  }

  // ── Bulk create (e.g. after checkouts) ─────────────────────────────────────
  async bulkCreate(hotelId: string, roomIds: string[], type: string, priority: TaskPriority) {
    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds }, hotelId },
      select: { id: true },
    });
    const foundRoomIds = new Set(rooms.map((room) => room.id));
    const missingRoomIds = roomIds.filter((roomId) => !foundRoomIds.has(roomId));

    if (missingRoomIds.length > 0) {
      throw new NotFoundException(`Rooms not found: ${missingRoomIds.join(', ')}`);
    }

    const tasks = roomIds.map((roomId) => ({
      hotelId,
      roomId,
      type,
      priority,
      status: TaskStatus.PENDING,
    }));
    await this.prisma.housekeepingTask.createMany({ data: tasks });
    return { created: tasks.length };
  }

  private async assertStaffBelongsToHotel(hotelId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, hotelId },
      select: { id: true },
    });

    if (!staff) throw new NotFoundException('Staff not found.');
  }

  // ── Get housekeeping staff ─────────────────────────────────────────────────
  async getStaff(hotelId: string) {
    return this.prisma.staff.findMany({
      where: {
        hotelId,
        user: { isActive: true },
        OR: [
          { department: { contains: 'Housekeeping', mode: 'insensitive' } },
          { user: { role: { in: ['HOUSEKEEPING', 'MANAGER', 'ADMIN'] } } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        position: true,
        department: true,
        tasks: {
          where: { status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] }, hotelId },
          select: { id: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });
  }
}
