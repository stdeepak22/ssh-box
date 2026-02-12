import express from 'express';
import { queryByPkSkPrefix, TableNames, putItem, getItem, updateItem, deleteItem } from '../db';
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
        
        // version can be added only if name is there.
        if (ver) {
            sk = `${sk}${ver}`;
        }
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

    return resp;
}

// List all secrets (returns latest version of each)
router.get('/', async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;

        const secretMeta = await getKeysMetadata(email);

        const result = secretMeta.map(item=>{
            const {sk, cv, v, vc, cAt, uAt} = item;
            const secName = sk.split('#')[1];
            return {
                name: secName,
                version: `v${vc - v.indexOf(cv)}`,
                totalVersions: v.length,
                createdAt: cAt,
                updatedAt: uAt,
            };
        })
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

        const { v: existing_versions , vc} = item || { v: [], vc: 0 };


        const new_ver = Date.now();

        await putItem<DbSecret>({
            table: TableNames.Secret,
            item: {
                pk: getPk(email),
                sk: getSecretSk(name, new_ver),
                name: name,
                v: new_ver,
                ct,
                salt,
                iv,
                cAt: new Date().toISOString()
            }
        })
        if (existing_versions.length === 0) {
            await putItem<DbSecretMetadata>({
                table: TableNames.Secret,
                item: {
                    pk: getPk(email),
                    sk: getMetaSK(name),
                    cv: new_ver,
                    v: [new_ver],
                    vc: 1,
                    cAt: new Date().toISOString(),
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
                    'vc = :new_ver_count',
                    'updatedAt = :at'
                ],
                values: {
                    ':cv': new_ver,
                    ':new_ver': [new_ver, ...existing_versions].slice(0, 5),
                    ':new_ver_count': vc + 1,
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
        
        // no metadata found for given secret name
        if (!meta) {
            return res.status(404).json({ error: 'Secret not found' });
        }

        //if version specified
        if (version) {
            let num = Number(version)
            if(!Number.isNaN(num)){
                // as will use this as index to identify the secret's version
                num = Math.abs(num);
                if (meta.v.length > num){
                    version_stamp = meta.v[num];
                }
            }
        }
        else {
            version_stamp = meta.cv;
        }

        // couldn identify the version to pull
        if(version_stamp === -1) {
            return res.status(404).json()
        }


        const item = await getItem<DbSecret>({
            table: TableNames.Secret,
            pk: getPk(email),
            sk: getSecretSk(id, version_stamp)
        })

        if (item) {
            return res.json(item);
        }
        return res.status(500).json({ error: `Somethign went wrong, couldn't fetch given secret.` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


// Delete all versions of a secret
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const email = req.user!.email;
        const { id } = req.params;


        const meta = await getItem<DbSecretMetadata>({
            table: TableNames.Secret,
            pk: getPk(email),
            sk: getMetaSK(id),
        })

        if(!meta){
            return res.status(404).json({
                message: `No secret found with name "${id}"`
            })
        }

        if(meta && meta.v){
            const allPro: Promise<void>[] = [];
            meta.v.forEach(v=>{
                allPro.push(deleteItem({
                    table: TableNames.Secret,
                    pk: getPk(email),
                    sk: getSecretSk(id, v)
                }))
            })
            await Promise.all(allPro);
        }

        await deleteItem({
            table: TableNames.Secret,
            pk: getPk(email),
            sk: getMetaSK(id),
        })

        return res.json({ message: 'Secret and all versions deleted' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
