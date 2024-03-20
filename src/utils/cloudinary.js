import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUD_API_KEY, 
  api_secret: process.env.CLOUD_API_SECRET 
});


const uploadImg = async (imgPath) =>{
    try {
        if (!imgPath) return null;
        const res = await cloudinary.uploader.upload(imgPath, 
        {resource_type:"auto"})
        console.log("Image uploaded successfully", res.url);
        fs.unlinkSync(imgPath); // delete the image from the server
        return res;
    } catch (error) {
        fs.unlinkSync(imgPath); // delete the image from the server
        console.log("Error uploading image", error);
    }
}
    

export {uploadImg}