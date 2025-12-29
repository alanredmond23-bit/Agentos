/**
 * s3_compatible.ts
 * S3-compatible object storage implementation
 * Works with AWS S3, Cloudflare R2, MinIO, and other S3-compatible services
 */

import * as crypto from 'crypto';
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
 * S3-compatible storage configuration
 */
export interface S3Config {
  /** S3 endpoint URL */
  endpoint: string;

  /** AWS region */
  region: string;

  /** Bucket name */
  bucket: string;

  /** Access key ID */
  accessKeyId: string;

  /** Secret access key */
  secretAccessKey: string;

  /** Use path-style URLs (for MinIO, etc.) */
  forcePathStyle?: boolean;

  /** Custom signature version */
  signatureVersion?: 'v2' | 'v4';

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum retries */
  maxRetries?: number;

  /** Use SSL */
  useSSL?: boolean;

  /** Custom port */
  port?: number;

  /** Session token (for temporary credentials) */
  sessionToken?: string;
}

/**
 * Multi-part upload state
 */
export interface MultipartUpload {
  uploadId: string;
  key: string;
  parts: { partNumber: number; etag: string }[];
  startedAt: string;
}

/**
 * Pre-signed URL generation options
 */
export interface PresignedUrlParams {
  bucket: string;
  key: string;
  expires: number;
  method: 'GET' | 'PUT' | 'DELETE';
  contentType?: string;
  headers?: Record<string, string>;
}

// ============================================================================
// S3 COMPATIBLE STORE
// ============================================================================

export class S3CompatibleStore extends BaseObjectStore {
  readonly provider = 's3-compatible';
  readonly bucket: string;

  private config: Required<S3Config>;
  private activeUploads: Map<string, MultipartUpload> = new Map();

  constructor(config: S3Config) {
    super();

    this.config = {
      endpoint: config.endpoint,
      region: config.region,
      bucket: config.bucket,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      forcePathStyle: config.forcePathStyle ?? false,
      signatureVersion: config.signatureVersion ?? 'v4',
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      useSSL: config.useSSL ?? true,
      port: config.port ?? (config.useSSL !== false ? 443 : 80),
      sessionToken: config.sessionToken ?? ''
    };

    this.bucket = config.bucket;
  }

  // --------------------------------------------------------------------------
  // CRUD Operations
  // --------------------------------------------------------------------------

  /**
   * Store an object in S3
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

    // Compress if requested
    let finalBuffer = buffer;
    let contentEncoding: string | undefined;
    if (options?.compress) {
      const zlib = require('zlib');
      finalBuffer = zlib.gzipSync(buffer);
      contentEncoding = 'gzip';
    }

    const contentType = options?.contentType ?? this.detectContentType(normalizedKey, buffer);
    const checksum = this.calculateChecksum(buffer);
    const etag = this.calculateEtag(finalBuffer);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': String(finalBuffer.length),
      'x-amz-content-sha256': this.calculateChecksum(finalBuffer)
    };

    if (contentEncoding) {
      headers['Content-Encoding'] = contentEncoding;
    }

    if (options?.cacheControl) {
      headers['Cache-Control'] = options.cacheControl;
    }

    if (options?.contentDisposition) {
      headers['Content-Disposition'] = options.contentDisposition;
    }

    if (options?.acl) {
      headers['x-amz-acl'] = options.acl;
    }

    if (options?.storageClass) {
      headers['x-amz-storage-class'] = options.storageClass;
    }

    // Add custom metadata
    if (options?.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k.toLowerCase()}`] = v;
      }
    }

    // Conditional write
    if (options?.ifNoneMatch) {
      headers['If-None-Match'] = '*';
    }

    if (options?.ifMatch) {
      headers['If-Match'] = options.ifMatch;
    }

    // Make the request
    const response = await this.makeRequest('PUT', normalizedKey, headers, finalBuffer);

    if (response.status === 412) {
      throw new StorageError('Precondition failed', 'PRECONDITION_FAILED', { key: normalizedKey });
    }

    if (response.status !== 200 && response.status !== 201) {
      throw new StorageError(
        `Failed to upload object: ${response.statusText}`,
        'INTERNAL_ERROR',
        { key: normalizedKey, details: { status: response.status } }
      );
    }

    const now = new Date().toISOString();
    return {
      contentType,
      size: buffer.length,
      etag: response.headers?.etag?.replace(/"/g, '') ?? etag,
      checksum,
      lastModified: now,
      createdAt: now,
      customMetadata: options?.metadata,
      contentEncoding,
      cacheControl: options?.cacheControl,
      contentDisposition: options?.contentDisposition,
      storageClass: options?.storageClass
    };
  }

  /**
   * Retrieve an object from S3
   */
  async get(key: string, options?: GetOptions): Promise<StorageObject | null> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    const headers: Record<string, string> = {};

    if (options?.versionId) {
      // Version ID would be added as query param
    }

    if (options?.ifModifiedSince) {
      headers['If-Modified-Since'] = options.ifModifiedSince;
    }

    if (options?.ifNoneMatch) {
      headers['If-None-Match'] = options.ifNoneMatch;
    }

    if (options?.range) {
      const end = options.range.end !== undefined ? options.range.end : '';
      headers['Range'] = `bytes=${options.range.start}-${end}`;
    }

    const response = await this.makeRequest('GET', normalizedKey, headers);

    if (response.status === 404) {
      return null;
    }

    if (response.status === 304) {
      // Not modified
      return null;
    }

    if (response.status !== 200 && response.status !== 206) {
      throw new StorageError(
        `Failed to get object: ${response.statusText}`,
        'INTERNAL_ERROR',
        { key: normalizedKey, details: { status: response.status } }
      );
    }

    let content = response.body;

    // Decompress if needed
    if (options?.decompress && response.headers?.['content-encoding'] === 'gzip') {
      const zlib = require('zlib');
      content = zlib.gunzipSync(content);
    }

    const metadata = this.parseMetadataFromHeaders(response.headers ?? {});

    return {
      key: normalizedKey,
      content,
      metadata
    };
  }

  /**
   * Delete an object from S3
   */
  async delete(key: string, options?: DeleteOptions): Promise<boolean> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    const headers: Record<string, string> = {};

    if (options?.bypassGovernance) {
      headers['x-amz-bypass-governance-retention'] = 'true';
    }

    let path = normalizedKey;
    if (options?.versionId) {
      path += `?versionId=${options.versionId}`;
    }

    const response = await this.makeRequest('DELETE', path, headers);

    // 204 No Content is success, 404 means already deleted
    return response.status === 204 || response.status === 404;
  }

  /**
   * List objects in S3
   */
  async list(options?: ListOptions): Promise<ListResult> {
    const params = new URLSearchParams();
    params.set('list-type', '2');

    if (options?.prefix) {
      params.set('prefix', options.prefix);
    }

    if (options?.delimiter) {
      params.set('delimiter', options.delimiter);
    }

    if (options?.limit) {
      params.set('max-keys', String(options.limit));
    }

    if (options?.cursor) {
      params.set('continuation-token', options.cursor);
    }

    const response = await this.makeRequest('GET', `?${params.toString()}`, {});

    if (response.status !== 200) {
      throw new StorageError(
        `Failed to list objects: ${response.statusText}`,
        'INTERNAL_ERROR',
        { details: { status: response.status } }
      );
    }

    // Parse XML response
    const xml = response.body.toString('utf-8');
    const objects = this.parseListResponse(xml);

    return objects;
  }

  /**
   * Check if object exists
   */
  async exists(key: string): Promise<boolean> {
    const metadata = await this.getMetadata(key);
    return metadata !== null;
  }

  /**
   * Get object metadata
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    const response = await this.makeRequest('HEAD', normalizedKey, {});

    if (response.status === 404) {
      return null;
    }

    if (response.status !== 200) {
      throw new StorageError(
        `Failed to get metadata: ${response.statusText}`,
        'INTERNAL_ERROR',
        { key: normalizedKey, details: { status: response.status } }
      );
    }

    return this.parseMetadataFromHeaders(response.headers ?? {});
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
   * Create a writable stream (uses multipart upload)
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
  // Multi-part Upload
  // --------------------------------------------------------------------------

  /**
   * Initiate a multi-part upload
   */
  async initiateMultipartUpload(
    key: string,
    options?: PutOptions
  ): Promise<string> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    const headers: Record<string, string> = {
      'Content-Type': options?.contentType ?? 'application/octet-stream'
    };

    if (options?.metadata) {
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k.toLowerCase()}`] = v;
      }
    }

    const response = await this.makeRequest(
      'POST',
      `${normalizedKey}?uploads`,
      headers
    );

    if (response.status !== 200) {
      throw new StorageError(
        `Failed to initiate multipart upload: ${response.statusText}`,
        'INTERNAL_ERROR',
        { key: normalizedKey }
      );
    }

    // Parse upload ID from XML response
    const xml = response.body.toString('utf-8');
    const uploadIdMatch = xml.match(/<UploadId>([^<]+)<\/UploadId>/);
    if (!uploadIdMatch) {
      throw new StorageError('Failed to parse upload ID', 'INTERNAL_ERROR', { key: normalizedKey });
    }

    const uploadId = uploadIdMatch[1];

    this.activeUploads.set(uploadId, {
      uploadId,
      key: normalizedKey,
      parts: [],
      startedAt: new Date().toISOString()
    });

    return uploadId;
  }

  /**
   * Upload a part
   */
  async uploadPart(
    uploadId: string,
    partNumber: number,
    content: Buffer
  ): Promise<string> {
    const upload = this.activeUploads.get(uploadId);
    if (!upload) {
      throw new StorageError('Upload not found', 'NOT_FOUND', { key: uploadId });
    }

    const headers: Record<string, string> = {
      'Content-Length': String(content.length),
      'x-amz-content-sha256': this.calculateChecksum(content)
    };

    const response = await this.makeRequest(
      'PUT',
      `${upload.key}?partNumber=${partNumber}&uploadId=${uploadId}`,
      headers,
      content
    );

    if (response.status !== 200) {
      throw new StorageError(
        `Failed to upload part: ${response.statusText}`,
        'INTERNAL_ERROR',
        { key: upload.key, details: { partNumber } }
      );
    }

    const etag = response.headers?.etag?.replace(/"/g, '') ?? '';
    upload.parts.push({ partNumber, etag });

    return etag;
  }

  /**
   * Complete a multi-part upload
   */
  async completeMultipartUpload(uploadId: string): Promise<ObjectMetadata> {
    const upload = this.activeUploads.get(uploadId);
    if (!upload) {
      throw new StorageError('Upload not found', 'NOT_FOUND', { key: uploadId });
    }

    // Sort parts by part number
    upload.parts.sort((a, b) => a.partNumber - b.partNumber);

    // Build completion XML
    const partsXml = upload.parts
      .map(p => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>"${p.etag}"</ETag></Part>`)
      .join('');
    const xml = `<CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/xml',
      'Content-Length': String(Buffer.byteLength(xml))
    };

    const response = await this.makeRequest(
      'POST',
      `${upload.key}?uploadId=${uploadId}`,
      headers,
      Buffer.from(xml)
    );

    if (response.status !== 200) {
      throw new StorageError(
        `Failed to complete multipart upload: ${response.statusText}`,
        'INTERNAL_ERROR',
        { key: upload.key }
      );
    }

    this.activeUploads.delete(uploadId);

    // Get final metadata
    const metadata = await this.getMetadata(upload.key);
    return metadata!;
  }

  /**
   * Abort a multi-part upload
   */
  async abortMultipartUpload(uploadId: string): Promise<void> {
    const upload = this.activeUploads.get(uploadId);
    if (!upload) return;

    await this.makeRequest(
      'DELETE',
      `${upload.key}?uploadId=${uploadId}`,
      {}
    );

    this.activeUploads.delete(uploadId);
  }

  // --------------------------------------------------------------------------
  // URL Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a pre-signed URL
   */
  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    this.validateKey(key);
    const normalizedKey = this.normalizeKey(key);

    const method = options.method ?? 'GET';
    const expires = options.expiresIn;

    return this.generatePresignedUrl({
      bucket: this.bucket,
      key: normalizedKey,
      expires,
      method,
      contentType: options.contentType,
      headers: options.responseHeaders ? {
        'response-content-type': options.responseHeaders.contentType,
        'response-content-disposition': options.responseHeaders.contentDisposition,
        'response-cache-control': options.responseHeaders.cacheControl
      } : undefined
    });
  }

  /**
   * Get public URL
   */
  getPublicUrl(key: string): string {
    const normalizedKey = this.normalizeKey(key);
    if (this.config.forcePathStyle) {
      return `${this.getBaseUrl()}/${this.bucket}/${normalizedKey}`;
    }
    return `${this.getBaseUrl()}/${normalizedKey}`;
  }

  // --------------------------------------------------------------------------
  // Bucket Operations
  // --------------------------------------------------------------------------

  /**
   * Create bucket
   */
  async createBucket(): Promise<void> {
    const headers: Record<string, string> = {};

    const response = await this.makeRequest('PUT', '', headers);

    if (response.status !== 200 && response.status !== 409) {
      throw new StorageError(
        `Failed to create bucket: ${response.statusText}`,
        'INTERNAL_ERROR',
        { details: { status: response.status } }
      );
    }
  }

  /**
   * Delete bucket
   */
  async deleteBucket(): Promise<void> {
    const response = await this.makeRequest('DELETE', '', {});

    if (response.status !== 204) {
      throw new StorageError(
        `Failed to delete bucket: ${response.statusText}`,
        'INTERNAL_ERROR',
        { details: { status: response.status } }
      );
    }
  }

  /**
   * Check if bucket exists
   */
  async bucketExists(): Promise<boolean> {
    const response = await this.makeRequest('HEAD', '', {});
    return response.status === 200;
  }

  // --------------------------------------------------------------------------
  // Server-side Copy
  // --------------------------------------------------------------------------

  /**
   * Copy object (server-side)
   */
  async copy(
    sourceKey: string,
    destinationKey: string,
    options?: CopyOptions
  ): Promise<ObjectMetadata> {
    this.validateKey(sourceKey);
    this.validateKey(destinationKey);

    const normalizedSource = this.normalizeKey(sourceKey);
    const normalizedDest = this.normalizeKey(destinationKey);

    const headers: Record<string, string> = {
      'x-amz-copy-source': `/${this.bucket}/${normalizedSource}`
    };

    if (options?.ifMatch) {
      headers['x-amz-copy-source-if-match'] = options.ifMatch;
    }

    if (options?.contentType) {
      headers['Content-Type'] = options.contentType;
      headers['x-amz-metadata-directive'] = 'REPLACE';
    }

    if (options?.metadata) {
      headers['x-amz-metadata-directive'] = 'REPLACE';
      for (const [k, v] of Object.entries(options.metadata)) {
        headers[`x-amz-meta-${k.toLowerCase()}`] = v;
      }
    }

    if (options?.acl) {
      headers['x-amz-acl'] = options.acl;
    }

    const response = await this.makeRequest('PUT', normalizedDest, headers);

    if (response.status !== 200) {
      throw new StorageError(
        `Failed to copy object: ${response.statusText}`,
        'INTERNAL_ERROR',
        { key: normalizedDest }
      );
    }

    const metadata = await this.getMetadata(normalizedDest);
    return metadata!;
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private getBaseUrl(): string {
    const protocol = this.config.useSSL ? 'https' : 'http';
    const port = this.config.port !== (this.config.useSSL ? 443 : 80)
      ? `:${this.config.port}`
      : '';

    if (this.config.forcePathStyle) {
      return `${protocol}://${this.config.endpoint}${port}`;
    }
    return `${protocol}://${this.bucket}.${this.config.endpoint}${port}`;
  }

  private async makeRequest(
    method: string,
    path: string,
    headers: Record<string, string>,
    body?: Buffer
  ): Promise<{ status: number; statusText: string; headers?: Record<string, string>; body: Buffer }> {
    const url = this.buildUrl(path);
    const signedHeaders = this.signRequest(method, url, headers, body);

    try {
      // Use native fetch or http module
      const response = await this.httpRequest(method, url, signedHeaders, body);
      return response;
    } catch (error) {
      throw new StorageError(
        `Network error: ${(error as Error).message}`,
        'NETWORK_ERROR',
        { retryable: true, cause: error as Error }
      );
    }
  }

  private buildUrl(path: string): URL {
    const baseUrl = this.getBaseUrl();
    if (this.config.forcePathStyle && path && !path.startsWith('?')) {
      return new URL(`/${this.bucket}/${path}`, baseUrl);
    }
    if (path.startsWith('?')) {
      return new URL(`/${this.bucket}${path}`, baseUrl);
    }
    return new URL(`/${path}`, baseUrl);
  }

  private signRequest(
    method: string,
    url: URL,
    headers: Record<string, string>,
    body?: Buffer
  ): Record<string, string> {
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

    const signedHeaders: Record<string, string> = {
      ...headers,
      host: url.host,
      'x-amz-date': amzDate
    };

    if (this.config.sessionToken) {
      signedHeaders['x-amz-security-token'] = this.config.sessionToken;
    }

    if (!signedHeaders['x-amz-content-sha256']) {
      signedHeaders['x-amz-content-sha256'] = body
        ? this.calculateChecksum(body)
        : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // empty body hash
    }

    // Create canonical request
    const sortedHeaderKeys = Object.keys(signedHeaders).sort();
    const canonicalHeaders = sortedHeaderKeys
      .map(k => `${k.toLowerCase()}:${signedHeaders[k].trim()}`)
      .join('\n');
    const signedHeadersList = sortedHeaderKeys.map(k => k.toLowerCase()).join(';');

    const canonicalRequest = [
      method,
      url.pathname,
      url.search.slice(1),
      canonicalHeaders + '\n',
      signedHeadersList,
      signedHeaders['x-amz-content-sha256']
    ].join('\n');

    // Create string to sign
    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    // Calculate signature
    const kDate = crypto.createHmac('sha256', `AWS4${this.config.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.config.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    // Add authorization header
    signedHeaders['Authorization'] = [
      `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}`,
      `SignedHeaders=${signedHeadersList}`,
      `Signature=${signature}`
    ].join(', ');

    return signedHeaders;
  }

  private async httpRequest(
    method: string,
    url: URL,
    headers: Record<string, string>,
    body?: Buffer
  ): Promise<{ status: number; statusText: string; headers?: Record<string, string>; body: Buffer }> {
    // Implementation using native http/https module
    const http = url.protocol === 'https:' ? require('https') : require('http');

    return new Promise((resolve, reject) => {
      const req = http.request(
        url,
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
              statusText: res.statusMessage,
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

  private generatePresignedUrl(params: PresignedUrlParams): string {
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

    const url = this.buildUrl(params.key);
    const credential = `${this.config.accessKeyId}/${dateStamp}/${this.config.region}/s3/aws4_request`;

    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(params.expires),
      'X-Amz-SignedHeaders': 'host'
    });

    if (this.config.sessionToken) {
      queryParams.set('X-Amz-Security-Token', this.config.sessionToken);
    }

    if (params.headers) {
      for (const [k, v] of Object.entries(params.headers)) {
        if (v) queryParams.set(k, v);
      }
    }

    // Calculate signature
    const sortedParams = [...queryParams.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const canonicalQueryString = sortedParams.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

    const canonicalRequest = [
      params.method,
      url.pathname,
      canonicalQueryString,
      `host:${url.host}\n`,
      'host',
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const scope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const kDate = crypto.createHmac('sha256', `AWS4${this.config.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.config.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    queryParams.set('X-Amz-Signature', signature);

    return `${url.origin}${url.pathname}?${queryParams.toString()}`;
  }

  private parseMetadataFromHeaders(headers: Record<string, string>): ObjectMetadata {
    const customMetadata: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase().startsWith('x-amz-meta-')) {
        customMetadata[key.slice(11)] = value;
      }
    }

    return {
      contentType: headers['content-type'] ?? 'application/octet-stream',
      size: parseInt(headers['content-length'] ?? '0', 10),
      etag: headers['etag']?.replace(/"/g, '') ?? '',
      lastModified: headers['last-modified'] ?? new Date().toISOString(),
      customMetadata: Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
      contentEncoding: headers['content-encoding'],
      cacheControl: headers['cache-control'],
      contentDisposition: headers['content-disposition'],
      storageClass: headers['x-amz-storage-class'],
      versionId: headers['x-amz-version-id']
    };
  }

  private parseListResponse(xml: string): ListResult {
    const objects: (ObjectMetadata & { key: string })[] = [];
    const prefixes: string[] = [];

    // Parse Contents
    const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;
    while ((match = contentsRegex.exec(xml)) !== null) {
      const content = match[1];
      const key = content.match(/<Key>([^<]+)<\/Key>/)?.[1] ?? '';
      const size = parseInt(content.match(/<Size>([^<]+)<\/Size>/)?.[1] ?? '0', 10);
      const lastModified = content.match(/<LastModified>([^<]+)<\/LastModified>/)?.[1] ?? '';
      const etag = content.match(/<ETag>"?([^"<]+)"?<\/ETag>/)?.[1] ?? '';
      const storageClass = content.match(/<StorageClass>([^<]+)<\/StorageClass>/)?.[1];

      objects.push({
        key,
        contentType: this.detectContentType(key),
        size,
        etag,
        lastModified,
        storageClass
      });
    }

    // Parse CommonPrefixes
    const prefixRegex = /<CommonPrefixes>\s*<Prefix>([^<]+)<\/Prefix>\s*<\/CommonPrefixes>/g;
    while ((match = prefixRegex.exec(xml)) !== null) {
      prefixes.push(match[1]);
    }

    // Check for truncation
    const isTruncated = xml.includes('<IsTruncated>true</IsTruncated>');
    const nextToken = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1];

    return {
      objects,
      prefixes: prefixes.length > 0 ? prefixes : undefined,
      cursor: nextToken,
      hasMore: isTruncated
    };
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an S3-compatible store
 */
export function createS3Store(config: S3Config): S3CompatibleStore {
  return new S3CompatibleStore(config);
}

/**
 * Create an AWS S3 store
 */
export function createAWSS3Store(
  bucket: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string
): S3CompatibleStore {
  return new S3CompatibleStore({
    endpoint: `s3.${region}.amazonaws.com`,
    region,
    bucket,
    accessKeyId,
    secretAccessKey
  });
}

/**
 * Create a Cloudflare R2 store
 */
export function createR2Store(
  accountId: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string
): S3CompatibleStore {
  return new S3CompatibleStore({
    endpoint: `${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: true
  });
}

/**
 * Create a MinIO store
 */
export function createMinIOStore(
  endpoint: string,
  bucket: string,
  accessKeyId: string,
  secretAccessKey: string,
  options?: { useSSL?: boolean; port?: number }
): S3CompatibleStore {
  return new S3CompatibleStore({
    endpoint,
    region: 'us-east-1',
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: true,
    useSSL: options?.useSSL ?? false,
    port: options?.port
  });
}
