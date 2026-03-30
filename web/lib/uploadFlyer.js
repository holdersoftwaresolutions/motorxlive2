import { adminFetch } from "./adminFetch";

export async function uploadFlyer(file) {
  if (!file) throw new Error("No file selected");
  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("Flyer must be an image file.");
  }

  const presignRes = await adminFetch("/api/admin/uploads/flyer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contentType: file.type || "image/jpeg",
      filename: file.name,
    }),
  });

  const presignText = await presignRes.text();
  if (!presignRes.ok) {
    throw new Error(`Failed to create upload URL: ${presignText}`);
  }

  const { uploadUrl, publicUrl } = JSON.parse(presignText);

  if (!uploadUrl || !publicUrl) {
    throw new Error("Storage service did not return a valid upload URL.");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => "");
    throw new Error(text || "Failed to upload flyer file");
  }

  return publicUrl;
}
