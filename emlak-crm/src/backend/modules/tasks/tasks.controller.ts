import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { tasksService } from './tasks.service';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  CompleteTaskInput,
  TaskFilterInput,
} from './tasks.validation';

export class TasksController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as TaskFilterInput;
    const result = await tasksService.listTasks(filters, req.user!);

    res.status(200).json(result);
  });

  getMyTasks = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as TaskFilterInput;
    const result = await tasksService.getMyTasks(filters, req.user!);

    res.status(200).json(result);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const task = await tasksService.getTaskById(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: task,
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateTaskInput;
    const task = await tasksService.createTask(data, req.user!);

    res.status(201).json({
      success: true,
      data: task,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateTaskInput;
    const task = await tasksService.updateTask(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: task,
    });
  });

  assign = asyncHandler(async (req: Request, res: Response) => {
    const { assigned_to_id } = req.body;
    const task = await tasksService.assignTask(String(req.params.id), assigned_to_id, req.user!);

    res.status(200).json({
      success: true,
      data: task,
    });
  });

  complete = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CompleteTaskInput;
    const task = await tasksService.completeTask(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: task,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await tasksService.deleteTask(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      message: 'Gorev basariyla silindi',
    });
  });
}

export const tasksController = new TasksController();
