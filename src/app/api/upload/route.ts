import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadImage, BucketName, BUCKETS } from "@/lib/storage";

/**
 * Image Upload API Route
 * 
 * Admin-authenticated multipart upload endpoint.
 * Validates file type (JPEG, PNG, WebP, AVIF), size (max 5MB),
 * and requires alt text (§12, §3.5).
 * 
 * POST /api/upload
 * Form data: file, bucket, altText
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Auth check — admin only
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (!role || (role !== "owner" && role !== "manager" && role !== "host")) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    // 2. Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "events";
    const altText = (formData.get("altText") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. Validate bucket name
    const validBuckets = Object.values(BUCKETS);
    if (!validBuckets.includes(bucket as BucketName)) {
      return NextResponse.json(
        { error: `Invalid bucket. Must be one of: ${validBuckets.join(", ")}` },
        { status: 400 }
      );
    }

    // 4. Upload
    const result = await uploadImage(
      file,
      bucket as BucketName,
      altText,
      session.user?.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      asset: result.asset,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
