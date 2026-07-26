# AWS Deployment Guide for StudyMate AI

This guide provides step-by-step instructions for deploying the StudyMate AI container to AWS App Runner, which is the recommended service for this course project because it automatically builds and deploys web applications and APIs from a container image with built-in HTTPS.

## 1. Prerequisites

1.  **AWS Account:** Ensure you have an active AWS account (Free Tier is sufficient).
2.  **AWS CLI:** Installed and configured locally with `aws configure`.
3.  **Docker:** Installed and running locally.

## 2. Push Image to Amazon ECR (Elastic Container Registry)

First, we need to store our Docker image in AWS.

1.  **Create an ECR Repository:**
    *   Log in to the AWS Management Console.
    *   Search for **ECR** (Elastic Container Registry).
    *   Click **Create repository**.
    *   Set visibility to **Private**.
    *   Name it `studymate-ai`.
    *   Click **Create repository**.

2.  **Authenticate Docker to your ECR:**
    *   Select your new repository and click **View push commands**.
    *   Run the first command (the `aws ecr get-login-password ...` command) in your local terminal.

3.  **Build and Push the Docker Image:**
    ```bash
    # Run these in the root of the studymate-ai directory
    
    # 1. Build the image
    docker build -t studymate-ai .
    
    # 2. Tag the image (use the URI from the push commands panel)
    docker tag studymate-ai:latest <your-account-id>.dkr.ecr.<your-region>.amazonaws.com/studymate-ai:latest
    
    # 3. Push the image
    docker push <your-account-id>.dkr.ecr.<your-region>.amazonaws.com/studymate-ai:latest
    ```

## 3. Deploy to AWS App Runner

1.  **Create App Runner Service:**
    *   Go to the AWS Console and search for **App Runner**.
    *   Click **Create service**.

2.  **Source Configuration:**
    *   Select **Container registry** -> **Amazon ECR**.
    *   Click **Browse** and select your `studymate-ai` image tag.
    *   Deployment settings: Choose **Automatic** (so it redeploys when you push a new image).
    *   Create a new service role if prompted.
    *   Click **Next**.

3.  **Service Configuration:**
    *   **Service name:** `studymate-ai-service`
    *   **Virtual CPU & Memory:** The default (1 vCPU, 2 GB) is fine, or choose the lowest available to stay well within free tier/low cost.
    *   **Port:** Set to `8000` (this is what our FastAPI container exposes).
    *   **Environment variables:**
        *   Click **Add environment variable**.
        *   Key: `ANTHROPIC_API_KEY`
        *   Value: `<YOUR_ACTUAL_ANTHROPIC_API_KEY>` (Do not put this in the Dockerfile).
        *   Key: `AI_PROVIDER`
        *   Value: `anthropic`
        *   Key: `AI_MODEL`
        *   Value: `claude-3-5-sonnet-20240620`

4.  **Security & Network:**
    *   Leave defaults.
    *   Click **Next**, review the settings, and click **Create & deploy**.

5.  **Wait for Deployment:**
    *   It will take 5-10 minutes.
    *   Once complete, click the **Default domain** URL (e.g., `https://xxxxxx.region.awsapprunner.com`). 
    *   You should see the StudyMate AI landing page!

## 4. Setting up an AWS Budget Alert

To ensure you don't get surprise charges:

1.  Search for **AWS Budgets** in the console.
2.  Click **Create budget** -> **Use a template** -> **Zero spend budget**.
3.  Enter your email address.
4.  Click **Create budget**. You will now receive an email if your AWS usage exceeds $0.01.

## Alternative: AWS Elastic Beanstalk
If App Runner is not available in your region:
1. Search for Elastic Beanstalk.
2. Create Application -> Web server environment.
3. Platform: Docker.
4. Upload your `Dockerfile` and zipped project code (or use `docker-compose.yml` if using the EB CLI).
5. Set the Environment Properties (`ANTHROPIC_API_KEY`, etc.) in the Configuration -> Software section.
