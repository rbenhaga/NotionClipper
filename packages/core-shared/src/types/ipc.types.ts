// packages/core-shared/src/types/ipc.types.ts
export interface IPCResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface NotionTestConnectionResponse extends IPCResponse {
    data: {
        connected: boolean;
        user?: {
            id: string;
            name?: string;
        };
    };
}