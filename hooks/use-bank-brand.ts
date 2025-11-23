import useSWR from 'swr';

export function useBankBrand(bankId: string | null) {
    const { data, error } = useSWR(
        bankId ? `/api/bank/${bankId}` : null,
        (url) => fetch(url).then((r) => r.json())
    );

    // successResponse returns the data directly, not wrapped
    const brand = data || null;

    return { brand, loading: !error && !data, error };
}
