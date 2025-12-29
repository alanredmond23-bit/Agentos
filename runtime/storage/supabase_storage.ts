/**
 * supabase_storage.ts
 * Supabase Storage implementation for object storage
 * Supports bucket management, RLS integration, and image transformations
 */

import { Readable, Writable, PassThrough } from 'stream';
import {
  BaseObjectStore,
  ObjectMetadata,
  StorageObject,
  PutOptions,
  GetOptions,
  ListOptions,
  ListResult,
  DeleteOptions,
  CopyOptions,
  StreamOptions,
  SignedUrlOptions,
  StorageStats,
  StorageError,
  streamToBuffer
} from './object_store';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supabase Storage configuration
 */
export interface SupabaseStorageConfig {
  /** Supabase project URL */
  projectUrl: string;

  /** Supabase anon or service role key */
  apiKey: string;

  /** Bucket name */
  bucket: string;

  /** Use service role (bypasses RLS) */
  useServiceRole?: boolean;

  /** Custom JWT token for user context */
  userToken?: string;

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Bucket configuration
 */
export interface BucketConfig {
  /** Bucket name */
  name: string;

  /** Bucket ID (usually same as name) */
  id?: string;

  /** Whether bucket is public */
  public?: boolean;

  /** Allowed MIME types */
  allowedMimeTypes?: string[];

  /** Maximum file size in bytes */
  fileSizeLimit?: number;
}

/**
 * Image transformation options
 */
export interface ImageTransformOptions {
  /** Width in pixels */
  width?: number;

  /** Height in pixels */
  height?: number;

  /** Resize mode */
  resize?: 'cover' | 'contain' | 'fill';

  /** Output format */
  format?: 'origin' | 'webp' | 'avif';

  /** Quality (1-100) */
  quality?: number;
}

/**
 * Supabase file metadata
 */
export interface SupabaseFileMetadata {
  id: string;
  name: string;
  bucket_id: string;
  owner: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown> | null;
}

// ============================================================================
// SUPABASE STORAGE STORE
// ============================================================================

export class SupabaseStorageStore extends BaseObjectStore {
  readonly provider = 'supabase';
  readonly bucket: string;

  private config: Required<SupabaseStorageConfig>;
  private baseUrl: string;

  constructor(config: SupabaseStorageConfig) {
    super();

    this.config = {
      projectUrl: config.projectUrl.replace(/\/$/, ''),
      apiKey: config.apiKey,
      bucket: config.bucket,
      useServiceRole: config.useServiceRole ?? false,
      userToken: config.userToken ?? '',
      timeout: config.timeout ?? 30000
    };

    this.bucket = config.bucket;
    this.baseUrl = `${this.config.projectUrl}/storage/v1`;
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Upload a file to Supabase Storage
   */
  async put(
    key: string,
    content: Buffer | string | Readable,
    options?: PutOptions
  ): Promise<ObjectMetadata> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    // Convert to buffer
    let buffer: Buffer;
    if (content instanceof Readable) {
      buffer = await streamToBuffer(content);
    } else if (typeof content === 'string') {
      buffer = Buffer.from(content, 'utf-8');
    } else {
      buffer = content;
    }

    const contentType = options?.contentType ?? this.detectContentType(normalizedKey, buffer);
    const checksum = this.calculateChecksum(buffer);

    // Determine if upsert or insert
    const exists = await this.exists(normalizedKey);
    const method = exists ? 'PUT' : 'POST';
    const endpoint = `/object/${this.bucket}/${normalizedKey}`;

    const headers: Record<string, string> = {
      'Content-Type': contentType
    };

    if (options?.cacheControl) {
      headers['Cache-Control'] = options.cacheControl;
    }

    // Add custom metadata as x-upsert headers
    if (options?.metadata) {
      headers['x-upsert'] = 'true';
    }

    const response = await this.makeRequest(method, endpoint, headers, buffer);

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to upload file: ${error.message}`,
        error.code,
        { key: normalizedKey }
      );
    }

    const now = new Date().toISOString();
    return {
      contentType,
      size: buffer.length,
      etag: this.calculateEtag(buffer),
      checksum,
      lastModified: now,
      createdAt: now,
      customMetadata: options?.metadata,
      cacheControl: options?.cacheControl
    };
  }

  /**
   * Download a file from Supabase Storage
   */
  async get(key: string, options?: GetOptions): Promise<StorageObject | null> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    const endpoint = `/object/${this.bucket}/${normalizedKey}`;
    const headers: Record<string, string> = {};

    if (options?.range) {
      const end = options.range.end !== undefined ? options.range.end : '';
      headers['Range'] = `bytes=${options.range.start}-${end}`;
    }

    const response = await this.makeRequest('GET', endpoint, headers);

    if (response.status === 404 || response.status === 400) {
      return null;
    }

    if (response.status !== 200 && response.status !== 206) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to download file: ${error.message}`,
        error.code,
        { key: normalizedKey }
      );
    }

    const metadata = this.parseMetadataFromHeaders(response.headers ?? {});

    return {
      key: normalizedKey,
      content: response.body,
      metadata
    };
  }

  /**
   * Delete a file from Supabase Storage
   */
  async delete(key: string, _options?: DeleteOptions): Promise<boolean> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    const endpoint = `/object/${this.bucket}`;
    const body = JSON.stringify({ prefixes: [normalizedKey] });

    const response = await this.makeRequest('DELETE', endpoint, {
      'Content-Type': 'application/json'
    }, Buffer.from(body));

    return response.status === 200;
  }

  /**
   * List files in Supabase Storage
   */
  async list(options?: ListOptions): Promise<ListResult> {
    const endpoint = `/object/list/${this.bucket}`;

    const body: Record<string, unknown> = {
      prefix: options?.prefix ?? '',
      limit: options?.limit ?? 100,
      offset: options?.cursor ? parseInt(options.cursor, 10) : 0
    };

    const response = await this.makeRequest('POST', endpoint, {
      'Content-Type': 'application/json'
    }, Buffer.from(JSON.stringify(body)));

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to list files: ${error.message}`,
        error.code
      );
    }

    const data = JSON.parse(response.body.toString('utf-8')) as SupabaseFileMetadata[];

    const objects: (ObjectMetadata & { key: string })[] = data
      .filter(item => item.name && !item.name.endsWith('/'))
      .map(item => ({
        key: options?.prefix ? `${options.prefix}${item.name}` : item.name,
        contentType: this.detectContentType(item.name),
        size: 0, // Size not returned in list
        etag: item.id,
        lastModified: item.updated_at,
        createdAt: item.created_at
      }));

    const prefixes = data
      .filter(item => item.name?.endsWith('/'))
      .map(item => options?.prefix ? `${options.prefix}${item.name}` : item.name);

    const offset = options?.cursor ? parseInt(options.cursor, 10) : 0;
    const hasMore = data.length === (options?.limit ?? 100);
    const nextOffset = offset + data.length;

    return {
      objects,
      prefixes: prefixes.length > 0 ? prefixes : undefined,
      cursor: hasMore ? String(nextOffset) : undefined,
      hasMore
    };
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    const metadata = await this.getMetadata(key);
    return metadata !== null;
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    // Use HEAD request to get metadata
    const endpoint = `/object/info/${this.bucket}/${normalizedKey}`;
    const response = await this.makeRequest('GET', endpoint, {});

    if (response.status === 404 || response.status === 400) {
      return null;
    }

    if (response.status !== 200) {
      return null;
    }

    try {
      const data = JSON.parse(response.body.toString('utf-8'));
      return {
        contentType: data.metadata?.mimetype ?? 'application/octet-stream',
        size: data.metadata?.size ?? 0,
        etag: data.id ?? '',
        lastModified: data.updated_at ?? new Date().toISOString(),
        createdAt: data.created_at,
        customMetadata: data.metadata
      };
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Streaming Operations
  // --------------------------------------------------------------------------

  /**
   * Create a readable stream
   */
  async createReadStream(key: string, options?: GetOptions): Promise<Readable | null> {
    const object = await this.get(key, options);
    if (!object) return null;

    const passthrough = new PassThrough();
    passthrough.end(object.content);
    return passthrough;
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

    const chunks: Buffer[] = [];
    const stream = new PassThrough();

    const promise = new Promise<ObjectMetadata>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const metadata = await this.put(normalizedKey, buffer, {
            contentType: options?.contentType,
            metadata: options?.metadata
          });
          resolve(metadata);
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
    });

    return { stream, promise };
  }

  // --------------------------------------------------------------------------
  // URL Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a signed URL
   */
  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    const endpoint = `/object/sign/${this.bucket}/${normalizedKey}`;
    const body = JSON.stringify({
      expiresIn: options.expiresIn
    });

    const response = await this.makeRequest('POST', endpoint, {
      'Content-Type': 'application/json'
    }, Buffer.from(body));

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to create signed URL: ${error.message}`,
        error.code,
        { key: normalizedKey }
      );
    }

    const data = JSON.parse(response.body.toString('utf-8'));
    return `${this.config.projectUrl}/storage/v1${data.signedURL}`;
  }

  /**
   * Get public URL (for public buckets)
   */
  getPublicUrl(key: string): string {
    const normalizedKey = this.normalizeKey(key);
    return `${this.baseUrl}/object/public/${this.bucket}/${normalizedKey}`;
  }

  /**
   * Get transformed image URL
   */
  getTransformUrl(key: string, transform: ImageTransformOptions): string {
    const normalizedKey = this.normalizeKey(key);
    const params = new URLSearchParams();

    if (transform.width) params.set('width', String(transform.width));
    if (transform.height) params.set('height', String(transform.height));
    if (transform.resize) params.set('resize', transform.resize);
    if (transform.format) params.set('format', transform.format);
    if (transform.quality) params.set('quality', String(transform.quality));

    const queryString = params.toString();
    const transformPath = queryString ? `?${queryString}` : '';

    return `${this.baseUrl}/render/image/${this.bucket}/${normalizedKey}${transformPath}`;
  }

  // --------------------------------------------------------------------------
  // Bucket Operations
  // --------------------------------------------------------------------------

  /**
   * Create a bucket
   */
  async createBucket(config: BucketConfig): Promise<void> {
    const endpoint = '/bucket';
    const body = JSON.stringify({
      id: config.id ?? config.name,
      name: config.name,
      public: config.public ?? false,
      allowed_mime_types: config.allowedMimeTypes,
      file_size_limit: config.fileSizeLimit
    });

    const response = await this.makeRequest('POST', endpoint, {
      'Content-Type': 'application/json'
    }, Buffer.from(body));

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to create bucket: ${error.message}`,
        error.code
      );
    }
  }

  /**
   * Get bucket info
   */
  async getBucket(): Promise<BucketConfig | null> {
    const endpoint = `/bucket/${this.bucket}`;
    const response = await this.makeRequest('GET', endpoint, {});

    if (response.status === 404) {
      return null;
    }

    if (response.status !== 200) {
      return null;
    }

    const data = JSON.parse(response.body.toString('utf-8'));
    return {
      name: data.name,
      id: data.id,
      public: data.public,
      allowedMimeTypes: data.allowed_mime_types,
      fileSizeLimit: data.file_size_limit
    };
  }

  /**
   * Update bucket settings
   */
  async updateBucket(config: Partial<BucketConfig>): Promise<void> {
    const endpoint = `/bucket/${this.bucket}`;
    const body = JSON.stringify({
      public: config.public,
      allowed_mime_types: config.allowedMimeTypes,
      file_size_limit: config.fileSizeLimit
    });

    const response = await this.makeRequest('PUT', endpoint, {
      'Content-Type': 'application/json'
    }, Buffer.from(body));

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to update bucket: ${error.message}`,
        error.code
      );
    }
  }

  /**
   * Delete bucket
   */
  async deleteBucket(): Promise<void> {
    const endpoint = `/bucket/${this.bucket}`;
    const response = await this.makeRequest('DELETE', endpoint, {});

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to delete bucket: ${error.message}`,
        error.code
      );
    }
  }

  /**
   * Empty bucket (delete all files)
   */
  async emptyBucket(): Promise<void> {
    const endpoint = `/bucket/${this.bucket}/empty`;
    const response = await this.makeRequest('POST', endpoint, {});

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to empty bucket: ${error.message}`,
        error.code
      );
    }
  }

  /**
   * List all buckets
   */
  async listBuckets(): Promise<BucketConfig[]> {
    const endpoint = '/bucket';
    const response = await this.makeRequest('GET', endpoint, {});

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to list buckets: ${error.message}`,
        error.code
      );
    }

    const data = JSON.parse(response.body.toString('utf-8'));
    return data.map((bucket: any) => ({
      name: bucket.name,
      id: bucket.id,
      public: bucket.public,
      allowedMimeTypes: bucket.allowed_mime_types,
      fileSizeLimit: bucket.file_size_limit
    }));
  }

  // --------------------------------------------------------------------------
  // RLS Integration
  // --------------------------------------------------------------------------

  /**
   * Set user context for RLS
   */
  setUserToken(token: string): void {
    this.config.userToken = token;
  }

  /**
   * Clear user context
   */
  clearUserToken(): void {
    this.config.userToken = '';
  }

  /**
   * Create a new instance with user context
   */
  withUser(token: string): SupabaseStorageStore {
    return new SupabaseStorageStore({
      ...this.config,
      userToken: token
    });
  }

  // --------------------------------------------------------------------------
  // Batch Operations
  // --------------------------------------------------------------------------

  /**
   * Delete multiple files
   */
  async deleteMany(keys: string[]): Promise<{ deleted: string[]; errors: { key: string; error: Error }[] }> {
    const normalizedKeys = keys.map(k => this.normalizeKey(k));

    const endpoint = `/object/${this.bucket}`;
    const body = JSON.stringify({ prefixes: normalizedKeys });

    const response = await this.makeRequest('DELETE', endpoint, {
      'Content-Type': 'application/json'
    }, Buffer.from(body));

    if (response.status !== 200) {
      const error = await this.parseError(response);
      return {
        deleted: [],
        errors: keys.map(key => ({
          key,
          error: new StorageError(error.message, error.code, { key })
        }))
      };
    }

    return {
      deleted: keys,
      errors: []
    };
  }

  /**
   * Move a file
   */
  async move(
    sourceKey: string,
    destinationKey: string,
    _options?: CopyOptions
  ): Promise<ObjectMetadata> {
    this.validateKey(sourceKey);
    this.validateKey(destinationKey);

    const normalizedSource = this.normalizeKey(sourceKey);
    const normalizedDest = this.normalizeKey(destinationKey);

    const endpoint = `/object/move`;
    const body = JSON.stringify({
      bucketId: this.bucket,
      sourceKey: normalizedSource,
      destinationKey: normalizedDest
    });

    const response = await this.makeRequest('POST', endpoint, {
      'Content-Type': 'application/json'
    }, Buffer.from(body));

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to move file: ${error.message}`,
        error.code,
        { key: normalizedSource }
      );
    }

    const metadata = await this.getMetadata(normalizedDest);
    return metadata!;
  }

  /**
   * Copy a file
   */
  async copy(
    sourceKey: string,
    destinationKey: string,
    _options?: CopyOptions
  ): Promise<ObjectMetadata> {
    this.validateKey(sourceKey);
    this.validateKey(destinationKey);

    const normalizedSource = this.normalizeKey(sourceKey);
    const normalizedDest = this.normalizeKey(destinationKey);

    const endpoint = `/object/copy`;
    const body = JSON.stringify({
      bucketId: this.bucket,
      sourceKey: normalizedSource,
      destinationKey: normalizedDest
    });

    const response = await this.makeRequest('POST', endpoint, {
      'Content-Type': 'application/json'
    }, Buffer.from(body));

    if (response.status !== 200) {
      const error = await this.parseError(response);
      throw new StorageError(
        `Failed to copy file: ${error.message}`,
        error.code,
        { key: normalizedSource }
      );
    }

    const metadata = await this.getMetadata(normalizedDest);
    return metadata!;
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      apikey: this.config.apiKey
    };

    if (this.config.userToken) {
      headers['Authorization'] = `Bearer ${this.config.userToken}`;
    } else {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    headers: Record<string, string>,
    body?: Buffer
  ): Promise<{ status: number; headers?: Record<string, string>; body: Buffer }> {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeaders = this.getAuthHeaders();

    const allHeaders = {
      ...authHeaders,
      ...headers
    };

    try {
      const response = await this.httpRequest(method, url, allHeaders, body);
      return response;
    } catch (error) {
      throw new StorageError(
        `Network error: ${(error as Error).message}`,
        'NETWORK_ERROR',
        { retryable: true, cause: error as Error }
      );
    }
  }

  private async httpRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: Buffer
  ): Promise<{ status: number; headers?: Record<string, string>; body: Buffer }> {
    const https = require('https');
    const http = require('http');
    const urlObj = new URL(url);
    const transport = urlObj.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = transport.request(
        urlObj,
        {
          method,
          headers,
          timeout: this.config.timeout
        },
        (res: any) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const responseHeaders: Record<string, string> = {};
            for (const [key, value] of Object.entries(res.headers)) {
              responseHeaders[key] = Array.isArray(value) ? value[0] : String(value);
            }
            resolve({
              status: res.statusCode,
              headers: responseHeaders,
              body: Buffer.concat(chunks)
            });
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  private async parseError(response: { status: number; body: Buffer }): Promise<{
    code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'QUOTA_EXCEEDED' | 'INTERNAL_ERROR';
    message: string;
  }> {
    try {
      const data = JSON.parse(response.body.toString('utf-8'));
      const message = data.error ?? data.message ?? 'Unknown error';

      if (response.status === 404) {
        return { code: 'NOT_FOUND', message };
      }
      if (response.status === 403 || response.status === 401) {
        return { code: 'PERMISSION_DENIED', message };
      }
      if (response.status === 413) {
        return { code: 'QUOTA_EXCEEDED', message };
      }

      return { code: 'INTERNAL_ERROR', message };
    } catch {
      return { code: 'INTERNAL_ERROR', message: `HTTP ${response.status}` };
    }
  }

  private parseMetadataFromHeaders(headers: Record<string, string>): ObjectMetadata {
    return {
      contentType: headers['content-type'] ?? 'application/octet-stream',
      size: parseInt(headers['content-length'] ?? '0', 10),
      etag: headers['etag']?.replace(/"/g, '') ?? '',
      lastModified: headers['last-modified'] ?? new Date().toISOString(),
      cacheControl: headers['cache-control'],
      contentDisposition: headers['content-disposition']
    };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a Supabase Storage store
 */
export function createSupabaseStore(config: SupabaseStorageConfig): SupabaseStorageStore {
  return new SupabaseStorageStore(config);
}

/**
 * Create a Supabase Storage store from environment variables
 */
export function createSupabaseStoreFromEnv(bucket: string): SupabaseStorageStore {
  const projectUrl = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!projectUrl || !apiKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set');
  }

  return new SupabaseStorageStore({
    projectUrl,
    apiKey,
    bucket,
    useServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}
