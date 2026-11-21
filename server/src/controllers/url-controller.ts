import { asyncHandler } from '../lib/async-handler.js';
import type { rangeSchema } from '../schemas/requests.js';
import { addUrl, deleteUrl, getCheckHistory, listUrls } from '../services/urls.js';
import type { AuthRequest } from '../types/auth-request.js';
import type { z } from 'zod';

interface CreateUrlBody {
  url: string;
  name?: string | undefined;
}

export const createUrlHandler = asyncHandler(async (req, res) => {
  const { user } = req as AuthRequest;
  const body = req.body as CreateUrlBody;
  const url = await addUrl({ userId: user.id, url: body.url, name: body.name });
  res.status(201).json({ url });
});

export const listUrlsHandler = asyncHandler(async (req, res) => {
  const { user } = req as AuthRequest;
  const urls = await listUrls(user.id, new Date());
  res.json({ urls });
});

export const deleteUrlHandler = asyncHandler(async (req, res) => {
  const { user } = req as AuthRequest;
  const id = req.params.id;
  if (typeof id !== 'string') {
    res.status(404).json({ error: 'URL not found' });
    return;
  }
  await deleteUrl(user.id, id);
  res.status(204).send();
});

export const checksHandler = asyncHandler(async (req, res) => {
  const { user } = req as AuthRequest;
  const id = req.params.id;
  const query = res.locals.query as z.infer<typeof rangeSchema>;
  if (typeof id !== 'string') {
    res.status(404).json({ error: 'URL not found' });
    return;
  }
  const history = await getCheckHistory(user.id, id, query.range, new Date());
  res.json(history);
});
