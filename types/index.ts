// User types
export type UserRole = 'super_admin' | 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  is_admin: number; // SQLite uses 0/1 for boolean (keep for backward compatibility)
  role: UserRole;
  is_super_admin: number; // SQLite uses 0/1 for boolean
  managed_by: number | null;
  created_at: string;
}

export interface UserSession {
  userId: number;
  username: string;
  isAdmin: boolean; // Keep for backward compatibility
  role: UserRole;
}

// Site types
export interface Site {
  id: number;
  domain: string;
  user_id: number;
  username: string;
  container_id: string | null;
  template_type: 'static' | 'php' | 'node';
  code_path: string;
  status: string;
  folder_id: number | null;
  created_at: string;
}

export interface CreateSiteParams {
  domain: string;
  user_id: number;
  template_type: 'static' | 'php' | 'node';
  container_id?: string;
  code_path?: string;
  status?: string;
  folder_id?: number | null;
}

// Database types
export interface Database {
  id: number;
  name: string;
  container_id: string;
  postgres_port: number;
  created_at: string;
}

export interface CreateDatabaseParams {
  name: string;
  container_id: string;
  postgres_port: number;
}

// Permission types
export interface DatabasePermission {
  id: number;
  user_id: number;
  database_id: number;
  created_at: string;
}

// Folder types
export interface Folder {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

export interface FolderContainer {
  id: number;
  folder_id: number;
  container_id: string;
  created_at: string;
}

// Container types (from Docker)
export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  state: string;
  uptime: string;
  image: string;
  ports: string;
  labels?: { [key: string]: string };
}

export interface ContainerStats {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}
