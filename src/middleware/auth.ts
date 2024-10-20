import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

// Define the User type
interface UserPayload {
    id: string; // or number, depending on your user ID type
    email: string;
}

// Extend the Express Request interface to include the user property
export interface RequestWithUser extends Request {
    user?: UserPayload; // Use the custom user payload type here
}
const authenticateJWT = (req: any, res: any, next: NextFunction): void => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: JwtPayload | string | undefined) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }

        if (typeof user !== 'string' && user) {
            req.user = { id: user.id, email: user.email }; // Attach user information to the request object
        }

        next();
    });
};

export default authenticateJWT;
