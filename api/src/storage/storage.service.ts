import { Injectable } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";

@Injectable()
export class StorageService {
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.STORAGE_REGION || "auto",
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
      credentials:
        process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
              secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async createFlyerUploadUrl(params: { contentType: string; filename?: string }) {
    const bucket = process.env.STORAGE_BUCKET;
    const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL;

    if (!bucket || !publicBaseUrl) {
      throw new Error("Storage environment variables are not fully configured");
    }

    const ext = this.getExtension(params.filename, params.contentType);
    const id = randomBytes(10).toString("hex");
    const key = `flyers/${new Date().toISOString().slice(0, 10)}/${id}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: params.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 60 * 10 });

    return {
      uploadUrl,
      publicUrl: `${publicBaseUrl}/${key}`,
      key,
      expiresInSeconds: 600,
    };
  }

  private getExtension(filename?: string, contentType?: string) {
    if (filename && filename.includes(".")) {
      const ext = filename.split(".").pop()?.toLowerCase();
      if (ext) return ext;
    }

    switch (contentType) {
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      case "image/jpeg":
      case "image/jpg":
      default:
        return "jpg";
    }
  }
}
