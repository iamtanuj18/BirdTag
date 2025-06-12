# 🐦 BirdTag: An AWS-powered Serverless Media Storage System with Advanced Tagging Capabilities

**BirdTag** is a full-stack serverless web application designed to help Monash Birdy Buddies (MBB) securely upload, tag, and query media files (images, audio, and video) of birds — using the power of AWS.

## 🌐 Live Demo

👉 [Access BirdTag](https://chimerical-axolotl-397270.netlify.app/)

## 🧠 Project Overview

BirdTag is built with a React-based frontend offering an intuitive, interactive user experience. The backend leverages a suite of AWS services to deliver a robust, scalable, and serverless architecture:

- **Amazon S3**: Secure media storage with thumbnail generation
- **AWS Lambda**: Automatic tagging using ML models
- **DynamoDB**: NoSQL database for storing metadata and queries
- **Amazon SNS**: Tag-based email notifications
- **ECR**: Containerized Lambda deployments via Docker
- **Cognito**: Secure user authentication and authorization
- **API Gateway**: RESTful APIs for upload, query, tag modification, and deletion

Users can upload media, get species auto-detected, query by species/counts, and receive notifications when new relevant media appears.

## 🔐 Authentication

Only registered users (via Cognito) can access the app. Unauthorized access is blocked.

## 🤝 Team Project – FIT5225 S1 2025 GROUP 113

This was developed as a group submission for the **FIT5225 Cloud Computing** unit at Monash University.
