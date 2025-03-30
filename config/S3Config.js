const AWS = require('aws-sdk');
require('dotenv').config();

class S3Config {
  constructor() {
    // Configure AWS with credentials from environment variables
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    this.s3 = new AWS.S3();
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
  }

  // Generate a signed URL for uploading a file directly to S3
  async getSignedUrl(key, contentType, expiresIn = 60) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      Expires: expiresIn // URL expiration time in seconds
    };

    try {
      const signedUrl = await this.s3.getSignedUrlPromise('putObject', params);
      return {
        success: true,
        url: signedUrl,
        key: key
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete a file from S3
  async deleteFile(key) {
    const params = {
      Bucket: this.bucketName,
      Key: key
    };

    try {
      await this.s3.deleteObject(params).promise();
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate a URL for accessing a file
  getFileUrl(key) {
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
}

module.exports = S3Config; 