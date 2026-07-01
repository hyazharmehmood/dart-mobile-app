import { API_BASE_URL, getApiAccessToken } from "./api";

function filenameFromUri(uri, fallback = "upload.jpg") {
  const name = String(uri || "").split("/").pop();
  return name && name.includes(".") ? name : fallback;
}

function mimeFromName(name) {
  const extension = String(name || "").split(".").pop()?.toLowerCase();

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "gif") {
    return "image/gif";
  }

  return "image/jpeg";
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function unwrapUploadPayload(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  return data.data || data.result || data.payload || data;
}

function urlFromRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  return (
    record.secureUrl ||
    record.secure_url ||
    record.url ||
    record.imageUrl ||
    record.image_url ||
    null
  );
}

function findUploadUrlDeep(value, depth = 0) {
  if (!value || depth > 5) {
    return null;
  }

  if (isHttpUrl(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUploadUrlDeep(item, depth + 1);
      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    const direct = urlFromRecord(value);
    if (isHttpUrl(direct)) {
      return direct;
    }

    for (const key of ["asset", "assets", "photo", "upload", "image", "file", "data", "result", "payload"]) {
      const found = findUploadUrlDeep(value[key], depth + 1);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

export function extractUploadUrl(data) {
  const payloads = [data, unwrapUploadPayload(data)].filter(Boolean);

  for (const payload of payloads) {
    const direct =
      urlFromRecord(payload?.asset) ||
      urlFromRecord(payload?.photo) ||
      urlFromRecord(payload?.upload) ||
      urlFromRecord(payload?.image) ||
      urlFromRecord(payload?.file) ||
      urlFromRecord(payload) ||
      (Array.isArray(payload?.assets) ? urlFromRecord(payload.assets[0]) : null);

    if (isHttpUrl(direct)) {
      return direct;
    }

    const nested = findUploadUrlDeep(payload);
    if (isHttpUrl(nested)) {
      return nested;
    }
  }

  return null;
}

export function extractUploadPublicId(data) {
  const payloads = [data, unwrapUploadPayload(data)].filter(Boolean);

  for (const payload of payloads) {
    const publicId =
      payload?.asset?.publicId ||
      payload?.asset?.public_id ||
      payload?.photo?.publicId ||
      payload?.photo?.public_id ||
      payload?.upload?.publicId ||
      payload?.publicId ||
      payload?.public_id ||
      (Array.isArray(payload?.assets) ? payload.assets[0]?.publicId || payload.assets[0]?.public_id : null);

    if (publicId) {
      return publicId;
    }
  }

  return null;
}

export function normalizeUploadResponse(data) {
  const payload = unwrapUploadPayload(data);

  return {
    url: extractUploadUrl(data),
    publicId: extractUploadPublicId(data),
    asset: payload?.asset || payload?.photo || payload?.upload || null,
    raw: data
  };
}

export function buildUploadFile({ uri, name, type, fallbackName = "upload.jpg" }) {
  const mimeType = type || mimeFromName(name || uri) || "image/jpeg";
  let fileName = name || filenameFromUri(uri, fallbackName);

  if (!fileName.includes(".")) {
    fileName = mimeType.includes("png") ? `${fileName}.png` : `${fileName}.jpg`;
  }

  return {
    uri,
    name: fileName,
    type: mimeType
  };
}

async function postMultipart(path, formData) {
  const token = getApiAccessToken();
  const headers = { Accept: "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal
    });

    const rawText = await response.text();
    let data = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = { message: rawText };
    }

    if (!response.ok) {
      const error = new Error(data?.error || data?.message || `Upload failed with status ${response.status}`);
      error.response = { status: response.status, data };
      throw error;
    }

    const normalized = normalizeUploadResponse(data);

    if (!normalized.url) {
      const error = new Error("Upload completed but no image URL was returned.");
      error.response = { status: response.status, data };
      throw error;
    }

    return normalized;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Upload timed out. Please try again.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadCustomerImage({ uri, name, type, purpose = "customer-profile-image", folder = "profile-images" }) {
  const file = buildUploadFile({ uri, name, type, fallbackName: "profile-image.jpg" });
  const formData = new FormData();

  formData.append("file", file);
  formData.append("purpose", purpose);
  formData.append("folder", folder);

  return postMultipart("/api/customer/uploads", formData);
}

export async function uploadReviewPhoto({ uri, name, type }) {
  const file = buildUploadFile({ uri, name, type, fallbackName: "review-photo.jpg" });
  const formData = new FormData();

  formData.append("file", file);

  return postMultipart("/api/customer/reviews/photos", formData);
}

export async function uploadDisputeEvidence(disputeId, { uri, name, type, body }) {
  const file = buildUploadFile({ uri, name, type, fallbackName: "evidence.jpg" });
  const formData = new FormData();

  formData.append("file", file);
  formData.append("body", body || "Attached evidence");

  return postMultipart(`/api/customer/disputes/${disputeId}/evidence`, formData);
}
