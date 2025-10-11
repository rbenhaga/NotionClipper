/**
 * Utilitaires pour la migration vers l'API Notion 2025-09-03
 */
export interface DataSourceInfo {
    id: string;
    name: string;
    database_id: string;
}
export interface DatabaseWithDataSources {
    id: string;
    title: string;
    data_sources: DataSourceInfo[];
    default_data_source_id?: string;
}
/**
 * Convertit un parent database_id vers data_source_id si nécessaire
 */
export declare function migrateParentToDataSource(parent: {
    page_id: string;
} | {
    database_id: string;
} | {
    data_source_id: string;
}, databaseInfo?: DatabaseWithDataSources): {
    page_id: string;
} | {
    database_id: string;
} | {
    data_source_id: string;
};
/**
 * Vérifie si une page appartient à une database (avec support data_source_id)
 */
export declare function isDatabaseChild(page: any): boolean;
/**
 * Récupère l'ID du parent (database_id ou data_source_id)
 */
export declare function getParentId(page: any): string | null;
/**
 * Récupère le type de parent
 */
export declare function getParentType(page: any): 'database_id' | 'data_source_id' | 'page_id' | 'workspace' | null;
/**
 * Crée un objet parent compatible avec la nouvelle API
 */
export declare function createParent(type: 'page_id' | 'database_id' | 'data_source_id', id: string): {
    page_id: string;
} | {
    database_id: string;
} | {
    data_source_id: string;
};
/**
 * Extrait les informations de data source d'une réponse database
 */
export declare function extractDataSources(databaseResponse: any): DataSourceInfo[];
/**
 * Détermine le meilleur data_source_id à utiliser pour une database
 */
export declare function getPreferredDataSourceId(database: DatabaseWithDataSources): string | null;
//# sourceMappingURL=notion-migration.d.ts.map