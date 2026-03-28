import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { usersService } from './users.service';
import type {
  CreateUserInput,
  UpdateUserInput,
  UpdateProfileInput,
  ChangePasswordInput,
  UserFilterInput,
} from './users.validation';

export class UsersController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as UserFilterInput;
    const result = await usersService.listUsers(filters, req.user!);

    res.status(200).json(result);
  });

  getAgents = asyncHandler(async (req: Request, res: Response) => {
    const agents = await usersService.getAgents(req.user!);

    res.status(200).json({
      success: true,
      data: agents,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const user = await usersService.getUserById(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: user,
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateUserInput;
    const user = await usersService.createUser(data, req.user!);

    res.status(201).json({
      success: true,
      data: user,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateUserInput;
    const user = await usersService.updateUser(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: user,
    });
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateProfileInput;
    const user = await usersService.updateProfile(data, req.user!);

    res.status(200).json({
      success: true,
      data: user,
    });
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as ChangePasswordInput;
    await usersService.changePassword(data, req.user!);

    res.status(200).json({
      success: true,
      message: 'Sifre basariyla degistirildi',
    });
  });

  deactivate = asyncHandler(async (req: Request, res: Response) => {
    await usersService.deactivateUser(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      message: 'Kullanici basariyla deaktive edildi',
    });
  });
}

export const usersController = new UsersController();
