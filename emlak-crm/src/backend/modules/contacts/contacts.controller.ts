import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { contactsService } from './contacts.service';
import type {
  CreateContactInput,
  UpdateContactInput,
  ContactFilterInput,
  CreateNoteInput,
} from './contacts.validation';

export class ContactsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as ContactFilterInput;
    const result = await contactsService.listContacts(filters, req.user!);

    res.status(200).json(result);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const contact = await contactsService.getContactById(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: contact,
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateContactInput;
    const contact = await contactsService.createContact(data, req.user!);

    res.status(201).json({
      success: true,
      data: contact,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateContactInput;
    const contact = await contactsService.updateContact(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: contact,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await contactsService.deleteContact(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: { message: 'Musteri basariyla silindi' },
    });
  });

  getActivities = asyncHandler(async (req: Request, res: Response) => {
    const activities = await contactsService.getContactActivities(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: activities,
    });
  });

  getDeals = asyncHandler(async (req: Request, res: Response) => {
    const deals = await contactsService.getContactDeals(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: deals,
    });
  });

  addNote = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateNoteInput;
    const note = await contactsService.addContactNote(String(req.params.id), data, req.user!);

    res.status(201).json({
      success: true,
      data: note,
    });
  });
}

export const contactsController = new ContactsController();
