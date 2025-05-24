import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { get } from "http";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Click 'View API Keys' above to copy your Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY, // Click 'View API Keys' above to copy your Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your Cloudinary API secret});
});

function getPublicId(url) {
  const parts = url.split("/upload/"); // Step 1: Split the URL at "/upload/"
  if (parts.length < 2) return null;
  let path = parts[1]; // Step 2: Get the path after "upload/"

  if (path.startsWith("v")) {
    // Step 3: Remove version part like "v1234567890/"
    path = path.substring(path.indexOf("/") + 1);
  }
  const dotIndex = path.lastIndexOf("."); // Step 4: Remove the file extension
  if (dotIndex !== -1) {
    path = path.substring(0, dotIndex);
  }
  return path;
}

const uploadOnCloudinary = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });

    return result;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    return null;
  } finally {
    fs.unlinkSync(filePath); // Delete the file after uploading
  }
};

const deleteFromCloudinary = async (publicId) => {
  publicId = getPublicId(publicId); //extract publicId from URL
  if (!publicId) return null;
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });
    return result;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
