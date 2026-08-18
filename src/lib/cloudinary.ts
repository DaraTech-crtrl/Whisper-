export async function compressImageToDataUrl(
  file: File | Blob,
  maxWidth = 256,
  maxHeight = 256,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(e.target?.result as string);
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadToCloudinary(file: File | Blob): Promise<string> {
  try {
    // Client-side pre-compression to ~512x512 JPEG for sub-second ultra-fast uploads
    let uploadBlob: Blob = file;
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 512, 512, 0.85);
      const res = await fetch(compressedDataUrl);
      uploadBlob = await res.blob();
    } catch (compressErr) {
      console.warn("Client-side pre-compression skipped, uploading original file:", compressErr);
    }

    const formData = new FormData();
    formData.append("file", uploadBlob, "avatar.jpg");
    formData.append("upload_preset", "ml_default");

    const response = await fetch("https://api.cloudinary.com/v1_1/esmkxmqd/image/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || "Failed to upload image to Cloudinary";
      console.warn("Cloudinary upload failed, falling back to local compressed image storage:", msg);
      return await compressImageToDataUrl(file, 512, 512, 0.85);
    }

    const data = await response.json();
    return data.secure_url || data.url;
  } catch (err) {
    console.warn("Cloudinary upload request error, falling back to compressed image storage:", err);
    return await compressImageToDataUrl(file, 512, 512, 0.85);
  }
}

