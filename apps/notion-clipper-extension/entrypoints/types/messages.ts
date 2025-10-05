/**
 * Types pour les messages entre popup et background
 */

export interface BackgroundResponse<T = any> {
    success: boolean;
    error?: string;
    data?: T;
    [key: string]: any;
}

export interface ValidateTokenResponse {
    success: boolean;
    error?: string;
    message?: string;
}

export interface GetPagesResponse {
    success: boolean;
    error?: string;
    pages?: any[];
    count?: number;
}

export interface ToggleFavoriteResponse {
    success: boolean;
    error?: string;
    isFavorite?: boolean;
}

export interface GetFavoritesResponse {
    success: boolean;
    error?: string;
    favorites?: string[];
}

export interface SendToNotionResponse {
    success: boolean;
    error?: string;
    results?: Array<{
        pageId: string;
        success: boolean;
        error?: string;
    }>;
    successCount?: number;
    totalCount?: number;
    message?: string;
}

export interface SaveConfigResponse {
    success: boolean;
    error?: string;
    message?: string;
}

export interface RefreshPagesResponse {
    success: boolean;
    error?: string;
    pages?: any[];
    count?: number;
    message?: string;
}