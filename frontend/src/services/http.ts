export type ApiError = {
    code?: string;
    error?: string;
    email?: string;
};

export async function parseJsonOrNull(res: Response) {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

export async function throwIfNotOk(res: Response) {
    if (res.ok) return;
    const data = (await parseJsonOrNull(res)) as ApiError | null;
    throw (data ?? { error: `Request failed (${res.status})` }) as ApiError;
}