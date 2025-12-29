'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PlaidMetadata {
    institution?: {
        institution_id: string;
        name: string;
    } | null;
    accounts?: Array<{
        id: string;
        name: string;
        type: string;
        subtype: string;
    }>;
    link_session_id?: string;
}

export default function PlaidLink() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [shouldOpen, setShouldOpen] = useState(false);
    const router = useRouter();

    const onSuccess = useCallback((public_token: string, metadata: PlaidMetadata) => {
        void (async () => {
            try {
            const response = await fetch('/api/plaid/exchange-public-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    public_token,
                    metadata,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error('Failed to exchange token');
            }

            if (data.duplicate) {
                toast.info('This bank account is already linked.');
            } else {
                toast.success('Bank account linked successfully!');
            }

            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error('Failed to link bank account');
        }
        })();
    }, [router]);

    const config: Parameters<typeof usePlaidLink>[0] = {
        token,
        onSuccess,
    };

    const { open, ready } = usePlaidLink(config);

    useEffect(() => {
        if (token && ready && shouldOpen) {
            open();
            setShouldOpen(false);
            setLoading(false);
        }
    }, [token, ready, shouldOpen, open]);

    const startLink = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/plaid/create-link-token', {
                method: 'POST',
            });
            if (!response.ok) {
                const text = await response.text();
                console.error('Failed to create link token:', text);
                toast.error('Failed to initialize Plaid');
                setLoading(false);
                return;
            }
            const data = await response.json() as { link_token: string };
            setToken(data.link_token);
            setShouldOpen(true);
        } catch (error) {
            console.error('Error creating link token:', error);
            toast.error('Error connecting to server');
            setLoading(false);
        }
    };

    return (
        <Button onClick={startLink} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Bank Account'}
        </Button>
    );
}
