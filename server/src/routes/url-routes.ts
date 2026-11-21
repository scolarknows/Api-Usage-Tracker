import { Router } from 'express';
import { checksHandler, createUrlHandler, deleteUrlHandler, listUrlsHandler } from '../controllers/url-controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createUrlSchema, rangeSchema } from '../schemas/requests.js';

export const urlRouter = Router();

urlRouter.post('/', validateBody(createUrlSchema), createUrlHandler);
urlRouter.get('/', listUrlsHandler);
urlRouter.get('/:id/checks', validateQuery(rangeSchema), checksHandler);
urlRouter.delete('/:id', deleteUrlHandler);
