export interface TableType {
    pk: string;
    sk: string;
}

// USER#{email} | CRED
export interface DbUser extends TableType {
    passwordHash: string;
    has_mp: boolean;
    cAt: string;
}


// USER#{email} | SM#{key}
export interface DbSecretMetadata extends TableType {
    cv: number; // current version
    v: number[]; // all versions
    vc: number; // version count
    cAt: string;
    uAt?: string;
}

// USER#{email} | S#{key}#{version}
export interface DbSecret extends TableType {
    name: string;
    v: number;  // version
    ct: string; // encrypted content
    salt: string;
    iv: string;
    cAt: string;
}