const S3Config = require('../config/S3Config');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class S3UploadHandler {
  constructor(folder) {
    this.s3 = new S3Config();
    this.folder = folder;
  }

  // Generate a pre-signed URL for client-side uploading
  getUploadUrl = async (req, res, next) => {
    try {
      const { fileType, fileName, validityPeriod } = req.body;

      if (!fileType || !fileName) {
        return res.status(400).json({
          success: false,
          message: 'File type and name are required'
        });
      }

      // Extract file extension and generate a unique filename
      const fileExt = path.extname(fileName);
      const uniqueFileName = `${this.folder}/${uuidv4()}${fileExt}`;
      
      // Get the content type from the file type
      const contentType = fileType;
      
      // Set validity period (in seconds)
      const expiresIn = validityPeriod || 60; // Default 60 seconds if not provided
      
      // Generate the signed URL
      const signedUrlResult = await this.s3.getSignedUrl(uniqueFileName, contentType, expiresIn);
      
      if (!signedUrlResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate upload URL',
          error: signedUrlResult.error
        });
      }
      
      // Store info in request so controller can use it if needed
      req.s3File = {
        fileKey: signedUrlResult.key,
        uploadUrl: signedUrlResult.url,
        fileUrl: this.s3.getFileUrl(signedUrlResult.key)
      };
      
      // If this middleware is used directly to generate and return a URL
      if (!next) {
        return res.status(200).json({
          success: true,
          uploadUrl: signedUrlResult.url,
          fileKey: signedUrlResult.key,
          fileUrl: this.s3.getFileUrl(signedUrlResult.key),
          expiresIn
        });
      }
      
      // Otherwise let the request flow to the next middleware or controller
      return next();
    } catch (error) {
      console.error('Error in S3 upload handler:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  };

  // Handle deleting files from S3
  deleteFile = async (fileKey) => {
    return await this.s3.deleteFile(fileKey);
  };
}

module.exports = S3UploadHandler; 