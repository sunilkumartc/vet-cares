import type { Request, Response } from 'express';

export function healthHandler(req: Request, res: Response) {
  res.status(200).json({ ok: true });
} 