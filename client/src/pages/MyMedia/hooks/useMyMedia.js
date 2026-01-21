import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import config from "../../../config";
import { ITEMS_PER_PAGE, AUTO_REFRESH_INTERVAL, ERROR_MESSAGES } from "../constants";
import { showProcessingCompleteToast, showProcessingFailedToast } from "../utils/toastHelpers.jsx";

/**
 * Custom hook to manage fetching and state for user's media files
 * @param {string} userInfo - User email/identifier
 * @returns {Object} Media data and control functions
 */
export const useMyMedia = (userInfo) => {
  const navigate = useNavigate();
  
  // State
  const [myMediaItems, setMyMediaItems] = useState([]);
  const [myMediaLoading, setMyMediaLoading] = useState(false);
  const [myMediaLoadingMore, setMyMediaLoadingMore] = useState(false);
  const [myMediaTotal, setMyMediaTotal] = useState(0);
  const [myMediaHasMore, setMyMediaHasMore] = useState(false);
  const [myMediaError, setMyMediaError] = useState(null);
  const [processingFiles, setProcessingFiles] = useState([]);
  const [failedFiles, setFailedFiles] = useState([]);
  
  // Refs for tracking
  const previousProcessingRef = useRef([]);
  const uploadedIdsRef = useRef(new Set());
  const uploadRetryCountRef = useRef(new Map()); // Track retry attempts per upload

  /**
   * Fetch media data from API
   * @param {number} offset - Pagination offset
   */
  const fetchMyMedia = async (offset) => {
    const isLoadingMore = offset > 0;
    isLoadingMore ? setMyMediaLoadingMore(true) : setMyMediaLoading(true);
    setMyMediaError(null);

    const idToken = localStorage.getItem("id_token");
    if (!idToken) {
      navigate("/");
      return;
    }

    try {
      const response = await fetch(
        `${config.apiGateway.url}/my-media?userEmail=${encodeURIComponent(userInfo)}&limit=${ITEMS_PER_PAGE}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`${ERROR_MESSAGES.FETCH_FAILED}: ${response.status}`);
      }

      const data = await response.json();

      if (data.myMedia) {
        if (isLoadingMore) {
          setMyMediaItems((prev) => [...prev, ...data.myMedia.items]);
        } else {
          setMyMediaItems(data.myMedia.items);
        }
        setMyMediaTotal(data.myMedia.total);
        setMyMediaHasMore(data.myMedia.hasMore);
        
        // Check uploaded files for completion
        checkUploadedFilesCompletion(data);
        
        // Check for completed processing files
        checkProcessingCompletion(data);
        
        // Update processing and failed counts
        setProcessingFiles(data.processing || []);
        setFailedFiles(data.failed || []);
        
        // Update reference for next comparison
        previousProcessingRef.current = data.processing || [];
      }
    } catch (err) {
      setMyMediaError(err.message);
    } finally {
      setMyMediaLoading(false);
      setMyMediaLoadingMore(false);
    }
  };

  /**
   * Check if any uploaded files have completed processing
   */
  const checkUploadedFilesCompletion = (data) => {
    if (uploadedIdsRef.current.size > 0) {
      const idsToRemove = new Set();
      
      uploadedIdsRef.current.forEach(uploadUuid => {
        const inProcessing = (data.processing || []).some(f => f.mediaId?.includes(uploadUuid));
        const successItem = (data.myMedia?.items || []).find(f => f.mediaId?.includes(uploadUuid));
        const failedItem = (data.failed || []).find(f => f.mediaId?.includes(uploadUuid));
        
        // File found in processing - it's being tracked properly
        if (inProcessing) {
          uploadRetryCountRef.current.delete(uploadUuid);
          return; // Keep tracking
        }
        
        // File completed successfully
        if (successItem) {
          const birdCount = successItem.birdCount || 0;
          const speciesCount = successItem.tags ? Object.keys(successItem.tags).length : 0;
          
          showProcessingCompleteToast({
            filename: successItem.filename,
            speciesCount,
            birdCount
          });
          idsToRemove.add(uploadUuid);
          uploadRetryCountRef.current.delete(uploadUuid);
          return;
        }
        
        // File failed
        if (failedItem) {
          showProcessingFailedToast({
            filename: failedItem.filename,
            errorMessage: failedItem.errorMessage
          });
          idsToRemove.add(uploadUuid);
          uploadRetryCountRef.current.delete(uploadUuid);
          return;
        }
        
        // File not found anywhere - might be cold Lambda start
        // Retry up to 6 times (60 seconds with 10-second intervals)
        const retryCount = uploadRetryCountRef.current.get(uploadUuid) || 0;
        
        if (retryCount < 6) {
          uploadRetryCountRef.current.set(uploadUuid, retryCount + 1);
        } else {
          // Give up after 6 retries (1 minute)
          idsToRemove.add(uploadUuid);
          uploadRetryCountRef.current.delete(uploadUuid);
        }
      });
      
      // Remove completed/failed/timed-out uploads from tracking
      idsToRemove.forEach(id => uploadedIdsRef.current.delete(id));
    }
  };

  /**
   * Check for files that completed processing since last fetch
   */
  const checkProcessingCompletion = (data) => {
    if (previousProcessingRef.current.length > 0) {
      const previousIds = new Set(previousProcessingRef.current.map(f => f.mediaId));
      const currentIds = new Set((data.processing || []).map(f => f.mediaId));
      
      const completedFiles = previousProcessingRef.current.filter(
        prevFile => !currentIds.has(prevFile.mediaId)
      );
      
      completedFiles.forEach(completedFile => {
        try {
          const movedToSuccess = (data.myMedia?.items || []).some(
            item => item.mediaId === completedFile.mediaId
          );
          
          const movedToFailed = (data.failed || []).find(
            item => item.mediaId === completedFile.mediaId
          );
          
          if (movedToSuccess) {
            const successItem = (data.myMedia?.items || []).find(
              item => item.mediaId === completedFile.mediaId
            );
            const birdCount = successItem?.birdCount || 0;
            const speciesCount = successItem?.tags ? Object.keys(successItem.tags).length : 0;
            
            showProcessingCompleteToast({
              filename: completedFile.filename,
              speciesCount,
              birdCount
            });
          } else if (movedToFailed) {
            showProcessingFailedToast({
              filename: completedFile.filename,
              errorMessage: movedToFailed.errorMessage
            });
          }
        } catch (err) {
          // Toast notification failed silently
        }
      });
    }
  };

  /**
   * Add upload UUID to tracking set and start polling until file appears
   */
  const trackUploadedFile = (uuid, onFileFound) => {
    uploadedIdsRef.current.add(uuid);
    uploadRetryCountRef.current.set(uuid, 0); // Initialize retry counter
    
    // Poll every 2 seconds (faster than normal 10s interval) until file appears
    const pollInterval = setInterval(async () => {
      try {
        const idToken = localStorage.getItem("id_token");
        if (!idToken) return;
        
        const response = await fetch(
          `${config.apiGateway.url}/my-media?userEmail=${encodeURIComponent(userInfo)}&limit=${ITEMS_PER_PAGE}&offset=0`,
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Check if file appears in any category
          const inProcessing = (data.processing || []).some(f => f.mediaId?.includes(uuid));
          const inSuccess = (data.myMedia?.items || []).some(f => f.mediaId?.includes(uuid));
          const inFailed = (data.failed || []).find(f => f.mediaId?.includes(uuid));
          
          if (inProcessing || inSuccess || inFailed) {
            // File found! Update state and notify callback
            if (data.myMedia) {
              setMyMediaItems(data.myMedia.items);
              setMyMediaTotal(data.myMedia.total);
              setMyMediaHasMore(data.myMedia.hasMore);
            }
            setProcessingFiles(data.processing || []);
            setFailedFiles(data.failed || []);
            
            clearInterval(pollInterval);
            if (onFileFound) onFileFound();
            return;
          }
          
          // Not found yet - check retry count
          const retryCount = uploadRetryCountRef.current.get(uuid) || 0;
          if (retryCount >= 15) { // 15 retries × 2 seconds = 30 seconds max
            clearInterval(pollInterval);
            if (onFileFound) onFileFound(); // Hide loader anyway
          } else {
            uploadRetryCountRef.current.set(uuid, retryCount + 1);
          }
        }
      } catch (err) {
        // Polling error - continue silently
      }
    }, 2000); // Poll every 2 seconds
  };

  /**
   * Load more items (pagination)
   */
  const handleLoadMore = () => {
    fetchMyMedia(myMediaItems.length);
  };

  return {
    myMediaItems,
    myMediaLoading,
    myMediaLoadingMore,
    myMediaTotal,
    myMediaHasMore,
    myMediaError,
    processingFiles,
    failedFiles,
    fetchMyMedia,
    handleLoadMore,
    trackUploadedFile
  };
};
