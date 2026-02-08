import express from 'express';
import { AuthRequest, AuthStatus, isAuthenticated } from '../middleware/auth';

const router = express.Router();

router.get("/", async (req: AuthRequest, res)=>{
    const {isAuthorized} = await isAuthenticated(req);
    return res.json(`pong: ${isAuthorized === AuthStatus.Authorized ? 'Authorized' : 'Unauthorized'}`);
})

export default router;