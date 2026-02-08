export interface TableType {
    pk: string;
    sk: string;
}

// USER#{email} | CRED
export interface DbUser extends TableType {
    passwordHash: string;
    has_mp: boolean;
    createdAt: string;
}


// USER#{email} | SM#{key}
export interface DbSecretMetadata extends TableType {
    cv: number; // current version
    v: number[]; // all versions
    createdAt: string;
    updatedAt: string;
}

// USER#{email} | S#{key}#{version}
export interface DbSecret extends TableType {
    name: string;
    v: number;  // version
    ct: string; // encrypted content
    salt: string;
    iv: string;
    createdAt: string;
}