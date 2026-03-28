import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { propertiesController } from './properties.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import config from '../../config';
import {
  createPropertySchema,
  updatePropertySchema,
  propertyFilterSchema,
  propertyIdParamSchema,
  photoIdParamSchema,
  publishPropertySchema,
} from './properties.validation';

const router = Router();

// Multer config for photo uploads
const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(config.upload.uploadsDir, 'properties'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 20, // Max 20 photos at once
  },
  fileFilter: (_req, file, cb) => {
    if ((config.upload.allowedImageTypes as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Gecersiz dosya tipi. Sadece JPEG, PNG ve WebP kabul edilir.'));
    }
  },
});

// Multer config for document uploads
const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(config.upload.uploadsDir, 'documents'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allAllowed = [...config.upload.allowedImageTypes, ...config.upload.allowedDocumentTypes];
    if ((allAllowed as string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Gecersiz dosya tipi.'));
    }
  },
});

// All property routes require authentication
router.use(requireAuth);

// CRUD
router.get('/', validate({ query: propertyFilterSchema }), propertiesController.list);
router.get('/:id', validate({ params: propertyIdParamSchema }), propertiesController.getById);
router.post('/', validate({ body: createPropertySchema }), propertiesController.create);
router.put('/:id', validate({ params: propertyIdParamSchema, body: updatePropertySchema }), propertiesController.update);
router.delete('/:id', validate({ params: propertyIdParamSchema }), propertiesController.delete);

// Photos
router.post('/:id/photos', validate({ params: propertyIdParamSchema }), photoUpload.array('photos', 20), propertiesController.uploadPhotos);
router.delete('/:id/photos/:photoId', validate({ params: photoIdParamSchema }), propertiesController.deletePhoto);

// Documents
router.post('/:id/documents', validate({ params: propertyIdParamSchema }), documentUpload.single('document'), propertiesController.uploadDocument);

// Publishing & matching
router.post('/:id/publish', validate({ params: propertyIdParamSchema, body: publishPropertySchema }), propertiesController.publish);
router.get('/:id/matching', validate({ params: propertyIdParamSchema }), propertiesController.findMatchingBuyers);

export default router;
