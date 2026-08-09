const { S3Client } = require("@aws-sdk/client-s3");

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET_NAME;

// SDK v3 uses the default credential chain: env vars (AWS_ACCESS_KEY_ID /
// AWS_SECRET_ACCESS_KEY) in dev, EC2 IAM role in production. No explicit
// credentials are passed here.
const s3Client = new S3Client({ region: AWS_REGION });

const PROFILE_IMAGE_PREFIX = "profile-images";

const profileImageKey = (userId) => `${PROFILE_IMAGE_PREFIX}/${userId}`;

// Public URL used as <img src>. `versionId` comes from the x-amz-version-id
// header returned by S3 on PUT (bucket versioning enabled) and is used as a
// cache-buster so browsers/CDNs pick up the new version immediately.
const buildPublicObjectUrl = (key, versionId) => {
  const base = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  return versionId ? `${base}?v=${encodeURIComponent(versionId)}` : base;
};

module.exports = { s3Client, S3_BUCKET, profileImageKey, buildPublicObjectUrl };
