import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { ddbClient, USERS_TABLE, USER_SECRETS_TABLE } from "../db";

const createUsersTable = async () => {
    try {
        await ddbClient.send(new CreateTableCommand({
            TableName: USERS_TABLE,
            KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
            AttributeDefinitions: [{ AttributeName: "email", AttributeType: "S" }],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
        }));
        console.log("Users table created");
    } catch (e: any) {
        if (e.name === 'ResourceInUseException') console.log("Users table already exists");
        else console.error(e);
    }
};

const createSecretsTable = async () => {
    try {
        await ddbClient.send(new CreateTableCommand({
            TableName: USER_SECRETS_TABLE,
            KeySchema: [
                { AttributeName: "user_id", KeyType: "HASH" },
                { AttributeName: "secret_id", KeyType: "RANGE" }
            ],
            AttributeDefinitions: [
                { AttributeName: "user_id", AttributeType: "S" },
                { AttributeName: "secret_id", AttributeType: "S" }
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
        }));
        console.log("Secrets table created");
    } catch (e: any) {
        if (e.name === 'ResourceInUseException') console.log("Secrets table already exists");
        else console.error(e);
    }
};

const run = async () => {
    await createUsersTable();
    await createSecretsTable();
};

run();
