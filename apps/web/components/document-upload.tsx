"use client";

import { useState } from "react";
import { uploadDocument } from "@/lib/actions/documents";

export function DocumentUpload({
  practiceDocId,
  acceptedFormats,
  maxSizeMb,
  onSuccess,
}: {
  practiceDocId: string;
  acceptedFormats: string[];
  maxSizeMb: number;
  onSuccess?: () => void;
}) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadDocument(practiceDocId, formData);
    setUploading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess?.();
    }
  }

  const accept = acceptedFormats.map((f) => `.${f}`).join(",");

  return (
    <div>
      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition">
        {uploading ? "Caricamento..." : "Carica documento"}
        <input type="file" className="hidden" accept={accept} onChange={handleUpload} disabled={uploading} />
      </label>
      <p className="mt-1 text-xs text-gray-400">
        Formati: {acceptedFormats.join(", ")} — Max: {maxSizeMb}MB
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
