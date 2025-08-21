# Render Deployment Guide

## Step-by-Step Instructions

### 1. Prepare Your Repository

- Make sure all your code is committed to GitHub
- Ensure `.env` file is in `.gitignore` (already done)
- Verify all dependencies are in `package.json` (already done)

### 2. Set Up MongoDB Atlas (if not already done)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get your connection string
4. Replace `<password>` with your database password
5. Add your IP address to the whitelist (or use 0.0.0.0/0 for all IPs)

### 3. Deploy to Render

#### Option A: Using render.yaml (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Review the configuration and click "Apply"

#### Option B: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `backend-pmt`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 4. Set Environment Variables

In your Render service dashboard, go to "Environment" tab and add:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-app-password
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
NODE_ENV=production
```

**Important**: Mark sensitive variables (passwords, secrets) as "Secret" in Render.

### 5. Deploy

1. Click "Create Web Service"
2. Wait for the build to complete
3. Your service will be available at: `https://backend-pmt.onrender.com`

### 6. Test Your Deployment

1. Visit: `https://backend-pmt.onrender.com/api/test`
2. You should see: `{"message": "API is working"}`

### 7. Update Frontend Configuration

Update your frontend to use the new API URL:

- Production API: `https://backend-pmt.onrender.com/api`

## Troubleshooting

### Build Fails

- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility

### Runtime Errors

- Check environment variables are set correctly
- Look at Render logs for specific error messages

### Database Connection Issues

- Verify MongoDB URI is correct
- Check if MongoDB Atlas IP whitelist includes Render's IPs
- Ensure database user has correct permissions

### CORS Errors

- Update the CORS configuration in `index.js` to include your frontend domain

## Environment Variables Reference

| Variable              | Description                     | Example                                          |
| --------------------- | ------------------------------- | ------------------------------------------------ |
| MONGO_URI             | MongoDB connection string       | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| JWT_SECRET            | Secret for JWT tokens           | `my-super-secret-key-123`                        |
| EMAIL_USER            | Email for sending notifications | `noreply@yourdomain.com`                         |
| EMAIL_PASS            | Email password/app password     | `your-app-password`                              |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud name           | `your-cloud-name`                                |
| CLOUDINARY_API_KEY    | Cloudinary API key              | `123456789012345`                                |
| CLOUDINARY_API_SECRET | Cloudinary API secret           | `your-cloudinary-secret`                         |
| NODE_ENV              | Environment mode                | `production`                                     |
