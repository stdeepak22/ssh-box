import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, USER_SECRETS_TABLE } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticateToken);

// List all secrets (returns latest version of each)
router.get('/', async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;

        const command = new QueryCommand({
            TableName: USER_SECRETS_TABLE,
            KeyConditionExpression: 'user_id = :uid',
            ExpressionAttributeValues: {
                ':uid': email
            }
        });

        const response = await docClient.send(command);
        const items = response.Items || [];

        // Group by secret_id and find latest version
        const secretsMap: Record<string, any> = {};
        items.forEach(item => {
            const id = item.secret_id.split('#')[0];
            if (!secretsMap[id] || item.version > secretsMap[id].version) {
                secretsMap[id] = { ...item, id };
            }
        });

        res.json(Object.values(secretsMap));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new secret
router.post('/', async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;
        const { name, ciphertext, salt, iv, metadata } = req.body;

        const id = uuidv4();
        const version = 1;
        const secretId = `${id}#${version}`;

        const newItem = {
            user_id: email,
            secret_id: secretId,
            version,
            name, // duplicate name here for easy access? Or put in metadata.
            ciphertext,
            salt,
            iv,
            metadata,
            created_at: new Date().toISOString()
        };

        await docClient.send(new PutCommand({
            TableName: USER_SECRETS_TABLE,
            Item: newItem
        }));

        res.status(201).json({ id, version });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get secret details
router.get('/:id', async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;
        const { id } = req.params;
        const { version } = req.query;

        let items;
        if (version) {
            // Get specific version
            const secretId = `${id}#${version}`;
            const response = await docClient.send(new GetCommand({
                TableName: USER_SECRETS_TABLE,
                Key: {
                    user_id: email,
                    secret_id: secretId
                }
            }));
            items = response.Item ? [response.Item] : [];
        } else {
            // Get all versions to find latest
            // Efficient way: Limit 1, ScanIndexForward: false (Desc)
            // But SK is secret_id#version.
            // If we query SK begins_with id, we get id#1, id#10, id#2.
            // Because of string sorting, 10 comes before 2.
            // We need to fix SK format to be padded or sort in app.
            // Or just query all and sort.
            const response = await docClient.send(new QueryCommand({
                TableName: USER_SECRETS_TABLE,
                KeyConditionExpression: 'user_id = :uid AND begins_with(secret_id, :sid)',
                ExpressionAttributeValues: {
                    ':uid': email,
                    ':sid': id + '#'
                }
            }));
            items = response.Items || [];
        }

        if (items.length === 0) {
            return res.status(404).json({ error: 'Secret not found' });
        }

        // Sort by version desc
        items.sort((a, b) => b.version - a.version);
        res.json(items[0]); // Return latest

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
