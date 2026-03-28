import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { calendarService } from './calendar.service';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentFilterInput,
  DateRangeInput,
} from './calendar.validation';

export class CalendarController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as AppointmentFilterInput;
    const result = await calendarService.listAppointments(filters, req.user!);

    res.status(200).json(result);
  });

  getByDateRange = asyncHandler(async (req: Request, res: Response) => {
    const params = req.query as unknown as DateRangeInput;
    const appointments = await calendarService.getByDateRange(params, req.user!);

    res.status(200).json({
      success: true,
      data: appointments,
    });
  });

  getUpcoming = asyncHandler(async (req: Request, res: Response) => {
    const appointments = await calendarService.getUpcoming(req.user!);

    res.status(200).json({
      success: true,
      data: appointments,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const appointment = await calendarService.getAppointmentById(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: appointment,
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateAppointmentInput;
    const appointment = await calendarService.createAppointment(data, req.user!);

    res.status(201).json({
      success: true,
      data: appointment,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateAppointmentInput;
    const appointment = await calendarService.updateAppointment(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: appointment,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await calendarService.deleteAppointment(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      message: 'Randevu basariyla silindi',
    });
  });
}

export const calendarController = new CalendarController();
