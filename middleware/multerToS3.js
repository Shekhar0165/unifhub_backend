const fs = require('fs');
const path = require('path');
const S3Config = require('../config/S3Config');

class MulterToS3 {
  constructor() {
    this.s3 = new S3Config();
  }

  /**
   * Middleware to upload files from multer to S3 after multer processes them
   * @param {string} folder - The folder in S3 to store the file
   */
  uploadToS3 = (folder) => async (req, res, next) => {
    try {
      // Check if there are files uploaded
      if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
        // No files to upload, continue to next middleware
        return next();
      }

      // Function to upload a single file to S3
      const uploadSingleFile = async (file) => {
        const filePath = path.join(process.cwd(), file.path);
        const fileContent = fs.readFileSync(filePath);
        
        // Create a key for the file in S3
        const key = `${folder}/${file.filename}`;
        
        // Upload the file to S3
        const params = {
          Bucket: this.s3.bucketName,
          Key: key,
          Body: fileContent,
          ContentType: file.mimetype
        };
        
        try {
          await this.s3.s3.upload(params).promise();
          
          // Get the S3 URL for the file
          const s3Url = this.s3.getFileUrl(key);
          
          // Add S3 info to the file object
          file.s3Key = key;
          file.s3Url = s3Url;
          
          // Delete local file after upload to S3
          fs.unlinkSync(filePath);
          
          return {
            key,
            url: s3Url,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
          };
        } catch (error) {
          console.error('Error uploading to S3:', error);
          throw error;
        }
      };

      // Handle single file upload
      if (req.file) {
        const result = await uploadSingleFile(req.file);
        req.file.s3 = result;
      }
      
      // Handle multiple files upload
      if (req.files) {
        // For fields with multiple files (array of files)
        if (Array.isArray(req.files)) {
          for (let i = 0; i < req.files.length; i++) {
            const result = await uploadSingleFile(req.files[i]);
            req.files[i].s3 = result;
          }
        } 
        // For fields with single file per field (object of fields)
        else {
          for (const field in req.files) {
            if (Array.isArray(req.files[field])) {
              for (let i = 0; i < req.files[field].length; i++) {
                const result = await uploadSingleFile(req.files[field][i]);
                req.files[field][i].s3 = result;
              }
            } else {
              const result = await uploadSingleFile(req.files[field]);
              req.files[field].s3 = result;
            }
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Error in multerToS3 middleware:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error uploading file to S3', 
        error: error.message 
      });
    }
  };
}

module.exports = MulterToS3; 