import * as express from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string; // or number, depending on your user ID type
                email: string;
            };
        }
    }
}
