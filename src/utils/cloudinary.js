import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Click 'View API Keys' above to copy your Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY, // Click 'View API Keys' above to copy your Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your Cloudinary API secret});
});

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

export { uploadOnCloudinary };
