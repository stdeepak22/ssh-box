import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../constants';

export interface AuthRequest extends Request {
    user?: {
        email: string;
    };
}

export enum AuthStatus {
    Unauthorized_401,
    Forbidden_403,
    Authorized,
}

export const isAuthenticated = async (req: AuthRequest): Promise<{
    isAuthorized: AuthStatus,
    tokenData?: {email: string}
}> => {
    let isAuth = AuthStatus.Unauthorized_401; 
    let tokenData;

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token){
        jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
            if (err){
                isAuth = AuthStatus.Forbidden_403;
            } else {
                isAuth = AuthStatus.Authorized;
                tokenData = user as { email: string };;
            }
        });
    }
    return {
        isAuthorized:isAuth,
        tokenData,
    }
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const {isAuthorized, tokenData} = await isAuthenticated(req);

    if(isAuthorized === AuthStatus.Authorized){
        req.user = tokenData;
        next();
    } else {
        res.sendStatus(
            isAuthorized === AuthStatus.Unauthorized_401 
            ? 401
            : 403
        );
    }
};
