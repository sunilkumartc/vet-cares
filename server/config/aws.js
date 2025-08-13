import AWS from 'aws-sdk';

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
});

// Enhanced upload function with option for public/private access
const uploadToS3 = async (file, folder = "documents", makePublic = false) => {
  const timestamp = Date.now();
  const fileName = `${folder}/${timestamp}_${file.originalname}`;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: makePublic ? "public-read" : "private", // Dynamic ACL based on parameter
  };

  try {
    const result = await s3.upload(params).promise();
    return {
      url: result.Location,
      key: result.Key,
      fileName: fileName,
      isPublic: makePublic
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

// Enhanced upload specifically for avatars (public access to avoid CORS issues)
const uploadAvatarToS3 = async (file) => {
  return await uploadToS3(file, "avatars", true); // Make avatars public
};

const deleteFromS3 = async (key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log(`Successfully deleted file: ${key}`);
    return true;
  } catch (error) {
    console.error("S3 delete error:", error);
    throw new Error(`S3 delete failed: ${error.message}`);
  }
};

// Enhanced getSignedUrl for viewing documents with proper CORS headers
const getSignedUrl = async (key, expires = 3600) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Key: key,
    Expires: expires,
    ResponseContentType: 'image/*', // Specify content type for images
    ResponseContentDisposition: 'inline', // This helps with viewing in browser
    ResponseCacheControl: 'max-age=31536000' // Cache for 1 year
  };

  try {
    const url = await s3.getSignedUrlPromise("getObject", params);
    console.log(`Generated signed view URL for: ${key}`);
    return url;
  } catch (error) {
    console.error("Failed to generate signed URL:", error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

// Get direct S3 URL for public objects (no signing needed, no CORS issues)
const getPublicUrl = (key) => {
  const region = process.env.AWS_S3_REGION;
  const bucket = process.env.AWS_S3_BUCKET2;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

// Smart URL generator - returns public URL for public objects, signed URL for private
const getAccessibleUrl = async (key, isPublic = false, expires = 3600) => {
  if (isPublic) {
    return getPublicUrl(key);
  } else {
    return await getSignedUrl(key, expires);
  }
};

// New function for download URLs with forced download
const getSignedDownloadUrl = async (key, fileName, expires = 3600) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Key: key,
    Expires: expires,
    ResponseContentDisposition: `attachment; filename="${fileName}"` // Force download
  };

  try {
    const url = await s3.getSignedUrlPromise("getObject", params);
    console.log(`Generated signed download URL for: ${key}`);
    return url;
  } catch (error) {
    console.error("Failed to generate signed download URL:", error);
    throw new Error(`Failed to generate signed download URL: ${error.message}`);
  }
};

// Enhanced function to get signed URL with custom headers
const getSignedUrlWithHeaders = async (key, options = {}) => {
  const {
    expires = 3600,
    responseContentType,
    responseContentDisposition,
    responseCacheControl
  } = options;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Key: key,
    Expires: expires,
  };

  // Add optional response headers
  if (responseContentType) {
    params.ResponseContentType = responseContentType;
  }
  if (responseContentDisposition) {
    params.ResponseContentDisposition = responseContentDisposition;
  }
  if (responseCacheControl) {
    params.ResponseCacheControl = responseCacheControl;
  }

  try {
    const url = await s3.getSignedUrlPromise("getObject", params);
    console.log(`Generated signed URL with custom headers for: ${key}`);
    return url;
  } catch (error) {
    console.error("Failed to generate signed URL with headers:", error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

// Function to check if object exists in S3
const checkObjectExists = async (key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Key: key
  };

  try {
    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    console.error("Error checking object existence:", error);
    throw error;
  }
};

// Function to get object metadata
const getObjectMetadata = async (key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Key: key
  };

  try {
    const result = await s3.headObject(params).promise();
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      lastModified: result.LastModified,
      etag: result.ETag,
      acl: result.ACL || 'private' // Try to determine if public
    };
  } catch (error) {
    console.error("Error getting object metadata:", error);
    throw new Error(`Failed to get object metadata: ${error.message}`);
  }
};

// Function to make an existing object public
const makeObjectPublic = async (key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Key: key,
    ACL: 'public-read'
  };

  try {
    await s3.putObjectAcl(params).promise();
    console.log(`Made object public: ${key}`);
    return true;
  } catch (error) {
    console.error("Error making object public:", error);
    throw new Error(`Failed to make object public: ${error.message}`);
  }
};

// Function to make an existing object private
const makeObjectPrivate = async (key) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Key: key,
    ACL: 'private'
  };

  try {
    await s3.putObjectAcl(params).promise();
    console.log(`Made object private: ${key}`);
    return true;
  } catch (error) {
    console.error("Error making object private:", error);
    throw new Error(`Failed to make object private: ${error.message}`);
  }
};

// Function to copy an object within the same bucket
const copyObject = async (sourceKey, destinationKey, makePublic = false) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    CopySource: `${process.env.AWS_S3_BUCKET2}/${sourceKey}`,
    Key: destinationKey,
    ACL: makePublic ? 'public-read' : 'private'
  };

  try {
    const result = await s3.copyObject(params).promise();
    console.log(`Copied object from ${sourceKey} to ${destinationKey}`);
    return {
      key: destinationKey,
      etag: result.CopyObjectResult.ETag,
      isPublic: makePublic
    };
  } catch (error) {
    console.error("Error copying object:", error);
    throw new Error(`Failed to copy object: ${error.message}`);
  }
};

// Function to list objects in a folder
const listObjects = async (prefix = '', maxKeys = 1000) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET2,
    Prefix: prefix,
    MaxKeys: maxKeys
  };

  try {
    const result = await s3.listObjectsV2(params).promise();
    return {
      objects: result.Contents || [],
      isTruncated: result.IsTruncated,
      nextContinuationToken: result.NextContinuationToken
    };
  } catch (error) {
    console.error("Error listing objects:", error);
    throw new Error(`Failed to list objects: ${error.message}`);
  }
};

// Export using ES6 syntax
export {
  s3,
  uploadToS3,
  uploadAvatarToS3,
  deleteFromS3,
  getSignedUrl,
  getPublicUrl,
  getAccessibleUrl,
  getSignedDownloadUrl,
  getSignedUrlWithHeaders,
  checkObjectExists,
  getObjectMetadata,
  makeObjectPublic,
  makeObjectPrivate,
  copyObject,
  listObjects,
};

// Default export for backward compatibility
export default {
  s3,
  uploadToS3,
  uploadAvatarToS3,
  deleteFromS3,
  getSignedUrl,
  getPublicUrl,
  getAccessibleUrl,
  getSignedDownloadUrl,
  getSignedUrlWithHeaders,
  checkObjectExists,
  getObjectMetadata,
  makeObjectPublic,
  makeObjectPrivate,
  copyObject,
  listObjects,
};
