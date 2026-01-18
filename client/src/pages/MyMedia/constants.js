// Pagination
export const ITEMS_PER_PAGE = 9;

// Timing constants (in milliseconds)
export const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds - auto-refresh for processing files
export const UPLOAD_DELAY = 2000; // 2 seconds - delay before tracking upload (allows S3 event to trigger)
export const TOAST_DURATION = 8000; // 8 seconds - how long toasts are displayed
export const MODAL_CLOSE_DELAY = 300; // 300ms - animation delay before clearing modal data

// File types
export const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', 
  '.mp4', '.mov', '.mkv', 
  '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.wma'
];

// Tab names
export const TABS = {
  MY_MEDIA: 'myMedia',
  UPLOAD: 'upload',
  PROCESSING: 'processing',
  FAILED: 'failed'
};

// Error messages
export const ERROR_MESSAGES = {
  UNSUPPORTED_FILE: 'Unsupported file type. Allowed types: image, video, audio only',
  NO_FILE_SELECTED: 'Please select a valid file to upload.',
  UPLOAD_FAILED: 'Upload failed',
  FETCH_FAILED: 'Failed to fetch my media',
  PRESIGNED_URL_FAILED: 'Failed to get presigned URL',
  S3_UPLOAD_FAILED: 'Upload to S3 failed',
  IMAGE_LOAD_FAILED: 'Image failed to load'
};

// Success messages
export const SUCCESS_MESSAGES = {
  PROCESSING_COMPLETE: '✓ Processing Complete',
  PROCESSING_FAILED: '✗ Processing Failed'
};

// UI Text
export const UI_TEXT = {
  NO_MEDIA_TITLE: 'No media files yet',
  NO_MEDIA_DESCRIPTION: 'Upload files with detected birds to see them here',
  NO_PROCESSING_TITLE: 'No files currently processing',
  NO_PROCESSING_DESCRIPTION: 'Files appear here while species identification is in progress',
  NO_FAILED_TITLE: 'No failed uploads',
  NO_FAILED_DESCRIPTION: 'All your files are being processed successfully',
  ERROR_LOADING_TITLE: 'Error loading media',
  LOADING: 'Loading...',
  UPLOADING: 'Uploading...',
  UPLOAD_FILE: 'Upload File',
  RETRY: 'Retry',
  LOAD_MORE: 'Load More'
};
