/**
 * AgentOS Studio - File System Operations
 * Simulated file system for browser-based file operations
 */

import type {
  VirtualFile,
  FileOperationResult,
  FileTreeNode,
  ExportData,
  UUID,
  Timestamp,
} from '@/types/studio';
import { studioStorage } from './storage';

// ============================================
// MIME Type Mappings
// ============================================

const MIME_TYPES: Record<string, string> = {
  yaml: 'application/x-yaml',
  yml: 'application/x-yaml',
  json: 'application/json',
  md: 'text/markdown',
  txt: 'text/plain',
  ts: 'text/typescript',
  js: 'text/javascript',
  html: 'text/html',
  css: 'text/css',
};

const EXTENSION_MAP: Record<string, string> = {
  'application/x-yaml': 'yaml',
  'application/json': 'json',
  'text/markdown': 'md',
  'text/plain': 'txt',
};

// ============================================
// Helper Functions
// ============================================

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function getMimeType(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream';
}

function generateId(): UUID {
  return crypto.randomUUID();
}

function getTimestamp(): Timestamp {
  return new Date().toISOString();
}

// ============================================
// Virtual File System Class
// ============================================

class VirtualFileSystem {
  private files: Map<UUID, VirtualFile>;
  private storageKey = 'studio_virtual_fs';

  constructor() {
    this.files = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = studioStorage.get<VirtualFile[]>(this.storageKey);
      if (stored) {
        stored.forEach((file) => this.files.set(file.id, file));
      }
    } catch {
      // Start with empty file system
    }
  }

  private saveToStorage(): void {
    studioStorage.set(this.storageKey, Array.from(this.files.values()));
  }

  // ============================================
  // File Operations
  // ============================================

  createFile(
    path: string,
    content: string,
    parentId?: UUID
  ): FileOperationResult & { file?: VirtualFile } {
    const name = path.split('/').pop() || 'untitled';
    const extension = getExtension(name);

    // Check for existing file at path
    const existing = Array.from(this.files.values()).find((f) => f.path === path);
    if (existing) {
      return {
        success: false,
        path,
        error: `File already exists at path: ${path}`,
      };
    }

    const file: VirtualFile = {
      id: generateId(),
      path,
      name,
      extension,
      content,
      size: new Blob([content]).size,
      mime_type: getMimeType(extension),
      is_directory: false,
      parent_id: parentId || null,
      created_at: getTimestamp(),
      updated_at: getTimestamp(),
    };

    this.files.set(file.id, file);
    this.saveToStorage();

    return { success: true, path, file };
  }

  createDirectory(
    path: string,
    parentId?: UUID
  ): FileOperationResult & { file?: VirtualFile } {
    const name = path.split('/').pop() || 'untitled';

    const existing = Array.from(this.files.values()).find((f) => f.path === path);
    if (existing) {
      return {
        success: false,
        path,
        error: `Directory already exists at path: ${path}`,
      };
    }

    const dir: VirtualFile = {
      id: generateId(),
      path,
      name,
      extension: '',
      content: '',
      size: 0,
      mime_type: 'inode/directory',
      is_directory: true,
      parent_id: parentId || null,
      children: [],
      created_at: getTimestamp(),
      updated_at: getTimestamp(),
    };

    this.files.set(dir.id, dir);
    this.saveToStorage();

    return { success: true, path, file: dir };
  }

  readFile(id: UUID): VirtualFile | null {
    return this.files.get(id) || null;
  }

  readFileByPath(path: string): VirtualFile | null {
    return Array.from(this.files.values()).find((f) => f.path === path) || null;
  }

  updateFile(id: UUID, content: string): FileOperationResult {
    const file = this.files.get(id);
    if (!file) {
      return {
        success: false,
        path: '',
        error: `File not found: ${id}`,
      };
    }

    if (file.is_directory) {
      return {
        success: false,
        path: file.path,
        error: 'Cannot update content of a directory',
      };
    }

    const updatedFile: VirtualFile = {
      ...file,
      content,
      size: new Blob([content]).size,
      updated_at: getTimestamp(),
    };

    this.files.set(id, updatedFile);
    this.saveToStorage();

    return { success: true, path: file.path };
  }

  renameFile(id: UUID, newName: string): FileOperationResult {
    const file = this.files.get(id);
    if (!file) {
      return {
        success: false,
        path: '',
        error: `File not found: ${id}`,
      };
    }

    const pathParts = file.path.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');

    const existing = Array.from(this.files.values()).find(
      (f) => f.path === newPath && f.id !== id
    );
    if (existing) {
      return {
        success: false,
        path: file.path,
        error: `A file already exists at path: ${newPath}`,
      };
    }

    const extension = getExtension(newName);
    const updatedFile: VirtualFile = {
      ...file,
      name: newName,
      path: newPath,
      extension: file.is_directory ? '' : extension,
      mime_type: file.is_directory ? file.mime_type : getMimeType(extension),
      updated_at: getTimestamp(),
    };

    this.files.set(id, updatedFile);
    this.saveToStorage();

    return { success: true, path: newPath };
  }

  deleteFile(id: UUID): FileOperationResult {
    const file = this.files.get(id);
    if (!file) {
      return {
        success: false,
        path: '',
        error: `File not found: ${id}`,
      };
    }

    // If directory, delete children first
    if (file.is_directory) {
      const children = Array.from(this.files.values()).filter(
        (f) => f.parent_id === id
      );
      children.forEach((child) => this.deleteFile(child.id));
    }

    this.files.delete(id);
    this.saveToStorage();

    return { success: true, path: file.path };
  }

  moveFile(id: UUID, newParentId: UUID | null, newPath: string): FileOperationResult {
    const file = this.files.get(id);
    if (!file) {
      return {
        success: false,
        path: '',
        error: `File not found: ${id}`,
      };
    }

    if (newParentId) {
      const parent = this.files.get(newParentId);
      if (!parent || !parent.is_directory) {
        return {
          success: false,
          path: file.path,
          error: 'Target parent is not a directory',
        };
      }
    }

    const updatedFile: VirtualFile = {
      ...file,
      path: newPath,
      parent_id: newParentId,
      updated_at: getTimestamp(),
    };

    this.files.set(id, updatedFile);
    this.saveToStorage();

    return { success: true, path: newPath };
  }

  copyFile(id: UUID, newPath: string): FileOperationResult & { file?: VirtualFile } {
    const file = this.files.get(id);
    if (!file) {
      return {
        success: false,
        path: '',
        error: `File not found: ${id}`,
      };
    }

    if (file.is_directory) {
      return {
        success: false,
        path: file.path,
        error: 'Cannot copy directories',
      };
    }

    return this.createFile(newPath, file.content, file.parent_id);
  }

  // ============================================
  // Directory Operations
  // ============================================

  listDirectory(parentId?: UUID): VirtualFile[] {
    return Array.from(this.files.values()).filter(
      (f) => f.parent_id === (parentId || null)
    );
  }

  getFileTree(rootPath: string = '/'): FileTreeNode[] {
    const buildTree = (parentId: UUID | null, basePath: string): FileTreeNode[] => {
      const children = this.listDirectory(parentId || undefined);

      return children
        .filter((f) => f.path.startsWith(basePath))
        .map((file) => ({
          id: file.id,
          name: file.name,
          path: file.path,
          type: file.is_directory ? 'directory' : 'file',
          expanded: false,
          children: file.is_directory
            ? buildTree(file.id, file.path)
            : undefined,
          metadata: {
            size: file.size,
            modified: file.updated_at,
          },
        }))
        .sort((a, b) => {
          // Directories first, then alphabetically
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
    };

    return buildTree(null, rootPath);
  }

  // ============================================
  // Import/Export Operations
  // ============================================

  async importFromBrowser(): Promise<FileOperationResult & { files?: VirtualFile[] }> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve({
          success: false,
          path: '',
          error: 'File import is only available in browser environment',
        });
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.yaml,.yml,.json,.md,.txt';

      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        const fileList = target.files;

        if (!fileList || fileList.length === 0) {
          resolve({ success: false, path: '', error: 'No files selected' });
          return;
        }

        const importedFiles: VirtualFile[] = [];

        for (let i = 0; i < fileList.length; i++) {
          const browserFile = fileList[i];
          const content = await browserFile.text();

          const result = this.createFile(`/imports/${browserFile.name}`, content);
          if (result.success && result.file) {
            importedFiles.push(result.file);
          }
        }

        resolve({
          success: true,
          path: '/imports',
          files: importedFiles,
        });
      };

      input.click();
    });
  }

  exportToDownload(id: UUID, filename?: string): FileOperationResult {
    if (typeof window === 'undefined') {
      return {
        success: false,
        path: '',
        error: 'File export is only available in browser environment',
      };
    }

    const file = this.files.get(id);
    if (!file) {
      return {
        success: false,
        path: '',
        error: `File not found: ${id}`,
      };
    }

    if (file.is_directory) {
      return {
        success: false,
        path: file.path,
        error: 'Cannot export directories directly',
      };
    }

    const blob = new Blob([file.content], { type: file.mime_type });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, path: file.path };
  }

  exportDataToDownload(data: ExportData, filename: string): FileOperationResult {
    if (typeof window === 'undefined') {
      return {
        success: false,
        path: '',
        error: 'File export is only available in browser environment',
      };
    }

    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, path: filename };
  }

  // ============================================
  // Utility Operations
  // ============================================

  exists(path: string): boolean {
    return Array.from(this.files.values()).some((f) => f.path === path);
  }

  getSize(id: UUID): number {
    const file = this.files.get(id);
    if (!file) return 0;

    if (file.is_directory) {
      const children = Array.from(this.files.values()).filter(
        (f) => f.path.startsWith(file.path) && f.id !== id
      );
      return children.reduce((sum, f) => sum + f.size, 0);
    }

    return file.size;
  }

  search(query: string, options?: { extension?: string; inContent?: boolean }): VirtualFile[] {
    const loweredQuery = query.toLowerCase();

    return Array.from(this.files.values()).filter((file) => {
      if (file.is_directory) return false;

      if (options?.extension && file.extension !== options.extension) {
        return false;
      }

      const nameMatch = file.name.toLowerCase().includes(loweredQuery);
      const contentMatch =
        options?.inContent && file.content.toLowerCase().includes(loweredQuery);

      return nameMatch || contentMatch;
    });
  }

  clear(): void {
    this.files.clear();
    this.saveToStorage();
  }

  getStats(): {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
    byExtension: Record<string, number>;
  } {
    const files = Array.from(this.files.values());
    const byExtension: Record<string, number> = {};

    files.forEach((file) => {
      if (!file.is_directory && file.extension) {
        byExtension[file.extension] = (byExtension[file.extension] || 0) + 1;
      }
    });

    return {
      totalFiles: files.filter((f) => !f.is_directory).length,
      totalDirectories: files.filter((f) => f.is_directory).length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      byExtension,
    };
  }
}

// Export singleton instance
export const virtualFileSystem = new VirtualFileSystem();
export type { VirtualFileSystem };
