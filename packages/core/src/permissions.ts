export type PermissionName = 'read' | 'write';

export interface PermissionSet {
  readonly read: boolean;
  readonly write: boolean;
}

export type PermissionUpdate = Partial<PermissionSet>;

export interface NodePermissions {
  readonly users: Map<string, PermissionSet>;
  readonly groups: Map<string, PermissionSet>;
}

export function createNodePermissions(): NodePermissions {
  return {
    users: new Map(),
    groups: new Map(),
  };
}

export function normalizePermissions(update: PermissionUpdate): PermissionSet {
  return {
    read: update.read ?? false,
    write: update.write ?? false,
  };
}

export function clonePermissions(source: NodePermissions): NodePermissions {
  return {
    users: new Map(source.users),
    groups: new Map(source.groups),
  };
}
