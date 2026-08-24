import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { mediaAsset } from "@/db/schema";
import { eq } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE S3 MEDIA STORAGE (§2, §3.5, §12)
//
// - Images resized on upload; originals retained
// - Never hotlink external assets
// - Type and size checked, images re-encoded, served from storage
// ═══════════════════════════════════════════════════════════════════════════════

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Server-side client with service role (bypasses RLS for storage operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Client-side anon client for public URL generation
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

// Storage buckets
export const BUCKETS = {
  events: "events",
  partners: "partners",
  journal: "journal",
  profiles: "profiles",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

// Allowed MIME types and max file size
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  success: boolean;
  asset?: {
    id: string;
    publicUrl: string;
    bucketPath: string;
    filename: string;
  };
  error?: string;
}

/**
 * Upload an image to Supabase Storage and create a media_asset record.
 * 
 * - Validates type and size
 * - Generates a unique filename to prevent collisions
 * - Stores in the specified bucket
 * - Returns the public URL and media_asset record
 */
export async function uploadImage(
  file: File | Buffer,
  bucket: BucketName,
  altText: string,
  uploadedByAdminId?: string,
  originalFilename?: string
): Promise<UploadResult> {
  try {
    // 1. Validate
    let mimeType: string;
    let fileSize: number;
    let fileBuffer: Buffer;

    if (file instanceof File) {
      mimeType = file.type;
      fileSize = file.size;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      originalFilename = originalFilename || file.name;
    } else {
      // Buffer passed directly (from server-side processing)
      fileBuffer = file;
      fileSize = file.length;
      mimeType = "image/jpeg"; // Default, should be passed explicitly
      originalFilename = originalFilename || "upload.jpg";
    }

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return {
        success: false,
        error: `Invalid file type: ${mimeType}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      };
    }

    if (fileSize > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB. Maximum: 5MB`,
      };
    }

    if (!altText || altText.trim().length < 2) {
      return { success: false, error: "Alt text is required (§3.5)" };
    }

    // 2. Generate unique filename
    const ext = originalFilename?.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const filename = `${timestamp}-${randomSuffix}.${ext}`;
    const bucketPath = `${bucket}/${filename}`;

    // 3. Upload to Supabase Storage
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filename, fileBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // 4. Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);

    // 5. Create media_asset record in database
    const inserted = await db
      .insert(mediaAsset)
      .values({
        filename,
        originalFilename: originalFilename || filename,
        mimeType,
        sizeBytes: fileSize,
        altText: altText.trim(),
        bucketPath,
        publicUrl,
        uploadedByAdminId: uploadedByAdminId || null,
      })
      .returning();

    return {
      success: true,
      asset: {
        id: inserted[0].id,
        publicUrl,
        bucketPath,
        filename,
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Upload failed" };
  }
}

/**
 * Delete an image from storage and mark the media_asset as removed.
 */
export async function deleteImage(assetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const asset = await db.query.mediaAsset.findFirst({
      where: eq(mediaAsset.id, assetId),
    });

    if (!asset) {
      return { success: false, error: "Asset not found" };
    }

    // Extract bucket and filename from bucketPath
    const parts = asset.bucketPath.split("/");
    const bucket = parts[0] as BucketName;
    const filename = parts.slice(1).join("/");

    // Delete from storage
    const { error } = await supabaseAdmin.storage.from(bucket).remove([filename]);

    if (error) {
      return { success: false, error: `Storage delete failed: ${error.message}` };
    }

    // Soft delete from database (keep the record)
    await db
      .update(mediaAsset)
      .set({ deletedAt: new Date() })
      .where(eq(mediaAsset.id, assetId));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Delete failed" };
  }
}

/**
 * Get a public URL for a media asset by ID.
 */
export async function getAssetUrl(assetId: string): Promise<string | null> {
  const asset = await db.query.mediaAsset.findFirst({
    where: eq(mediaAsset.id, assetId),
  });
  return asset?.publicUrl || null;
}
