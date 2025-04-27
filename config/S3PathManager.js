const User = require('../models/User');
const Organization = require('../models/Organization');



class S3PathManager {
  constructor() {
    this.s3Path = '';
  }

  setS3Path(path) {
    this.s3Path = path;
  }

  getS3Path() {
    return this.s3Path;
  }
}