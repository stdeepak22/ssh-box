import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const endpoint = process.env.DYNAMODB_ENDPOINT;

export const ddbClient = new DynamoDBClient({
    region,
    ...(endpoint && { endpoint })
});

export const docClient = DynamoDBDocumentClient.from(ddbClient);
export const USERS_TABLE = process.env.USERS_TABLE || 'Users';
export const USER_SECRETS_TABLE = process.env.USER_SECRETS_TABLE || 'UserSecrets';
