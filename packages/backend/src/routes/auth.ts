import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getItem, putItem, TableNames, updateItem } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { User } from '@ssh-box/common';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';


const getPk = (email: string) => `USER#${email}`
const getSk = () => `CRED`

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists
        const user = await getItem({
            table: TableNames.Account,
            pk: getPk(email),
            sk: getSk()
        })

        if (user) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            pk: getPk(email),
            sk: getSk(),
            passwordHash: hashedPassword,
            createdAt: new Date().toISOString()
        };

        await putItem({
            table: TableNames.Account,
            item: newUser
        })

        res.status(201).json({ message: 'User created' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await getItem<User>({
            table: TableNames.Account,
            pk: getPk(email),
            sk: getSk(),
        })

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash||'');
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1Y' });
        res.json({ token, email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Set Master Password Verifier (Zero-Knowledge)
router.post('/set-master', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;
        const { verifier } = req.body; // { salt, iv, authTag, ciphertext }

        if (!verifier || !verifier.ciphertext) {
            return res.status(400).json({ error: 'Master verifier components required' });
        }

        await updateItem({
            table: TableNames.Account,
            pk: getPk(email),
            sk: getSk(),
            expressions: ['masterVerifier = :v'],
            values: {
                ':v': verifier
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

        const user:any = await getItem({
            table: TableNames.Account,
            pk: getPk(email),
            sk: getSk(),
        })

        if (!user || !user['masterVerifier']) {
            return res.status(404).json({ error: 'Master password not set for this account' });
        }

        res.json(user.masterVerifier);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
