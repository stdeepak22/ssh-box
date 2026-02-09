import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getItem, putItem, TableNames, updateItem } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { registrationLimiter, loginLimiter, setMasterLimiter } from '../middleware/rate-limiter';
import { DbUser, EncryptionParts } from '@ssh-box/common_types';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const getPk = (email: string) => `USER#${email}`
const getSk = () => `CRED`
const getMpSk = () => `MP`

// Register
router.post('/register', registrationLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Basic password validation
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Check if user exists
        const user = await getItem({
            table: TableNames.Account,
            pk: getPk(email),
            sk: getSk()
        })

        if (user) {
            console.log(`Registration attempt failed - User already exists: ${email}`);
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            pk: getPk(email),
            sk: getSk(),
            passwordHash: hashedPassword,
            has_mp: false,
            createdAt: new Date().toISOString()
        };

        await putItem({
            table: TableNames.Account,
            item: newUser
        })

        await putItem({
            table: TableNames.Account,
            item: {
                pk: getPk(email),
                sk: getMpSk(),
                salt: undefined,
                iv: undefined,
                ct: undefined,
                createdAt: new Date().toISOString(),
            }
        })

        console.log(`User created successfully: ${email}`);
        res.status(201).json({ message: 'User created' });
    } catch (err) {
        console.error(`Registration error:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await getItem<DbUser>({
            table: TableNames.Account,
            pk: getPk(email),
            sk: getSk(),
        })

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash || '');
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1Y' });

        res.json({ token, email, has_mp: user.has_mp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Set Master Password Verifier (Zero-Knowledge)
router.post('/set-master', authenticateToken, setMasterLimiter, async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;
        const { salt, iv, ct } = req.body as EncryptionParts; // { salt, iv, ct }

        if (!salt || !iv || !ct) {
            return res.status(400).json({ error: 'checking payload, not all required fields provided.' });
        }

        await updateItem({
            table: TableNames.Account,
            pk: getPk(email),
            sk: getMpSk(),
            expressions: [
                "salt=:salt",
                "iv=:iv",
                "ct=:ct",
                "updatedAt=:updatedAt"
            ],
            values: {
                ':salt': salt,
                ':iv': iv,
                ':ct': ct,
                ':updatedAt': new Date().toISOString(),
            }
        })

        await updateItem({
            table: TableNames.Account,
            pk: getPk(email),
            sk: getSk(),
            expressions: [
                "has_mp=:has_mp",
                "updatedAt=:updatedAt"
            ],
            values: {
                ':has_mp': true,
                ':updatedAt': new Date().toISOString(),
            }
        })
        res.json({ message: 'Master verifier set successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Master Password Verifier (Zero-Knowledge)
router.get('/master-verifier', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;

        const parts = await getItem<EncryptionParts>({
            table: TableNames.Account,
            pk: getPk(email),
            sk: getMpSk(),
        })

        if (!parts || !parts.ct) {
            return res.status(404).json({ error: 'Master password not set for this account' });
        }

        res.json(parts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
