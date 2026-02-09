import express from 'express';
import { queryByPkSkPrefix, TableNames, PkSk, batchGetItems, putItem, getItem, updateItem } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { addSecretLimiter } from '../middleware/rate-limiter';
import { DbSecretMetadata, DbSecret } from '@ssh-box/common_types';


const router = express.Router();


router.use(authenticateToken);


const getPk = (email: string) => `USER#${email}`
const getMetaSK = (name?: string) => {
    let sk = `SM#`
    if (name) {
        sk = `${sk}${name}`;
    }
    return sk;
}
const getSecretSk = (name?: string, ver?: number) => {
    let sk = "S#";
    if (name) {
        sk = `${sk}${name}#`;
    }
    if (ver) {
        sk = `${sk}${ver}`;
    }
    return sk;
}

//const getSk = (name: string, ver: number) => `S#${name}#${ver}`;



const getKeysMetadata = async (email: string) => {
    const pk = getPk(email);
    const resp = await queryByPkSkPrefix<DbSecretMetadata>({
        table: TableNames.Secret,
        pk,
        sk_prefix: getMetaSK()
    })

    const secretKeysWithVersion: {
        keys: PkSk[],
        versions: {
            [key: string]: number[]
        },
    } = { keys: [], versions: {} };

    resp.forEach((item) => {
        const key = item.sk.split('#')[1]
        secretKeysWithVersion.keys.push({
            pk,
            sk: getSecretSk(key, item.cv),
        })
        secretKeysWithVersion.versions[key] = item.v
    })
    console.log('secretKeysWithVersion', secretKeysWithVersion)
    return secretKeysWithVersion;
}

// List all secrets (returns latest version of each)
router.get('/', async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;

        const { keys, versions } = await getKeysMetadata(email);
        let items: DbSecret[] = [];
        if (keys.length) {
            const batchResp = await batchGetItems<DbSecret>({
                batchRequest: [{
                    table: TableNames.Secret,
                    keys: keys
                }]
            })
            items = batchResp.batchResponse[0]?.items || items;
        }


        const result: any[] = [];
        items.forEach((item: DbSecret) => {
            const { name, v, ct, salt, iv, createdAt } = item;
            const idx = versions[name].indexOf(v);

            result.push({
                name,
                ct,
                salt,
                iv,
                createdAt,
                version: idx,
                versionCount: versions[name].length
            });
        });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const MAX_VERSIONS = 5;

// Create new secret
router.post('/', addSecretLimiter, async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;
        const { name, ct, salt, iv } = req.body;

        // check if key already exists
        const item = await getItem<DbSecretMetadata>({
            table: TableNames.Secret,
            pk: getPk(email),
            sk: getMetaSK(name)
        });

        const { v: existing_versions } = item || { v: [] };


        const new_ver = Date.now();

        await putItem({
            table: TableNames.Secret,
            item: {
                pk: getPk(email),
                sk: getSecretSk(name, new_ver),
                name: name,
                v: new_ver,
                ct,
                salt,
                iv,
                created_at: new Date().toISOString()
            }
        })
        if (existing_versions.length === 0) {
            await putItem({
                table: TableNames.Secret,
                item: {
                    pk: getPk(email),
                    sk: getMetaSK(name),
                    cv: new_ver,
                    v: [new_ver],
                    createdAt: new Date().toISOString()
                }
            })
        }
        else {
            await updateItem({
                table: TableNames.Secret,
                pk: getPk(email),
                sk: getMetaSK(name),
                expressions: [
                    'cv = :cv',
                    'v = :new_ver',
                    'updatedAt = :at'
                ],
                values: {
                    ':cv': new_ver,
                    ':new_ver': [new_ver, ...existing_versions].slice(0, 5),
                    ':at': new Date().toISOString()
                }
            })
        }

        res.status(201).json({ pk: getPk(email), sk: getSecretSk(name, new_ver) });
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
        let version_stamp: number = -1;

        const meta = await getItem<DbSecretMetadata>({
            table: TableNames.Secret,
            pk: getPk(email),
            sk: getMetaSK(id)
        })

        if (meta) {
            if (version) {
                version_stamp = meta.v.indexOf(+version);
            }
            else {
                version_stamp = meta.cv;
            }
            const item = await getItem<DbSecret>({
                table: TableNames.Secret,
                pk: getPk(email),
                sk: getSecretSk(id, version_stamp)
            })

            if (item) {
                return res.json(item);
            }
        }
        return res.status(404).json({ error: 'Secret not found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// // Delete all versions of a secret
// router.delete('/:id', async (req: AuthRequest, res) => {
//     try {
//         const email = req.user!.email;
//         const { id } = req.params;

//         // 1. Get all versions of this secret
//         const queryCommand = new QueryCommand({
//             TableName: USER_SECRETS_TABLE,
//             KeyConditionExpression: 'user_id = :uid AND begins_with(secret_id, :sid)',
//             ExpressionAttributeValues: {
//                 ':uid': email,
//                 ':sid': id + '#'
//             }
//         });

//         const response = await docClient.send(queryCommand);
//         const items = response.Items || [];

//         if (items.length === 0) {
//             return res.status(404).json({ error: 'Secret not found' });
//         }

//         // 2. Delete all versions
//         for (const item of items) {
//             await docClient.send(new DeleteCommand({
//                 TableName: USER_SECRETS_TABLE,
//                 Key: {
//                     user_id: email,
//                     secret_id: item.secret_id
//                 }
//             }));
//         }

//         res.json({ message: 'Secret and all versions deleted' });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });

export default router;
