import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, BatchGetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DYNAMODB_ENDPOINT;

export const ddbClient = new DynamoDBClient({
    region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy"
    },
    ...(endpoint && { endpoint })
});

export const docClient = DynamoDBDocumentClient.from(ddbClient);
export const USERS_TABLE = process.env.USERS_TABLE || 'Users';
export const USER_SECRETS_TABLE = process.env.USER_SECRETS_TABLE || 'UserSecrets';


export enum TableNames {
    Account,
    Secret
}

const getTableName = (table: TableNames) => {
    switch(table){
        case TableNames.Account:
            return USERS_TABLE;
        case TableNames.Secret:
            return USER_SECRETS_TABLE;
    }
}

interface PkSk {
    pk: string,
    sk: string,
}

interface getItemArg extends PkSk {
    table: TableNames,
} 

interface batchGetItemsArg {
    batchRequest: {
        table: TableNames,
        keys: PkSk[]
    } []
}

interface batchGetItemsOutput<T> {
    batchResponse: {
        table: TableNames,
        items: T[]
    } []
} 

interface putItemArg {
    table: TableNames,
    item: PkSk & {[key: string]: any}
}

interface queryItemArg {
    table: TableNames,
    pk: string,
    sk_prefix?: string,
    limit?: number
}

interface updateItemArgs extends PkSk {
    table: TableNames,
    expressions: string[]
    values: {
        [key:string]: any
    }
}


export type { PkSk, getItemArg, batchGetItemsArg, putItemArg, queryItemArg, updateItemArgs }

export const getItem = async <T = unknown>(args: getItemArg) => {
    const {table, pk, sk} = args;
    const res = await docClient.send(new GetCommand({
        TableName: getTableName(table),
        Key: {pk, sk}
    }));
    return res.Item as T;
}

export const batchGetItems = async<T = unknown>(args: batchGetItemsArg): Promise<batchGetItemsOutput<T>> => {
    const { batchRequest } = args;
    const reqItems: {
        [key:string]: {
            Keys: PkSk[]
        }
    } = {};

    batchRequest.forEach(c=> {
        const {table, keys: Keys } = c;
        reqItems[getTableName(table)] = {Keys}
    })

    const batchResp = await docClient.send(new BatchGetCommand({
        RequestItems: reqItems
    }));

    const res: {table:TableNames, items: T[]}[] = [];
    batchRequest.forEach(({table}) => {
        const tableName = getTableName(table);
        res.push({
            table: table,
            items: (batchResp.Responses?.[tableName] || []).map(c=>c as T)
        })
    })

    return {
        batchResponse: res
    };
}

export const putItem = async (args: putItemArg) => {
    const {table, item} = args;
    docClient.send(new PutCommand({
        TableName: getTableName(table),
        Item: item
    }));
}

export const updateItem = async (args: updateItemArgs) => {
    const {table, pk, sk, expressions, values} = args;
    const cnt = Object.keys(values).length;
    if(expressions.length === 0 || cnt === 0 ){
        throw new Error('We must have expressions, and values to update.')
    }
    if(expressions.length !== cnt ){
        throw new Error('We should have same count of expressions, and values.')
    }

    const query = `SET ${expressions.join(', ')}`;

    await docClient.send(new UpdateCommand({
        TableName: getTableName(table),
        Key: { pk, sk },
        UpdateExpression: query,
        ExpressionAttributeValues: values
    }));
}

export const queryByPkSkPrefix = async <T = unknown>(args: queryItemArg): Promise<T[]> => {
    const {table, pk, sk_prefix, limit} = args;
    let expression = `pk = :pk `;
    const attrValue: any = {
        ":pk": pk,
    };
    if(sk_prefix){
        expression = `${expression} AND begins_with(sk, :sk_prefix)`;
        attrValue[":sk_prefix"] = sk_prefix;
    }

    const cmd = new QueryCommand({
        TableName: getTableName(table),
        KeyConditionExpression: expression,
        ExpressionAttributeValues: attrValue,
        Limit: limit
    })
    const queryRes = await docClient.send(cmd);
    return (queryRes.Items||[]).map(c=>c as T)
}
