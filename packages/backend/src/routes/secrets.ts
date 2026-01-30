import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
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

        // Group by secret_id and find latest version + all versions
        const secretsMap: Record<string, any> = {};
        items.forEach(item => {
            const id = item.secret_id.split('#')[0];
            const itemVersion = item.version || 1;

            if (!secretsMap[id]) {
                secretsMap[id] = { ...item, id, allVersions: [itemVersion] };
                secretsMap[id].version = itemVersion; // Ensure lowercase version is set
            } else {
                secretsMap[id].allVersions.push(itemVersion);
                if (itemVersion > secretsMap[id].version) {
                    const { allVersions } = secretsMap[id];
                    secretsMap[id] = { ...item, id, allVersions };
                    secretsMap[id].version = itemVersion;
                }
            }
        });

        const result = Object.values(secretsMap);
        result.forEach((s: any) => {
            s.allVersions = Array.from(new Set(s.allVersions)); // Remove duplicates
            s.allVersions.sort((a: number, b: number) => b - a);
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const MAX_VERSIONS = 5;

// Create new secret
router.post('/', async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;
        const { name, ciphertext, salt, iv, metadata } = req.body;

        // 1. Check if a secret with this name already exists
        const queryCommand = new QueryCommand({
            TableName: USER_SECRETS_TABLE,
            KeyConditionExpression: 'user_id = :uid',
            FilterExpression: '#n = :name',
            ExpressionAttributeNames: {
                '#n': 'name'
            },
            ExpressionAttributeValues: {
                ':uid': email,
                ':name': name
            }
        });

        const queryResponse = await docClient.send(queryCommand);
        const existingItems = queryResponse.Items || [];

        let id: string;
        let version: number;

        if (existingItems.length > 0) {
            // Find the latest version
            const sorted = existingItems.sort((a, b) => b.version - a.version);
            const latest = sorted[0];
            id = latest.secret_id.split('#')[0];
            version = latest.version + 1;

            // Pruning: Keep only MAX_VERSIONS - 1 oldest, so new one makes it MAX_VERSIONS
            if (existingItems.length >= MAX_VERSIONS) {
                // Delete oldest versions
                const toDelete = sorted.slice(MAX_VERSIONS - 1);
                for (const item of toDelete) {
                    await docClient.send(new DeleteCommand({
                        TableName: USER_SECRETS_TABLE,
                        Key: {
                            user_id: email,
                            secret_id: item.secret_id
                        }
                    }));
                }
            }
        } else {
            id = uuidv4();
            version = 1;
        }

        const secretId = `${id}#${version}`;

        const newItem = {
            user_id: email,
            secret_id: secretId,
            version,
            name,
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

// Delete all versions of a secret
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;
        const { id } = req.params;

        // 1. Get all versions of this secret
        const queryCommand = new QueryCommand({
            TableName: USER_SECRETS_TABLE,
            KeyConditionExpression: 'user_id = :uid AND begins_with(secret_id, :sid)',
            ExpressionAttributeValues: {
                ':uid': email,
                ':sid': id + '#'
            }
        });

        const response = await docClient.send(queryCommand);
        const items = response.Items || [];

        if (items.length === 0) {
            return res.status(404).json({ error: 'Secret not found' });
        }

        // 2. Delete all versions
        for (const item of items) {
            await docClient.send(new DeleteCommand({
                TableName: USER_SECRETS_TABLE,
                Key: {
                    user_id: email,
                    secret_id: item.secret_id
                }
            }));
        }

        res.json({ message: 'Secret and all versions deleted' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
