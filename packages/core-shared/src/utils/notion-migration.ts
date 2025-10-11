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
export function migrateParentToDataSource(
  parent: { page_id: string } | { database_id: string } | { data_source_id: string },
  databaseInfo?: DatabaseWithDataSources
): { page_id: string } | { database_id: string } | { data_source_id: string } {
  
  // Si c'est déjà un data_source_id ou page_id, pas de migration nécessaire
  if ('data_source_id' in parent || 'page_id' in parent) {
    return parent;
  }

  // Si c'est un database_id et qu'on a les infos de data source
  if ('database_id' in parent && databaseInfo?.default_data_source_id) {
    return {
      data_source_id: databaseInfo.default_data_source_id
    };
  }

  // Sinon, garder tel quel
  return parent;
}

/**
 * Vérifie si une page appartient à une database (avec support data_source_id)
 */
export function isDatabaseChild(page: any): boolean {
  return page?.parent?.type === 'database_id' || 
         page?.parent?.type === 'data_source_id' ||
         page?.parent?.database_id ||
         page?.parent?.data_source_id;
}

/**
 * Récupère l'ID du parent (database_id ou data_source_id)
 */
export function getParentId(page: any): string | null {
  return page?.parent?.database_id || 
         page?.parent?.data_source_id || 
         page?.parent?.page_id || 
         null;
}

/**
 * Récupère le type de parent
 */
export function getParentType(page: any): 'database_id' | 'data_source_id' | 'page_id' | 'workspace' | null {
  return page?.parent?.type || null;
}

/**
 * Crée un objet parent compatible avec la nouvelle API
 */
export function createParent(
  type: 'page_id' | 'database_id' | 'data_source_id',
  id: string
): { page_id: string } | { database_id: string } | { data_source_id: string } {
  switch (type) {
    case 'page_id':
      return { page_id: id };
    case 'database_id':
      return { database_id: id };
    case 'data_source_id':
      return { data_source_id: id };
    default:
      throw new Error(`Unsupported parent type: ${type}`);
  }
}

/**
 * Extrait les informations de data source d'une réponse database
 */
export function extractDataSources(databaseResponse: any): DataSourceInfo[] {
  if (!databaseResponse?.data_sources) {
    return [];
  }

  return databaseResponse.data_sources.map((ds: any) => ({
    id: ds.id,
    name: ds.name,
    database_id: databaseResponse.id
  }));
}

/**
 * Détermine le meilleur data_source_id à utiliser pour une database
 */
export function getPreferredDataSourceId(database: DatabaseWithDataSources): string | null {
  if (!database.data_sources || database.data_sources.length === 0) {
    return null;
  }

  // Utiliser le default si défini
  if (database.default_data_source_id) {
    return database.default_data_source_id;
  }

  // Sinon, utiliser le premier
  return database.data_sources[0].id;
}