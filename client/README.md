# BirdTag Client - React Frontend

Modern React 19 application built with Vite for the BirdTag bird media platform.

## Overview

The BirdTag client is a single-page application (SPA) that provides an intuitive interface for uploading bird media, browsing community uploads, searching by species, and managing user content.

## Tech Stack

- **React 19.1.0**: Latest React with automatic batching and improved rendering
- **Vite 6.3.5**: Lightning-fast build tool with HMR (Hot Module Replacement)
- **React Router DOM 7.1.3**: Client-side routing with lazy loading
- **UUID**: Unique file naming for S3 uploads
- **AWS Cognito**: User authentication with JWT tokens

## Project Structure

```
client/
├── public/              # Static assets (images, icons)
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Auth/        # Authentication guards
│   │   ├── Cards/       # Media cards, feature cards
│   │   ├── Navbar/      # Navigation header
│   │   └── Sidebar/     # Side navigation menu
│   ├── pages/           # Route-level components
│   │   ├── LandingPage/ # Public marketing page
│   │   ├── HomePage/    # Community feed
│   │   ├── MyMedia/     # Upload & manage files
│   │   ├── FindByBird/  # Search by species name
│   │   ├── FindByFile/  # Reverse image search
│   │   ├── FindByTag/   # Advanced count-based filtering
│   │   └── ModifyTags/  # Edit species tags
│   ├── constants/       # App-wide constants
│   ├── utils/           # Helper functions
│   ├── App.jsx          # Main app component with routing
│   ├── AuthContext.jsx  # JWT authentication context
│   ├── config.js        # API Gateway endpoints
│   └── main.jsx         # Application entry point
├── .env                 # Environment variables (not committed)
├── .env.example         # Environment template
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
└── vite.config.js       # Vite configuration
```

## Features

### Authentication
- AWS Cognito-based JWT authentication
- Auto-logout on token expiry
- Protected routes (redirect to landing if not authenticated)

### Pages

#### LandingPage
- Public marketing page with feature highlights
- AI models showcase (YOLOv8 + BirdNET)
- Tech stack display
- Call-to-action for signup/login

#### HomePage (Feed)
- Browse all community uploads
- Infinite scroll with pagination (9 items per page)
- Real-time media previews (images, videos, audio)
- Species tags display
- Click to view full-size media

#### MyMedia
Four tabs for complete file management:
1. **My Media**: User's successfully processed files
2. **Upload New File**: Drag-drop or click to upload
3. **Currently Processing**: Auto-refresh every 10 seconds
4. **Failed Files**: View and retry failed uploads

Features:
- S3 presigned URL upload (no file size limit)
- Real-time status tracking
- Auto-refresh for processing files
- Species modal for detailed tag view

#### FindByBird
- Autocomplete species search (2+ characters)
- Multi-species selection
- OR/AND match modes:
  - OR: Find files with ANY selected species
  - AND: Find files with ALL selected species
- Pagination with "Load More"
- Auto-scroll to results

#### FindByFile (Reverse Search)
- Upload an image/video/audio file
- AI detects birds in uploaded file
- Returns all community files with matching species
- Smart handling:
  - <4MB: Base64 direct upload
  - >4MB: S3 presigned URL upload
- Displays detected species with counts

#### FindByTag
- Advanced filtering by species + minimum count
- Example: "Find files with at least 3 Sparrows"
- Real-time count validation

#### ModifyTags
- Edit species tags for uploaded files
- Add/remove species or update counts
- SNS email notifications on changes
- Auto-delete if all tags removed

## Setup & Installation

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Install Dependencies
```bash
cd client
npm install
```

### Environment Configuration

Create a `.env` file in the `client/` directory:

```env
# API Gateway Base URL
VITE_API_GATEWAY_URL=https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod

# AWS Cognito Configuration
VITE_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_CLIENT_ID=your-cognito-client-id
VITE_COGNITO_REGION=us-east-1

# S3 Configuration
VITE_S3_BUCKET_NAME=your-s3-bucket-name

# Lambda Function URLs (if using Function URLs instead of API Gateway)
VITE_LAMBDA_QUERY_WITH_FILE_URL=https://your-file-query-lambda-url

# Test Files Download (optional)
VITE_TEST_FILES_DOWNLOAD_URL=https://your-bucket.s3.amazonaws.com/test-files/test-media.zip
```

**Get Values**:
```bash
# Cognito User Pool ID
aws cognito-idp list-user-pools --max-results 10

# Cognito Client ID
aws cognito-idp list-user-pool-clients --user-pool-id <pool-id>

# API Gateway URL
aws apigateway get-rest-apis
```

### Development Server
```bash
npm run dev
```

Access at: `http://localhost:5173`

### Production Build
```bash
npm run build
```

Output in `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

## Configuration Files

### vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})
```

### eslint.config.js
ESLint configuration for code quality:
- React 19 support
- React Hooks rules
- No unused variables enforcement

## API Integration

All API calls use the `config.js` file for endpoint management:

```javascript
// config.js
const config = {
  apiGateway: {
    url: import.meta.env.VITE_API_GATEWAY_URL
  },
  cognito: {
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    clientId: import.meta.env.VITE_CLIENT_ID,
    region: import.meta.env.VITE_COGNITO_REGION
  },
  s3: {
    bucketName: import.meta.env.VITE_S3_BUCKET_NAME
  },
  lambdaFunctions: {
    queryWithFileUrl: import.meta.env.VITE_LAMBDA_QUERY_WITH_FILE_URL
  }
};

export default config;
```

### API Endpoints

All endpoints use `Authorization: Bearer ${idToken}` header.

- `POST /presignedurl` - Get S3 upload URL
- `GET /feed` - Fetch community feed with pagination
- `POST /query_raw` - Search by species, list species, modify tags
- `POST /file_query` - Reverse image/video/audio search
- `GET /my_uploaded_files` - User's uploaded files

See `config.js` for endpoint configuration.

## Authentication Flow

### Login/Signup
Uses AWS Cognito SDK for authentication:

```javascript
// AuthContext.jsx
import { CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

// Login
const authDetails = new AuthenticationDetails({ Username, Password });
cognitoUser.authenticateUser(authDetails, {
  onSuccess: (result) => {
    const idToken = result.getIdToken().getJwtToken();
    localStorage.setItem('id_token', idToken);
  }
});

// Signup
userPool.signUp(email, password, [], null, callback);
```

### Token Storage
- `id_token`: JWT token stored in localStorage
- Auto-logout on expiry (checked in AuthContext)

### Protected Routes
```javascript
// PrivateRoute.jsx
const PrivateRoute = ({ children }) => {
  const idToken = localStorage.getItem('id_token');
  return idToken ? children : <Navigate to="/" />;
};
```

## Styling

### CSS Architecture
- Component-scoped CSS files (e.g., `HomePage.css`)
- Global styles in `index.css`
- Consistent color palette:
  - Primary: `#2563eb` (blue)
  - Success: `#10b981` (green)
  - Error: `#ef4444` (red)
  - Background: `#f9fafb` (light gray)

### Responsive Design
- Mobile-first approach
- Breakpoints:
  - Mobile: 320px - 768px
  - Tablet: 769px - 1024px
  - Desktop: 1025px+

## Performance Optimizations

1. **Code Splitting**: React Router lazy loading for routes
2. **Image Lazy Loading**: `loading="lazy"` on all media
3. **Debouncing**: Search autocomplete with 200ms delay
4. **Pagination**: Load 9 items at a time
5. **Auto-refresh**: Only for "Processing" tab (10s interval)
6. **Thumbnail Usage**: Display thumbnails instead of full images

## Deployment

### Option 1: Netlify (Recommended)
```bash
# Build
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 2: AWS S3 + CloudFront
```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-frontend-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Option 3: Vercel
```bash
npm run build
vercel --prod
```

## Environment-Specific Builds

### Development
```bash
npm run dev
# Uses .env.development if exists
```

### Production
```bash
npm run build
# Uses .env.production if exists
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Testing

### Manual Testing Checklist
- [ ] Login/Signup with valid credentials
- [ ] Upload image/video/audio file
- [ ] View processing status in "Currently Processing" tab
- [ ] Search by species (OR and AND modes)
- [ ] Reverse image search with uploaded file
- [ ] Edit species tags
- [ ] Logout and verify redirect

### Debug Mode
Enable React DevTools for debugging:
```bash
npm install -g react-devtools
react-devtools
```

## Troubleshooting

### Common Issues

**1. CORS errors**
- Check API Gateway CORS settings
- Verify `Access-Control-Allow-Origin: *` in Lambda responses

**2. Login fails with "User pool doesn't exist"**
- Verify `VITE_USER_POOL_ID` in `.env`
- Check Cognito region matches `VITE_COGNITO_REGION`

**3. Upload stuck at "Uploading..."**
- Check S3 presigned URL generation
- Verify S3 bucket CORS policy allows PUT requests

**4. Feed shows no items**
- Check DynamoDB has items with `status: "success"`
- Verify JWT token is valid (not expired)

**5. Images not loading**
- Check S3 bucket public access settings
- Verify S3 URLs are correct (HTTPS format)

### Debug Tips
```javascript
// Enable verbose logging
localStorage.setItem('debug', 'true');

// Check token expiry
const token = localStorage.getItem('id_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires:', new Date(payload.exp * 1000));
```

## Security

- No sensitive data in localStorage (only JWT token)
- All API calls use Bearer token authentication
- Environment variables for configuration
- HTTPS-only in production
- Content Security Policy headers recommended

