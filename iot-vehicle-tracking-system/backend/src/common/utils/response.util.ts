import type { Response } from 'express';

/**
 * Send 200 OK with data
 */
export const sendOk = <T>(res: Response, data: T): void => {
  res.status(200).json(data);
};

/**
 * Send 201 Created with data
 */
export const sendCreated = <T>(res: Response, data: T): void => {
  res.status(201).json(data);
};

