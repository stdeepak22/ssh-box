import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, USERS_TABLE, USER_SECRETS_TABLE } from "../db";

const scanTable = async (tableName: string) => {
    console.log(`\n--- Scanning ${tableName} ---`);
    try {
        const res = await docClient.send(new ScanCommand({ TableName: tableName }));
        if (res.Items && res.Items.length > 0) {
            console.dir(res.Items, { depth: null });
        } else {
            console.log("No items found.");
        }
    } catch (err: any) {
        console.error(`Error scanning ${tableName}:`, err.message);
    }
};

const run = async () => {
    await scanTable(USERS_TABLE);
    await scanTable(USER_SECRETS_TABLE);
};

run();
