/**
 * AgentOS Studio - Files API Routes
 * GET /api/studio/files - Read file content
 * POST /api/studio/files - Write file content
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  VirtualFile,
  FileOperationResult,
  StudioApiResponse,
  UUID,
} from '@/types/studio';

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

// ============================================
// In-Memory Storage
// ============================================

const files = new Map<UUID, VirtualFile>();
let initialized = false;

function initializeMockData(): void {
  if (initialized) return;

  const now = new Date().toISOString();

  // Create some default directories and files
  const mockFiles: VirtualFile[] = [
    {
      id: 'dir-packs',
      path: '/packs',
      name: 'packs',
      extension: '',
      content: '',
      size: 0,
      mime_type: 'inode/directory',
      is_directory: true,
      parent_id: null,
      children: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'dir-exports',
      path: '/exports',
      name: 'exports',
      extension: '',
      content: '',
      size: 0,
      mime_type: 'inode/directory',
      is_directory: true,
      parent_id: null,
      children: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'dir-imports',
      path: '/imports',
      name: 'imports',
      extension: '',
      content: '',
      size: 0,
      mime_type: 'inode/directory',
      is_directory: true,
      parent_id: null,
      children: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'file-readme',
      path: '/README.md',
      name: 'README.md',
      extension: 'md',
      content: '# AgentOS Studio\n\nWelcome to the Agent Studio file system.\n',
      size: 50,
      mime_type: 'text/markdown',
      is_directory: false,
      parent_id: null,
      created_at: now,
      updated_at: now,
    },
  ];

  mockFiles.forEach(file => files.set(file.id, file));
  initialized = true;
}

// ============================================
// Utility Functions
// ============================================

function generateId(): UUID {
  return crypto.randomUUID();
}

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function getMimeType(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream';
}

function validatePath(path: string): string[] {
  const errors: string[] = [];

  if (!path) {
    errors.push('Path is required');
  } else if (!path.startsWith('/')) {
    errors.push('Path must start with /');
  } else if (path.includes('..')) {
    errors.push('Path cannot contain ".."');
  } else if (path.includes('//')) {
    errors.push('Path cannot contain consecutive slashes');
  }

  return errors;
}

// ============================================
// GET Handler - Read File
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<StudioApiResponse<VirtualFile | VirtualFile[]>>> {
  initializeMockData();

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const id = searchParams.get('id');
    const listDir = searchParams.get('list') === 'true';

    if (!path && !id) {
      // Return file tree
      if (listDir) {
        const rootFiles = Array.from(files.values()).filter(f => f.parent_id === null);
        return NextResponse.json({
          success: true,
          data: rootFiles,
          meta: {
            request_id: generateId(),
          },
        });
      }

      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either path or id is required',
          },
        },
        { status: 400 }
      );
    }

    let file: VirtualFile | undefined;

    if (id) {
      file = files.get(id);
    } else if (path) {
      const pathErrors = validatePath(path);
      if (pathErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid path',
              details: { errors: pathErrors },
            },
          },
          { status: 400 }
        );
      }
      file = Array.from(files.values()).find(f => f.path === path);
    }

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `File not found: ${path || id}`,
          },
        },
        { status: 404 }
      );
    }

    // If it's a directory and list is requested, return children
    if (file.is_directory && listDir) {
      const children = Array.from(files.values()).filter(f => f.parent_id === file!.id);
      return NextResponse.json({
        success: true,
        data: children,
        meta: {
          request_id: generateId(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: file,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error reading file:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to read file',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST Handler - Write File
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<StudioApiResponse<VirtualFile>>> {
  initializeMockData();

  try {
    const body = await request.json();
    const { path, content, is_directory = false, overwrite = false } = body as {
      path: string;
      content?: string;
      is_directory?: boolean;
      overwrite?: boolean;
    };

    // Validate path
    const pathErrors = validatePath(path);
    if (pathErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid path',
            details: { errors: pathErrors },
          },
        },
        { status: 400 }
      );
    }

    // Check if file exists
    const existingFile = Array.from(files.values()).find(f => f.path === path);
    if (existingFile && !overwrite) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'FILE_EXISTS',
            message: `File already exists at path: ${path}. Use overwrite=true to replace.`,
          },
        },
        { status: 409 }
      );
    }

    // Get parent directory
    const pathParts = path.split('/').filter(Boolean);
    const fileName = pathParts.pop() || 'untitled';
    const parentPath = '/' + pathParts.join('/');
    let parentId: UUID | null = null;

    if (pathParts.length > 0) {
      const parentDir = Array.from(files.values()).find(
        f => f.path === parentPath && f.is_directory
      );
      if (!parentDir) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'PARENT_NOT_FOUND',
              message: `Parent directory not found: ${parentPath}`,
            },
          },
          { status: 404 }
        );
      }
      parentId = parentDir.id;
    }

    const now = new Date().toISOString();
    const extension = is_directory ? '' : getExtension(fileName);
    const fileContent = content || '';

    const newFile: VirtualFile = {
      id: existingFile?.id || generateId(),
      path,
      name: fileName,
      extension,
      content: is_directory ? '' : fileContent,
      size: is_directory ? 0 : new Blob([fileContent]).size,
      mime_type: is_directory ? 'inode/directory' : getMimeType(extension),
      is_directory,
      parent_id: parentId,
      children: is_directory ? [] : undefined,
      created_at: existingFile?.created_at || now,
      updated_at: now,
    };

    files.set(newFile.id, newFile);

    return NextResponse.json(
      {
        success: true,
        data: newFile,
        meta: {
          request_id: generateId(),
        },
      },
      { status: existingFile ? 200 : 201 }
    );
  } catch (error) {
    console.error('[API] Error writing file:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to write file',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE Handler - Delete File
// ============================================

export async function DELETE(request: NextRequest): Promise<NextResponse<StudioApiResponse<void>>> {
  initializeMockData();

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const id = searchParams.get('id');
    const recursive = searchParams.get('recursive') === 'true';

    if (!path && !id) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either path or id is required',
          },
        },
        { status: 400 }
      );
    }

    let file: VirtualFile | undefined;

    if (id) {
      file = files.get(id);
    } else if (path) {
      const pathErrors = validatePath(path);
      if (pathErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid path',
              details: { errors: pathErrors },
            },
          },
          { status: 400 }
        );
      }
      file = Array.from(files.values()).find(f => f.path === path);
    }

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `File not found: ${path || id}`,
          },
        },
        { status: 404 }
      );
    }

    // Check if directory has children
    if (file.is_directory) {
      const children = Array.from(files.values()).filter(f => f.parent_id === file!.id);
      if (children.length > 0 && !recursive) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'DIRECTORY_NOT_EMPTY',
              message: 'Directory is not empty. Use recursive=true to delete with contents.',
            },
          },
          { status: 409 }
        );
      }

      // Delete children recursively
      if (recursive) {
        const deleteRecursive = (parentId: UUID) => {
          const childFiles = Array.from(files.values()).filter(f => f.parent_id === parentId);
          childFiles.forEach(child => {
            if (child.is_directory) {
              deleteRecursive(child.id);
            }
            files.delete(child.id);
          });
        };
        deleteRecursive(file.id);
      }
    }

    files.delete(file.id);

    return NextResponse.json({
      success: true,
      data: undefined,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error deleting file:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete file',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT Handler - Rename/Move File
// ============================================

export async function PUT(request: NextRequest): Promise<NextResponse<StudioApiResponse<VirtualFile>>> {
  initializeMockData();

  try {
    const body = await request.json();
    const { id, new_path, new_name } = body as {
      id: string;
      new_path?: string;
      new_name?: string;
    };

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'id is required',
          },
        },
        { status: 400 }
      );
    }

    const file = files.get(id);
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `File not found: ${id}`,
          },
        },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let updatedFile = { ...file };

    if (new_name) {
      const pathParts = file.path.split('/');
      pathParts[pathParts.length - 1] = new_name;
      const newPath = pathParts.join('/');

      // Check for conflicts
      const existingFile = Array.from(files.values()).find(
        f => f.path === newPath && f.id !== id
      );
      if (existingFile) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'FILE_EXISTS',
              message: `A file already exists at path: ${newPath}`,
            },
          },
          { status: 409 }
        );
      }

      const extension = file.is_directory ? '' : getExtension(new_name);
      updatedFile = {
        ...updatedFile,
        name: new_name,
        path: newPath,
        extension,
        mime_type: file.is_directory ? file.mime_type : getMimeType(extension),
        updated_at: now,
      };
    }

    if (new_path) {
      const pathErrors = validatePath(new_path);
      if (pathErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid new_path',
              details: { errors: pathErrors },
            },
          },
          { status: 400 }
        );
      }

      // Check for conflicts
      const existingFile = Array.from(files.values()).find(
        f => f.path === new_path && f.id !== id
      );
      if (existingFile) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'FILE_EXISTS',
              message: `A file already exists at path: ${new_path}`,
            },
          },
          { status: 409 }
        );
      }

      // Get new parent
      const pathParts = new_path.split('/').filter(Boolean);
      pathParts.pop();
      const parentPath = '/' + pathParts.join('/');
      let newParentId: UUID | null = null;

      if (pathParts.length > 0) {
        const parentDir = Array.from(files.values()).find(
          f => f.path === parentPath && f.is_directory
        );
        if (!parentDir) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              error: {
                code: 'PARENT_NOT_FOUND',
                message: `Parent directory not found: ${parentPath}`,
              },
            },
            { status: 404 }
          );
        }
        newParentId = parentDir.id;
      }

      updatedFile = {
        ...updatedFile,
        path: new_path,
        parent_id: newParentId,
        updated_at: now,
      };
    }

    files.set(id, updatedFile);

    return NextResponse.json({
      success: true,
      data: updatedFile,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error updating file:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update file',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
