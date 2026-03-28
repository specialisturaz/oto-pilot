import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { propertiesService } from './properties.service';
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyFilterInput,
  PublishPropertyInput,
} from './properties.validation';

export class PropertiesController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as PropertyFilterInput;
    const result = await propertiesService.listProperties(filters, req.user!);

    res.status(200).json(result);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const property = await propertiesService.getPropertyById(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: property,
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreatePropertyInput;
    const property = await propertiesService.createProperty(data, req.user!);

    res.status(201).json({
      success: true,
      data: property,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdatePropertyInput;
    const property = await propertiesService.updateProperty(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: property,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await propertiesService.deleteProperty(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: { message: 'Emlak ilani basariyla silindi' },
    });
  });

  uploadPhotos = asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILES', message: 'En az bir fotograf yukleyin' },
      });
      return;
    }

    const photos = await propertiesService.addPhotos(String(req.params.id), files, req.user!);

    res.status(201).json({
      success: true,
      data: photos,
    });
  });

  deletePhoto = asyncHandler(async (req: Request, res: Response) => {
    await propertiesService.deletePhoto(String(req.params.id), String(req.params.photoId), req.user!);

    res.status(200).json({
      success: true,
      data: { message: 'Fotograf basariyla silindi' },
    });
  });

  uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    const file = req.file as Express.Multer.File;

    if (!file) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Bir dokuman yukleyin' },
      });
      return;
    }

    const documentType = req.body.document_type || 'other';
    const document = await propertiesService.addDocument(String(req.params.id), file, documentType, req.user!);

    res.status(201).json({
      success: true,
      data: document,
    });
  });

  publish = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as PublishPropertyInput;
    const results = await propertiesService.publishToPortals(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: results,
    });
  });

  findMatchingBuyers = asyncHandler(async (req: Request, res: Response) => {
    const contacts = await propertiesService.findMatchingBuyers(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: contacts,
    });
  });
}

export const propertiesController = new PropertiesController();
