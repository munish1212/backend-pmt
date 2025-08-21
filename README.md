# Project Management System Backend

This is the backend API for the Project Management System.

## Deployment on Render

### Prerequisites

- MongoDB database (MongoDB Atlas recommended)
- Cloudinary account for image uploads
- Email service credentials

### Environment Variables Required

Set these environment variables in your Render dashboard:

1. **MONGO_URI** - Your MongoDB connection string
2. **JWT_SECRET** - Secret key for JWT token generation
3. **EMAIL_USER** - Email address for sending emails
4. **EMAIL_PASS** - Email password or app-specific password
5. **CLOUDINARY_CLOUD_NAME** - Your Cloudinary cloud name
6. **CLOUDINARY_API_KEY** - Your Cloudinary API key
7. **CLOUDINARY_API_SECRET** - Your Cloudinary API secret

### Deployment Steps

1. **Connect your GitHub repository to Render**

   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository

2. **Configure the service**

   - **Name**: backend-pmt
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose appropriate plan)

3. **Set Environment Variables**

   - Add all the environment variables listed above
   - Make sure to mark sensitive variables as "Secret"

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application

### API Endpoints

- **Base URL**: `https://backend-pmt.onrender.com`
- **API Routes**: `/api/*`
- **Alternative API Routes**: `/backend/api/*`

### Health Check

Test your deployment by visiting:

- `https://backend-pmt.onrender.com/api/test`

### CORS Configuration

The API is configured to accept requests from:

- `https://project-flow.digiwbs.com`
- `http://localhost:8000`
- `http://localhost:3001`

Update the CORS configuration in `index.js` if you need to add more origins.

### Troubleshooting

1. **Build fails**: Check that all dependencies are in `package.json`
2. **Runtime errors**: Check environment variables are set correctly
3. **Database connection issues**: Verify MongoDB URI is correct
4. **CORS errors**: Update allowed origins in the CORS configuration

### Local Development

```bash
npm install
npm run dev
```

The server will start on `http://localhost:8000`
