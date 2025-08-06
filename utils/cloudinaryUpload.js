// utils/cloudinaryUpload.js
const cloudinary = require("cloudinary").v2;
const sharp = require("sharp");
const { Readable } = require("stream");

// Check if Cloudinary is properly configured
console.log("Cloudinary config check:");
console.log(
  "Cloud name:",
  process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Missing"
);
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Set" : "Missing");
console.log(
  "API Secret:",
  process.env.CLOUDINARY_API_SECRET ? "Set" : "Missing"
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadCompressedImage = async (buffer, filename) => {
  try {
    console.log(`Starting upload for file: ${filename}`);
    console.log(`Buffer size: ${buffer.length} bytes`);

    const compressedBuffer = await sharp(buffer)
      .resize({ width: 800 }) // Resize to width 800px max
      .jpeg({ quality: 70 }) // Compress
      .toBuffer();

    console.log(`Compressed buffer size: ${compressedBuffer.length} bytes`);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "subtask_images",
          public_id: filename,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("Cloudinary upload successful:", result.secure_url);
            resolve(result);
          }
        }
      );

      Readable.from(compressedBuffer).pipe(stream);
    });
  } catch (error) {
    console.error("Error in uploadCompressedImage:", error);
    throw error;
  }
};

// Function to delete image from Cloudinary
exports.deleteImageFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes("cloudinary.com")) {
      console.log("Not a Cloudinary URL, skipping deletion:", imageUrl);
      return { success: true, message: "Not a Cloudinary URL" };
    }

    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
    const urlParts = imageUrl.split("/");
    const uploadIndex = urlParts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) {
      console.log("Could not parse Cloudinary URL:", imageUrl);
      return { success: false, message: "Invalid Cloudinary URL format" };
    }

    // Get the path after 'upload' and before the file extension
    const pathAfterUpload = urlParts.slice(uploadIndex + 2).join("/");
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, ""); // Remove file extension

    console.log(`Deleting image from Cloudinary with public_id: ${publicId}`);

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    console.log("Cloudinary deletion result:", result);
    return { success: true, result };
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return { success: false, error: error.message };
  }
};

// Function to delete multiple images from Cloudinary
exports.deleteMultipleImagesFromCloudinary = async (imageUrls) => {
  try {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return { success: true, message: "No images to delete" };
    }

    console.log(`Deleting ${imageUrls.length} images from Cloudinary`);

    const deletePromises = imageUrls.map((url) =>
      this.deleteImageFromCloudinary(url)
    );
    const results = await Promise.allSettled(deletePromises);

    const successful = results.filter(
      (result) => result.status === "fulfilled" && result.value.success
    );
    const failed = results.filter(
      (result) => result.status === "rejected" || !result.value.success
    );

    console.log(
      `Successfully deleted ${successful.length} images, failed to delete ${failed.length} images`
    );

    return {
      success: true,
      deleted: successful.length,
      failed: failed.length,
      results,
    };
  } catch (error) {
    console.error("Error deleting multiple images from Cloudinary:", error);
    return { success: false, error: error.message };
  }
};
