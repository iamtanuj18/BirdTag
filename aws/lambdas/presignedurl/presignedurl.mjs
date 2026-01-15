import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = "ap-southeast-2";
const BUCKET_NAME = "birdtag-demo-media-bucket-9384";

const ALLOWED_FOLDERS = ["uploads", "query_uploads"];

const s3 = new S3Client({ region: REGION });

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
      },
      body: JSON.stringify({ message: "CORS preflight OK" }),
    };
  }

  try {
    const { filename, contentType, folder = "uploads", userEmail } = JSON.parse(event.body || "{}");

    // Validate input
    if (!filename || !contentType) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({ message: "Missing required fields." }),
      };
    }

    // Optionally enforce folder restrictions
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({ message: "Invalid folder specified." }),
      };
    }

    const s3Key = `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
      Metadata: {
        uploadedBy: userEmail || "unknown"
      }
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min validity
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({
        uploadUrl,
        s3Key,
      }),
    };
  } catch (err) {
    console.error("Error generating presigned URL:", err);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({ message: "Failed to generate presigned URL." }),
    };
  }
};
