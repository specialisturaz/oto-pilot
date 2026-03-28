import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodSchema } from 'zod';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Middleware factory that validates req.body, req.query, and/or req.params
 * against the provided Zod schemas.
 *
 * Usage:
 *   router.post('/example', validate({ body: myBodySchema }), controller.handler)
 *   router.get('/example/:id', validate({ params: idParamSchema, query: filterSchema }), controller.handler)
 */
export function validate(schemas: ValidationSchemas | AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Support passing a single schema (treated as body validation)
      if ('parse' in schemas && typeof schemas.parse === 'function') {
        req.body = await (schemas as ZodSchema).parseAsync(req.body);
        next();
        return;
      }

      const validationSchemas = schemas as ValidationSchemas;

      if (validationSchemas.body) {
        req.body = await validationSchemas.body.parseAsync(req.body);
      }

      if (validationSchemas.query) {
        req.query = await validationSchemas.query.parseAsync(req.query) as typeof req.query;
      }

      if (validationSchemas.params) {
        req.params = await validationSchemas.params.parseAsync(req.params) as typeof req.params;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dogrulama hatasi',
            details: formattedErrors,
          },
        });
        return;
      }

      next(error);
    }
  };
}
