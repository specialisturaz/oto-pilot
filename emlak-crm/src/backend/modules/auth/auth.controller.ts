import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authService } from './auth.service';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validation';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as RegisterInput;
    const result = await authService.register(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as LoginInput;
    const result = await authService.login(data);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    await authService.logout(userId);

    res.status(200).json({
      success: true,
      data: { message: 'Basariyla cikis yapildi' },
    });
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as RefreshTokenInput;
    const result = await authService.refreshToken(data);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as ForgotPasswordInput;
    const result = await authService.forgotPassword(data);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as ResetPasswordInput;
    const result = await authService.resetPassword(data);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const user = await authService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  });
}

export const authController = new AuthController();
