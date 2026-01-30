export function resolveVersion(versionStr: string, allVersions: number[]): number | null {
    if (!versionStr) return allVersions[0]; // default to latest

    const val = parseInt(versionStr);
    if (isNaN(val)) return null;

    // Handle relative versioning: 0 (latest), -1 (previous), -2 (prev-prev)
    if (val <= 0) {
        const index = Math.abs(val);
        if (index >= allVersions.length) return null;
        return allVersions[index];
    }

    // Handle absolute versioning: 1, 2, 3
    return val;
}

export function parseNameAndVersion(input: string): { name: string, versionStr: string | null } {
    const atIndex = input.lastIndexOf('@');
    if (atIndex === -1) return { name: input, versionStr: null };

    const name = input.substring(0, atIndex);
    const versionStr = input.substring(atIndex + 1);
    return { name, versionStr };
}
