// User types
export interface User {
  id: number;
  username: string;
  password_hash: string;
  is_admin: number; // SQLite uses 0/1 for boolean
  created_at: string;
}

export interface UserSession {
  userId: number;
  username: string;
  isAdmin: boolean;
}

// Site types
export interface Site {
  id: number;
  domain: string;
  container_id: string;
  user_id: number;
  template_type: 'static' | 'php' | 'node';
  code_path: string;
  status: string;
  created_at: string;
}

export interface CreateSiteParams {
  domain: string;
  container_id: string;
  user_id: number;
  template_type: 'static' | 'php' | 'node';
  code_path: string;
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

// Container types (from Docker)
export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  state: string;
  uptime: string;
  image: string;
  ports: string;
}

export interface ContainerStats {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}
