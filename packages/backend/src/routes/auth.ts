import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, USERS_TABLE } from '../db';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists
        const getUser = await docClient.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { email }
        }));

        if (getUser.Item) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            email,
            passwordHash: hashedPassword,
            createdAt: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
            TableName: USERS_TABLE,
            Item: newUser
        }));

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

        const getUser = await docClient.send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { email }
        }));

        if (!getUser.Item) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, getUser.Item.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
