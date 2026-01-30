"use client";

import { useEffect, useState } from 'react';
import type { Secret } from '@ssh-box/common';
import { decrypt, encrypt } from '@ssh-box/common';
import api from '../../lib/api';
import { db } from '../../lib/db';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const [secrets, setSecrets] = useState<Secret[]>([]);
    const [decryptedValue, setDecryptedValue] = useState<string | null>(null);
    const [masterPassword, setMasterPassword] = useState('');
    const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null);
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            // 0. Check if user is authenticated
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                router.push('/');
                return;
            }

            // 1. Load from local cache immediately
            const cached = await db.getAllSecrets();
            if (cached.length > 0) {
                setSecrets(cached);
            }

            // 2. Check if sync is needed (stale > 5 mins)
            const lastSync = localStorage.getItem('lastSync');
            const now = Date.now();
            const fiveMins = 5 * 60 * 1000;

            if (!lastSync || (now - parseInt(lastSync)) > fiveMins || cached.length === 0) {
                fetchSecrets();
            }
        };
        init();
    }, []);

    const fetchSecrets = async (force = false) => {
        try {
            const { data } = await api.get('/secrets');
            setSecrets(data);
            await db.saveSecrets(data);
            localStorage.setItem('lastSync', Date.now().toString());
            if (force) {
                alert('Secrets refreshed from server!');
            }
        } catch (err) {
            console.error('Failed to fetch from server:', err);
        }
    };

    const handleDecrypt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSecret || !masterPassword) return;

        try {
            const authTag = (selectedSecret.metadata as any)?.authTag;

            if (!authTag) {
                alert('Missing authTag in secret metadata. Cannot decrypt.');
                return;
            }

            const encryptedStr = [
                selectedSecret.salt,
                selectedSecret.iv,
                authTag,
                selectedSecret.ciphertext
            ].join(':');

            const plain = await decrypt(encryptedStr, masterPassword);
            setDecryptedValue(plain);
        } catch (err) {
            console.error(err);
            alert('Decryption failed. Wrong password?');
        }
    };

    const handleLogout = async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('lastSync');
        await db.clearAll();
        router.push('/');
    };

    const handleDelete = async (secret: Secret) => {
        if (!confirm(`Are you sure you want to delete "${secret.name}" and all its versions?`)) {
            return;
        }

        try {
            await api.delete(`/secrets/${secret.id}`);
            alert('Secret deleted successfully.');

            // Update local state and cache
            const updated = secrets.filter(s => s.id !== secret.id);
            setSecrets(updated);
            await db.saveSecrets(updated); // This will overwrite with the smaller list

            if (selectedSecret?.id === secret.id) {
                setSelectedSecret(null);
                setDecryptedValue(null);
                setMasterPassword('');
            }
        } catch (err: any) {
            console.error(err);
            alert(`Failed to delete: ${err.response?.data?.error || err.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-indigo-600">SSH Box</h1>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => fetchSecrets(true)}
                            className="bg-indigo-100 text-indigo-600 px-3 py-2 rounded-md hover:bg-indigo-200 transition-colors flex items-center space-x-1"
                            title="Refresh from server"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            <span>Refresh</span>
                        </button>
                        <button onClick={handleLogout} className="text-red-500 hover:text-red-700">Logout</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">List</h2>
                        <ul className="space-y-2">
                            {secrets.map((s) => (
                                <li
                                    key={s.id}
                                    className={`p-3 rounded cursor-pointer hover:bg-indigo-50 flex justify-between items-center group ${selectedSecret?.id === s.id ? 'bg-indigo-100 border-l-4 border-indigo-500' : ''}`}
                                    onClick={() => {
                                        setSelectedSecret(s);
                                        setDecryptedValue(null);
                                        setMasterPassword('');
                                    }}
                                >
                                    <div>
                                        <p className="font-medium">{s.name}</p>
                                        <p className="text-xs text-gray-500">v{s.version}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(s);
                                        }}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete secret"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {secrets.length === 0 && <p className="text-gray-500 mt-4">No secrets found. Use the CLI to add some!</p>}
                    </div>

                    <div className="md:col-span-2 bg-white shadow rounded-lg p-6">
                        {selectedSecret ? (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">{selectedSecret.name}</h2>
                                <div className="bg-gray-100 p-4 rounded mb-4 overflow-x-auto">
                                    <pre className="text-xs text-gray-600">{JSON.stringify(selectedSecret, null, 2)}</pre>
                                </div>

                                <h3 className="text-lg font-semibold mb-2">Decrypt</h3>
                                <form onSubmit={handleDecrypt} className="space-y-4">
                                    <div>
                                        <input
                                            type="password"
                                            placeholder="Master Encryption Password"
                                            className="w-full px-3 py-2 border rounded"
                                            value={masterPassword}
                                            onChange={e => setMasterPassword(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                                        Reveal Secret
                                    </button>
                                </form>

                                {decryptedValue && (
                                    <div className="mt-6">
                                        <h4 className="font-bold text-green-700 mb-2">Decrypted Content:</h4>
                                        <div className="bg-gray-900 text-green-400 p-4 rounded overflow-auto font-mono text-sm">
                                            {decryptedValue}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Add New Secret</h2>
                                <AddSecretForm onAdded={fetchSecrets} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AddSecretForm({ onAdded }: { onAdded: () => void }) {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !content || !password) {
            alert('Please fill all fields.');
            return;
        }

        setLoading(true);
        try {
            const encrypted = await encrypt(content, password);
            // encrypted format: salt:iv:authTag:ciphertext
            const [salt, iv, authTag, ciphertext] = encrypted.split(':');

            await api.post('/secrets', {
                name,
                ciphertext,
                salt,
                iv,
                metadata: { authTag },
            });
            alert('Secret added successfully!');
            setName('');
            setContent('');
            setPassword('');
            onAdded(); // This will refresh list and update IndexedDB
        } catch (err) {
            console.error(err);
            alert('Failed to add secret. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="secretName" className="block text-sm font-medium text-gray-700">Secret Name</label>
                <input
                    type="text"
                    id="secretName"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., my-api-key"
                    required
                />
            </div>
            <div>
                <label htmlFor="secretContent" className="block text-sm font-medium text-gray-700">Secret Content</label>
                <textarea
                    id="secretContent"
                    rows={5}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Enter the secret value here..."
                    required
                ></textarea>
            </div>
            <div>
                <label htmlFor="masterPassword" className="block text-sm font-medium text-gray-700">Master Encryption Password</label>
                <input
                    type="password"
                    id="masterPassword"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter a strong password to encrypt this secret"
                    required
                />
            </div>
            <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={loading}
            >
                {loading ? 'Adding Secret...' : 'Add Secret'}
            </button>
        </form>
    );
}
