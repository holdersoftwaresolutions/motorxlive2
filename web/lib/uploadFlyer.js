import { adminFetch } from "./adminFetch";

export async function uploadFlyer(file) {
  if (!file) throw new Error("No file selected");

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

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload flyer file");
  }

  return publicUrl;
}