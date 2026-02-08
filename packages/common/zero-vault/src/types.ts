import { EncryptionParts } from '@ssh-box/common_types';

interface ReWrapDEKWithNew {
    success: boolean;
    message?: string;
    parts?: EncryptionParts;
}
export { EncryptionParts, ReWrapDEKWithNew }