/**
 * object_store.ts
 * Base interface for object storage implementations
 * Supports local filesystem, S3-compatible, and Supabase storage backends
 */

import { Readable, Writable } from 'stream';

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Metadata associated with a stored object
 */
export interface ObjectMetadata {
  /** Content type (MIME) */
  contentType: string;

  /** Size in bytes */
  size: number;

  /** Entity tag for cache validation */
  etag: string;

  /** SHA256 checksum of content */
  checksum?: string;

  /** Last modified timestamp (ISO 8601) */
  lastModified: string;

  /** Creation timestamp (ISO 8601) */
  createdAt?: string;

  /** Custom user metadata */
  customMetadata?: Record<string, string>;

  /** Content encoding (e.g., 'gzip') */
  contentEncoding?: string;

  /** Cache control header */
  cacheControl?: string;

  /** Content disposition */
  contentDisposition?: string;

  /** Storage class (provider-specific) */
  storageClass?: string;

  /** Version ID (if versioning enabled) */
  versionId?: string;
}

/**
 * A stored object with content and metadata
 */
export interface StorageObject<T = Buffer | string> {
  /** Unique key identifying the object */
  key: string;

  /** Object content */
  content: T;

  /** Object metadata */
  metadata: ObjectMetadata;
}

/**
 * Options for put operations
 */
export interface PutOptions {
  /** Content type (defaults to application/octet-stream) */
  contentType?: string;

  /** Custom metadata */
  metadata?: Record<string, string>;

  /** Enable compression */
  compress?: boolean;

  /** Cache control header */
  cacheControl?: string;

  /** Content disposition */
  contentDisposition?: string;

  /** ACL for the object (provider-specific) */
  acl?: 'private' | 'public-read' | 'public-read-write';

  /** Storage class (provider-specific) */
  storageClass?: string;

  /** Conditional write: only if key doesn't exist */
  ifNoneMatch?: boolean;

  /** Conditional write: only if etag matches */
  ifMatch?: string;

  /** TTL in seconds (if supported) */
  ttl?: number;
}

/**
 * Options for get operations
 */
export interface GetOptions {
  /** Get specific version */
  versionId?: string;

  /** Conditional get: only if modified since */
  ifModifiedSince?: string;

  /** Conditional get: only if etag doesn't match */
  ifNoneMatch?: string;

  /** Range request (bytes) */
  range?: { start: number; end?: number };

  /** Auto-decompress if compressed */
  decompress?: boolean;
}

/**
 * Options for list operations
 */
export interface ListOptions {
  /** List objects with this prefix */
  prefix?: string;

  /** Delimiter for directory-like listing */
  delimiter?: string;

  /** Maximum number of objects to return */
  limit?: number;

  /** Continuation token for pagination */
  cursor?: string;

  /** Include version information */
  includeVersions?: boolean;
}

/**
 * Result of a list operation
 */
export interface ListResult {
  /** Objects matching the query */
  objects: (ObjectMetadata & { key: string })[];

  /** Common prefixes (directories) if delimiter specified */
  prefixes?: string[];

  /** Continuation token for next page */
  cursor?: string;

  /** Whether there are more results */
  hasMore: boolean;

  /** Total count (if available) */
  totalCount?: number;
}

/**
 * Options for delete operations
 */
export interface DeleteOptions {
  /** Delete specific version */
  versionId?: string;

  /** Bypass governance retention (if supported) */
  bypassGovernance?: boolean;
}

/**
 * Options for copy operations
 */
export interface CopyOptions {
  /** New metadata for destination */
  metadata?: Record<string, string>;

  /** Content type for destination */
  contentType?: string;

  /** ACL for destination */
  acl?: 'private' | 'public-read' | 'public-read-write';

  /** Only copy if source etag matches */
  ifMatch?: string;
}

/**
 * Streaming options
 */
export interface StreamOptions {
  /** High water mark for stream buffer */
  highWaterMark?: number;

  /** Content type for upload streams */
  contentType?: string;

  /** Custom metadata for upload streams */
  metadata?: Record<string, string>;
}

/**
 * Pre-signed URL options
 */
export interface SignedUrlOptions {
  /** Expiration time in seconds */
  expiresIn: number;

  /** HTTP method (GET for download, PUT for upload) */
  method?: 'GET' | 'PUT';

  /** Content type (required for PUT) */
  contentType?: string;

  /** Response headers to set */
  responseHeaders?: {
    contentType?: string;
    contentDisposition?: string;
    cacheControl?: string;
  };
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Total number of objects */
  objectCount: number;

  /** Total size in bytes */
  totalSize: number;

  /** Size by content type */
  sizeByType?: Record<string, number>;

  /** Last modified timestamp */
  lastModified?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Storage-specific error codes
 */
export type StorageErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_KEY'
  | 'INVALID_CONTENT'
  | 'CHECKSUM_MISMATCH'
  | 'PRECONDITION_FAILED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

/**
 * Storage operation error
 */
export class StorageError extends Error {
  public readonly code: StorageErrorCode;
  public readonly key?: string;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: StorageErrorCode,
    options?: {
      key?: string;
      details?: Record<string, unknown>;
      retryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.key = options?.key;
    this.details = options?.details;
    this.retryable = options?.retryable ?? false;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

// ============================================================================
// OBJECT STORE INTERFACE
// ============================================================================

/**
 * Base interface for object storage implementations
 */
export interface ObjectStore {
  /** Storage provider name */
  readonly provider: string;

  /** Bucket or container name */
  readonly bucket: string;

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Store an object
   */
  put(
    key: string,
    content: Buffer | string | Readable,
    options?: PutOptions
  ): Promise<ObjectMetadata>;

  /**
   * Retrieve an object
   */
  get(key: string, options?: GetOptions): Promise<StorageObject | null>;

  /**
   * Delete an object
   */
  delete(key: string, options?: DeleteOptions): Promise<boolean>;

  /**
   * List objects
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Check if object exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get object metadata without content
   */
  getMetadata(key: string): Promise<ObjectMetadata | null>;

  // --------------------------------------------------------------------------
  // Streaming Operations
  // --------------------------------------------------------------------------

  /**
   * Create a readable stream for an object
   */
  createReadStream(key: string, options?: GetOptions): Promise<Readable | null>;

  /**
   * Create a writable stream for uploading
   */
  createWriteStream(key: string, options?: StreamOptions): Promise<{
    stream: Writable;
    promise: Promise<ObjectMetadata>;
  }>;

  // --------------------------------------------------------------------------
  // Batch Operations
  // --------------------------------------------------------------------------

  /**
   * Delete multiple objects
   */
  deleteMany(keys: string[]): Promise<{ deleted: string[]; errors: { key: string; error: Error }[] }>;

  /**
   * Copy an object
   */
  copy(sourceKey: string, destinationKey: string, options?: CopyOptions): Promise<ObjectMetadata>;

  /**
   * Move an object (copy + delete)
   */
  move(sourceKey: string, destinationKey: string, options?: CopyOptions): Promise<ObjectMetadata>;

  // --------------------------------------------------------------------------
  // URL Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a pre-signed URL for direct access
   */
  getSignedUrl(key: string, options: SignedUrlOptions): Promise<string>;

  /**
   * Get public URL (if object is public)
   */
  getPublicUrl(key: string): string | null;

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /**
   * Get storage statistics
   */
  getStats(prefix?: string): Promise<StorageStats>;

  /**
   * Verify object integrity
   */
  verifyChecksum(key: string, expectedChecksum: string): Promise<boolean>;
}

// ============================================================================
// ABSTRACT BASE CLASS
// ============================================================================

/**
 * Abstract base class with common functionality
 */
export abstract class BaseObjectStore implements ObjectStore {
  abstract readonly provider: string;
  abstract readonly bucket: string;

  abstract put(
    key: string,
    content: Buffer | string | Readable,
    options?: PutOptions
  ): Promise<ObjectMetadata>;

  abstract get(key: string, options?: GetOptions): Promise<StorageObject | null>;

  abstract delete(key: string, options?: DeleteOptions): Promise<boolean>;

  abstract list(options?: ListOptions): Promise<ListResult>;

  abstract exists(key: string): Promise<boolean>;

  abstract getMetadata(key: string): Promise<ObjectMetadata | null>;

  abstract createReadStream(key: string, options?: GetOptions): Promise<Readable | null>;

  abstract createWriteStream(key: string, options?: StreamOptions): Promise<{
    stream: Writable;
    promise: Promise<ObjectMetadata>;
  }>;

  abstract getSignedUrl(key: string, options: SignedUrlOptions): Promise<string>;

  /**
   * Delete multiple objects (default implementation)
   */
  async deleteMany(keys: string[]): Promise<{ deleted: string[]; errors: { key: string; error: Error }[] }> {
    const deleted: string[] = [];
    const errors: { key: string; error: Error }[] = [];

    await Promise.all(
      keys.map(async (key) => {
        try {
          const success = await this.delete(key);
          if (success) {
            deleted.push(key);
          }
        } catch (error) {
          errors.push({ key, error: error as Error });
        }
      })
    );

    return { deleted, errors };
  }

  /**
   * Copy an object (default implementation)
   */
  async copy(
    sourceKey: string,
    destinationKey: string,
    options?: CopyOptions
  ): Promise<ObjectMetadata> {
    const source = await this.get(sourceKey);
    if (!source) {
      throw new StorageError(`Source object not found: ${sourceKey}`, 'NOT_FOUND', {
        key: sourceKey
      });
    }

    return this.put(destinationKey, source.content as Buffer, {
      contentType: options?.contentType ?? source.metadata.contentType,
      metadata: options?.metadata ?? source.metadata.customMetadata,
      acl: options?.acl
    });
  }

  /**
   * Move an object (default implementation)
   */
  async move(
    sourceKey: string,
    destinationKey: string,
    options?: CopyOptions
  ): Promise<ObjectMetadata> {
    const metadata = await this.copy(sourceKey, destinationKey, options);
    await this.delete(sourceKey);
    return metadata;
  }

  /**
   * Get public URL (default: null, override in implementations)
   */
  getPublicUrl(_key: string): string | null {
    return null;
  }

  /**
   * Get storage statistics (default implementation)
   */
  async getStats(prefix?: string): Promise<StorageStats> {
    let objectCount = 0;
    let totalSize = 0;
    let lastModified: string | undefined;
    let cursor: string | undefined;

    do {
      const result = await this.list({ prefix, cursor, limit: 1000 });
      objectCount += result.objects.length;

      for (const obj of result.objects) {
        totalSize += obj.size;
        if (!lastModified || obj.lastModified > lastModified) {
          lastModified = obj.lastModified;
        }
      }

      cursor = result.cursor;
    } while (cursor);

    return { objectCount, totalSize, lastModified };
  }

  /**
   * Verify object checksum
   */
  async verifyChecksum(key: string, expectedChecksum: string): Promise<boolean> {
    const metadata = await this.getMetadata(key);
    if (!metadata?.checksum) {
      return false;
    }
    return metadata.checksum === expectedChecksum;
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  /**
   * Validate object key
   */
  protected validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new StorageError('Invalid key: must be a non-empty string', 'INVALID_KEY', { key });
    }

    if (key.length > 1024) {
      throw new StorageError('Invalid key: exceeds maximum length of 1024', 'INVALID_KEY', { key });
    }

    // Check for invalid characters
    if (/[\x00-\x1f\x7f]/.test(key)) {
      throw new StorageError('Invalid key: contains control characters', 'INVALID_KEY', { key });
    }
  }

  /**
   * Normalize key (remove leading/trailing slashes, collapse multiple slashes)
   */
  protected normalizeKey(key: string): string {
    return key
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/\/+/g, '/');
  }

  /**
   * Detect content type from key or content
   */
  protected detectContentType(key: string, content?: Buffer): string {
    const ext = key.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      // Text
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      xml: 'application/xml',
      csv: 'text/csv',
      md: 'text/markdown',
      yaml: 'application/x-yaml',
      yml: 'application/x-yaml',

      // Images
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      webp: 'image/webp',
      ico: 'image/x-icon',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

      // Archives
      zip: 'application/zip',
      gz: 'application/gzip',
      tar: 'application/x-tar',

      // Audio/Video
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      webm: 'video/webm',

      // Fonts
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf'
    };

    if (ext && mimeTypes[ext]) {
      return mimeTypes[ext];
    }

    // Try magic number detection for common formats
    if (content && content.length >= 4) {
      if (content[0] === 0x89 && content[1] === 0x50 && content[2] === 0x4e && content[3] === 0x47) {
        return 'image/png';
      }
      if (content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
        return 'image/jpeg';
      }
      if (content[0] === 0x47 && content[1] === 0x49 && content[2] === 0x46) {
        return 'image/gif';
      }
      if (content[0] === 0x25 && content[1] === 0x50 && content[2] === 0x44 && content[3] === 0x46) {
        return 'application/pdf';
      }
      if (content[0] === 0x1f && content[1] === 0x8b) {
        return 'application/gzip';
      }
    }

    return 'application/octet-stream';
  }

  /**
   * Calculate ETag from content
   */
  protected calculateEtag(content: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Calculate SHA256 checksum
   */
  protected calculateChecksum(content: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert readable stream to buffer
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Create readable stream from buffer or string
 */
export function bufferToStream(content: Buffer | string): Readable {
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  return Readable.from(buffer);
}

/**
 * Parse content range header
 */
export function parseContentRange(range: string): { start: number; end: number; total: number } | null {
  const match = range.match(/bytes (\d+)-(\d+)\/(\d+|\*)/);
  if (!match) return null;

  return {
    start: parseInt(match[1], 10),
    end: parseInt(match[2], 10),
    total: match[3] === '*' ? -1 : parseInt(match[3], 10)
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(2)} ${units[i]}`;
}

// ============================================================================
// LOCAL FILESYSTEM STORE
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';

/**
 * Local filesystem storage configuration
 */
export interface LocalFSConfig {
  /** Base directory for storage */
  basePath: string;

  /** Enable compression for stored files */
  compress?: boolean;

  /** Compression level (1-9) */
  compressionLevel?: number;

  /** Create directories automatically */
  autoCreateDirs?: boolean;

  /** File permissions (octal) */
  fileMode?: number;

  /** Directory permissions (octal) */
  dirMode?: number;

  /** Enable file locking */
  useLocking?: boolean;

  /** Lock timeout in milliseconds */
  lockTimeout?: number;

  /** Calculate checksums on write */
  calculateChecksums?: boolean;

  /** Use temp files for atomic writes */
  atomicWrites?: boolean;
}

/**
 * File lock entry
 */
interface FileLock {
  key: string;
  holder: string;
  acquired: number;
  expires: number;
}

/**
 * Stored file metadata (persisted alongside content)
 */
interface StoredMetadata {
  contentType: string;
  size: number;
  originalSize?: number;
  etag: string;
  checksum?: string;
  compressed: boolean;
  createdAt: string;
  lastModified: string;
  customMetadata?: Record<string, string>;
  cacheControl?: string;
  contentDisposition?: string;
}

/**
 * Local filesystem object store implementation
 */
export class LocalFSStore extends BaseObjectStore {
  readonly provider = 'local-fs';
  readonly bucket: string;

  private config: Required<LocalFSConfig>;
  private locks: Map<string, FileLock> = new Map();
  private lockCleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: LocalFSConfig) {
    super();

    this.config = {
      basePath: path.resolve(config.basePath),
      compress: config.compress ?? false,
      compressionLevel: config.compressionLevel ?? 6,
      autoCreateDirs: config.autoCreateDirs ?? true,
      fileMode: config.fileMode ?? 0o644,
      dirMode: config.dirMode ?? 0o755,
      useLocking: config.useLocking ?? true,
      lockTimeout: config.lockTimeout ?? 30000,
      calculateChecksums: config.calculateChecksums ?? true,
      atomicWrites: config.atomicWrites ?? true
    };

    this.bucket = path.basename(this.config.basePath);

    // Ensure base directory exists
    if (this.config.autoCreateDirs) {
      this.ensureDir(this.config.basePath);
    }

    // Start lock cleanup
    if (this.config.useLocking) {
      this.startLockCleanup();
    }
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Store an object to the filesystem
   */
  async put(
    key: string,
    content: Buffer | string | Readable,
    options?: PutOptions
  ): Promise<ObjectMetadata> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);
    const filePath = this.getFilePath(normalizedKey);
    const metaPath = this.getMetaPath(normalizedKey);

    // Acquire lock if enabled
    const lockId = this.config.useLocking ? await this.acquireLock(normalizedKey) : null;

    try {
      // Convert to buffer
      let buffer: Buffer;
      if (content instanceof Readable) {
        buffer = await streamToBuffer(content);
      } else if (typeof content === 'string') {
        buffer = Buffer.from(content, 'utf-8');
      } else {
        buffer = content;
      }

      // Check preconditions
      if (options?.ifNoneMatch) {
        const exists = await this.exists(normalizedKey);
        if (exists) {
          throw new StorageError('Object already exists', 'PRECONDITION_FAILED', {
            key: normalizedKey
          });
        }
      }

      if (options?.ifMatch) {
        const existingMeta = await this.getMetadata(normalizedKey);
        if (!existingMeta || existingMeta.etag !== options.ifMatch) {
          throw new StorageError('ETag mismatch', 'PRECONDITION_FAILED', {
            key: normalizedKey
          });
        }
      }

      const contentType = options?.contentType ?? this.detectContentType(normalizedKey, buffer);
      const originalSize = buffer.length;

      // Compress if requested
      const shouldCompress = options?.compress ?? this.config.compress;
      let finalBuffer = buffer;
      if (shouldCompress) {
        finalBuffer = zlib.gzipSync(buffer, { level: this.config.compressionLevel });
      }

      const checksum = this.config.calculateChecksums ? this.calculateChecksum(buffer) : undefined;
      const etag = this.calculateEtag(finalBuffer);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (this.config.autoCreateDirs) {
        this.ensureDir(dir);
      }

      // Write file (atomic if enabled)
      if (this.config.atomicWrites) {
        await this.atomicWrite(filePath, finalBuffer);
      } else {
        await fs.promises.writeFile(filePath, finalBuffer, { mode: this.config.fileMode });
      }

      // Set file permissions
      await fs.promises.chmod(filePath, this.config.fileMode);

      // Build and write metadata
      const now = new Date().toISOString();
      const storedMeta: StoredMetadata = {
        contentType,
        size: finalBuffer.length,
        originalSize: shouldCompress ? originalSize : undefined,
        etag,
        checksum,
        compressed: shouldCompress,
        createdAt: now,
        lastModified: now,
        customMetadata: options?.metadata,
        cacheControl: options?.cacheControl,
        contentDisposition: options?.contentDisposition
      };

      await fs.promises.writeFile(metaPath, JSON.stringify(storedMeta, null, 2), {
        mode: this.config.fileMode
      });

      return {
        contentType,
        size: originalSize,
        etag,
        checksum,
        lastModified: now,
        createdAt: now,
        customMetadata: options?.metadata,
        contentEncoding: shouldCompress ? 'gzip' : undefined,
        cacheControl: options?.cacheControl,
        contentDisposition: options?.contentDisposition
      };
    } finally {
      if (lockId) {
        await this.releaseLock(normalizedKey, lockId);
      }
    }
  }

  /**
   * Retrieve an object from the filesystem
   */
  async get(key: string, options?: GetOptions): Promise<StorageObject | null> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);
    const filePath = this.getFilePath(normalizedKey);
    const metaPath = this.getMetaPath(normalizedKey);

    // Check if file exists
    if (!await this.fileExists(filePath)) {
      return null;
    }

    // Read metadata
    let storedMeta: StoredMetadata;
    try {
      const metaContent = await fs.promises.readFile(metaPath, 'utf-8');
      storedMeta = JSON.parse(metaContent);
    } catch {
      // No metadata file, create basic metadata
      const stats = await fs.promises.stat(filePath);
      storedMeta = {
        contentType: this.detectContentType(normalizedKey),
        size: stats.size,
        etag: '',
        compressed: false,
        createdAt: stats.birthtime.toISOString(),
        lastModified: stats.mtime.toISOString()
      };
    }

    // Conditional get
    if (options?.ifModifiedSince) {
      const modifiedDate = new Date(storedMeta.lastModified);
      const sinceDate = new Date(options.ifModifiedSince);
      if (modifiedDate <= sinceDate) {
        return null;
      }
    }

    if (options?.ifNoneMatch && storedMeta.etag === options.ifNoneMatch) {
      return null;
    }

    // Read content
    let content: Buffer;
    if (options?.range) {
      const fd = await fs.promises.open(filePath, 'r');
      try {
        const size = options.range.end !== undefined
          ? options.range.end - options.range.start + 1
          : storedMeta.size - options.range.start;
        content = Buffer.alloc(size);
        await fd.read(content, 0, size, options.range.start);
      } finally {
        await fd.close();
      }
    } else {
      content = await fs.promises.readFile(filePath);
    }

    // Decompress if needed
    if (storedMeta.compressed && (options?.decompress !== false)) {
      content = zlib.gunzipSync(content);
    }

    const metadata: ObjectMetadata = {
      contentType: storedMeta.contentType,
      size: storedMeta.originalSize ?? storedMeta.size,
      etag: storedMeta.etag,
      checksum: storedMeta.checksum,
      lastModified: storedMeta.lastModified,
      createdAt: storedMeta.createdAt,
      customMetadata: storedMeta.customMetadata,
      contentEncoding: storedMeta.compressed ? 'gzip' : undefined,
      cacheControl: storedMeta.cacheControl,
      contentDisposition: storedMeta.contentDisposition
    };

    return { key: normalizedKey, content, metadata };
  }

  /**
   * Delete an object from the filesystem
   */
  async delete(key: string, _options?: DeleteOptions): Promise<boolean> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);
    const filePath = this.getFilePath(normalizedKey);
    const metaPath = this.getMetaPath(normalizedKey);

    const lockId = this.config.useLocking ? await this.acquireLock(normalizedKey) : null;

    try {
      // Delete data file
      try {
        await fs.promises.unlink(filePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
        return false;
      }

      // Delete metadata file
      try {
        await fs.promises.unlink(metaPath);
      } catch {
        // Ignore missing metadata
      }

      // Clean up empty directories
      await this.cleanupEmptyDirs(path.dirname(filePath));

      return true;
    } finally {
      if (lockId) {
        await this.releaseLock(normalizedKey, lockId);
      }
    }
  }

  /**
   * List objects in the filesystem
   */
  async list(options?: ListOptions): Promise<ListResult> {
    const prefix = options?.prefix ?? '';
    const delimiter = options?.delimiter;
    const limit = options?.limit ?? 1000;
    const offset = options?.cursor ? parseInt(options.cursor, 10) : 0;

    const searchPath = path.join(this.config.basePath, prefix);
    const objects: (ObjectMetadata & { key: string })[] = [];
    const prefixesSet = new Set<string>();

    await this.walkDirectory(
      this.config.basePath,
      async (filePath: string, stats: fs.Stats) => {
        // Skip metadata files
        if (filePath.endsWith('.meta.json')) return;

        const relativePath = path.relative(this.config.basePath, filePath);
        const key = relativePath.replace(/\\/g, '/');

        // Check prefix
        if (prefix && !key.startsWith(prefix)) return;

        // Handle delimiter
        if (delimiter) {
          const afterPrefix = key.slice(prefix.length);
          const delimiterIndex = afterPrefix.indexOf(delimiter);
          if (delimiterIndex !== -1) {
            prefixesSet.add(prefix + afterPrefix.slice(0, delimiterIndex + 1));
            return;
          }
        }

        // Get metadata
        const metadata = await this.getMetadata(key);
        if (metadata) {
          objects.push({ key, ...metadata });
        }
      }
    );

    // Sort by last modified
    objects.sort((a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    // Apply pagination
    const paginatedObjects = objects.slice(offset, offset + limit);
    const hasMore = objects.length > offset + limit;

    return {
      objects: paginatedObjects,
      prefixes: delimiter ? Array.from(prefixesSet) : undefined,
      cursor: hasMore ? String(offset + limit) : undefined,
      hasMore
    };
  }

  /**
   * Check if object exists
   */
  async exists(key: string): Promise<boolean> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);
    const filePath = this.getFilePath(normalizedKey);
    return this.fileExists(filePath);
  }

  /**
   * Get object metadata
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);
    const filePath = this.getFilePath(normalizedKey);
    const metaPath = this.getMetaPath(normalizedKey);

    if (!await this.fileExists(filePath)) {
      return null;
    }

    try {
      const metaContent = await fs.promises.readFile(metaPath, 'utf-8');
      const storedMeta: StoredMetadata = JSON.parse(metaContent);

      return {
        contentType: storedMeta.contentType,
        size: storedMeta.originalSize ?? storedMeta.size,
        etag: storedMeta.etag,
        checksum: storedMeta.checksum,
        lastModified: storedMeta.lastModified,
        createdAt: storedMeta.createdAt,
        customMetadata: storedMeta.customMetadata,
        contentEncoding: storedMeta.compressed ? 'gzip' : undefined,
        cacheControl: storedMeta.cacheControl,
        contentDisposition: storedMeta.contentDisposition
      };
    } catch {
      // Fall back to file stats
      const stats = await fs.promises.stat(filePath);
      return {
        contentType: this.detectContentType(normalizedKey),
        size: stats.size,
        etag: '',
        lastModified: stats.mtime.toISOString(),
        createdAt: stats.birthtime.toISOString()
      };
    }
  }

  // --------------------------------------------------------------------------
  // Streaming Operations
  // --------------------------------------------------------------------------

  /**
   * Create a readable stream
   */
  async createReadStream(key: string, options?: GetOptions): Promise<Readable | null> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);
    const filePath = this.getFilePath(normalizedKey);
    const metaPath = this.getMetaPath(normalizedKey);

    if (!await this.fileExists(filePath)) {
      return null;
    }

    const readOptions: { start?: number; end?: number } = {};
    if (options?.range) {
      readOptions.start = options.range.start;
      if (options.range.end !== undefined) {
        readOptions.end = options.range.end;
      }
    }

    let stream: Readable = fs.createReadStream(filePath, readOptions);

    // Check if decompression needed
    if (options?.decompress !== false) {
      try {
        const metaContent = await fs.promises.readFile(metaPath, 'utf-8');
        const storedMeta: StoredMetadata = JSON.parse(metaContent);
        if (storedMeta.compressed) {
          stream = stream.pipe(zlib.createGunzip());
        }
      } catch {
        // No metadata, assume uncompressed
      }
    }

    return stream;
  }

  /**
   * Create a writable stream
   */
  async createWriteStream(key: string, options?: StreamOptions): Promise<{
    stream: Writable;
    promise: Promise<ObjectMetadata>;
  }> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);
    const filePath = this.getFilePath(normalizedKey);
    const metaPath = this.getMetaPath(normalizedKey);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (this.config.autoCreateDirs) {
      this.ensureDir(dir);
    }

    const tempPath = this.config.atomicWrites
      ? `${filePath}.${Date.now()}.tmp`
      : filePath;

    const writeStream = fs.createWriteStream(tempPath, {
      mode: this.config.fileMode,
      highWaterMark: options?.highWaterMark
    });

    let finalStream: Writable = writeStream;
    if (this.config.compress) {
      const gzip = zlib.createGzip({ level: this.config.compressionLevel });
      gzip.pipe(writeStream);
      finalStream = gzip;
    }

    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    passthrough.pipe(finalStream);

    const promise = new Promise<ObjectMetadata>((resolve, reject) => {
      writeStream.on('finish', async () => {
        try {
          // Move temp file to final location
          if (this.config.atomicWrites) {
            await fs.promises.rename(tempPath, filePath);
          }

          const buffer = Buffer.concat(chunks);
          const stats = await fs.promises.stat(filePath);
          const contentType = options?.contentType ?? this.detectContentType(normalizedKey);
          const checksum = this.config.calculateChecksums
            ? this.calculateChecksum(buffer)
            : undefined;
          const etag = this.calculateEtag(buffer);

          const now = new Date().toISOString();
          const storedMeta: StoredMetadata = {
            contentType,
            size: stats.size,
            originalSize: this.config.compress ? buffer.length : undefined,
            etag,
            checksum,
            compressed: this.config.compress,
            createdAt: now,
            lastModified: now,
            customMetadata: options?.metadata
          };

          await fs.promises.writeFile(metaPath, JSON.stringify(storedMeta, null, 2), {
            mode: this.config.fileMode
          });

          resolve({
            contentType,
            size: buffer.length,
            etag,
            checksum,
            lastModified: now,
            createdAt: now,
            customMetadata: options?.metadata
          });
        } catch (error) {
          reject(error);
        }
      });

      writeStream.on('error', async (error) => {
        // Clean up temp file on error
        if (this.config.atomicWrites) {
          try {
            await fs.promises.unlink(tempPath);
          } catch {
            // Ignore cleanup errors
          }
        }
        reject(error);
      });
    });

    return { stream: passthrough, promise };
  }

  // --------------------------------------------------------------------------
  // URL Generation (not applicable for local storage)
  // --------------------------------------------------------------------------

  /**
   * Generate a signed URL (returns file:// URL for local)
   */
  async getSignedUrl(key: string, _options: SignedUrlOptions): Promise<string> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);
    const filePath = this.getFilePath(normalizedKey);
    return `file://${filePath}`;
  }

  /**
   * Get public URL (returns file:// URL for local)
   */
  getPublicUrl(key: string): string {
    const normalizedKey = this.normalizeKey(key);
    const filePath = this.getFilePath(normalizedKey);
    return `file://${filePath}`;
  }

  // --------------------------------------------------------------------------
  // File Locking
  // --------------------------------------------------------------------------

  /**
   * Acquire a lock on a key
   */
  private async acquireLock(key: string): Promise<string> {
    const lockId = crypto.randomBytes(16).toString('hex');
    const maxWait = this.config.lockTimeout;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const existingLock = this.locks.get(key);

      if (!existingLock || existingLock.expires < Date.now()) {
        const lock: FileLock = {
          key,
          holder: lockId,
          acquired: Date.now(),
          expires: Date.now() + this.config.lockTimeout
        };
        this.locks.set(key, lock);
        return lockId;
      }

      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    throw new StorageError(
      `Failed to acquire lock for key: ${key}`,
      'TIMEOUT',
      { key }
    );
  }

  /**
   * Release a lock
   */
  private async releaseLock(key: string, lockId: string): Promise<void> {
    const lock = this.locks.get(key);
    if (lock && lock.holder === lockId) {
      this.locks.delete(key);
    }
  }

  /**
   * Start lock cleanup interval
   */
  private startLockCleanup(): void {
    this.lockCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, lock] of this.locks) {
        if (lock.expires < now) {
          this.locks.delete(key);
        }
      }
    }, 10000);
  }

  /**
   * Stop lock cleanup
   */
  stopLockCleanup(): void {
    if (this.lockCleanupInterval) {
      clearInterval(this.lockCleanupInterval);
      this.lockCleanupInterval = null;
    }
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  /**
   * Get file path for a key
   */
  private getFilePath(key: string): string {
    return path.join(this.config.basePath, key);
  }

  /**
   * Get metadata path for a key
   */
  private getMetaPath(key: string): string {
    return path.join(this.config.basePath, `${key}.meta.json`);
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists
   */
  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: this.config.dirMode });
    }
  }

  /**
   * Atomic write using temp file
   */
  private async atomicWrite(filePath: string, content: Buffer): Promise<void> {
    const tempPath = `${filePath}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;

    try {
      await fs.promises.writeFile(tempPath, content, { mode: this.config.fileMode });
      await fs.promises.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Walk directory recursively
   */
  private async walkDirectory(
    dir: string,
    callback: (filePath: string, stats: fs.Stats) => Promise<void>
  ): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, callback);
        } else if (entry.isFile()) {
          const stats = await fs.promises.stat(fullPath);
          await callback(fullPath, stats);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  /**
   * Clean up empty directories
   */
  private async cleanupEmptyDirs(dir: string): Promise<void> {
    // Don't delete base directory
    if (dir === this.config.basePath) return;

    try {
      const entries = await fs.promises.readdir(dir);
      if (entries.length === 0) {
        await fs.promises.rmdir(dir);
        await this.cleanupEmptyDirs(path.dirname(dir));
      }
    } catch {
      // Directory not empty or can't be deleted
    }
  }

  /**
   * Verify object checksum
   */
  async verifyChecksum(key: string, expectedChecksum: string): Promise<boolean> {
    const object = await this.get(key, { decompress: true });
    if (!object) return false;

    const actualChecksum = this.calculateChecksum(object.content as Buffer);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Get disk usage statistics
   */
  async getDiskUsage(): Promise<{
    totalSize: number;
    fileCount: number;
    compressedFiles: number;
    compressionRatio: number;
  }> {
    let totalSize = 0;
    let totalOriginalSize = 0;
    let fileCount = 0;
    let compressedFiles = 0;

    await this.walkDirectory(
      this.config.basePath,
      async (filePath: string, stats: fs.Stats) => {
        if (filePath.endsWith('.meta.json')) return;

        fileCount++;
        totalSize += stats.size;

        // Check if compressed
        const metaPath = `${filePath}.meta.json`;
        try {
          const metaContent = await fs.promises.readFile(metaPath, 'utf-8');
          const meta: StoredMetadata = JSON.parse(metaContent);
          if (meta.compressed && meta.originalSize) {
            compressedFiles++;
            totalOriginalSize += meta.originalSize;
          } else {
            totalOriginalSize += stats.size;
          }
        } catch {
          totalOriginalSize += stats.size;
        }
      }
    );

    return {
      totalSize,
      fileCount,
      compressedFiles,
      compressionRatio: totalOriginalSize > 0 ? totalSize / totalOriginalSize : 1
    };
  }
}

// ============================================================================
// LOCAL FS FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a local filesystem store
 */
export function createLocalFSStore(config: LocalFSConfig): LocalFSStore {
  return new LocalFSStore(config);
}

/**
 * Create a local filesystem store from environment
 */
export function createLocalFSStoreFromEnv(): LocalFSStore {
  const basePath = process.env.AGENTOS_STORAGE_PATH ?? './data/storage';
  const compress = process.env.AGENTOS_STORAGE_COMPRESS === 'true';

  return new LocalFSStore({
    basePath,
    compress,
    autoCreateDirs: true,
    atomicWrites: true,
    calculateChecksums: true,
    useLocking: true
  });
}
