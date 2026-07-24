// Utility: document/image pick, permission and view helpers — production level (Force reload)
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import {
  Alert,
  Linking,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { showAlert } from '../components/CustomAlertBox';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const IMAGE_OPTIONS = {
  mediaType: 'photo',
  quality: 0.8,
  includeBase64: false,
  presentationStyle: 'pageSheet',
};

// ─── Permission Helpers ───────────────────────────────────────────────────────

const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'App needs access to your camera to capture documents.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;

    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      showAlert({
        type: 'warning',
        title: 'Camera Permission Denied',
        message: 'Please enable camera permission from app settings.',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      });
    }
    return false;
  } catch {
    return false;
  }
};

const requestStoragePermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    // Android 13+ uses granular media permissions
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Storage Permission',
          message: 'App needs access to your gallery to upload documents.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'App needs access to your storage to upload documents.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
    }

    showAlert({
      type: 'warning',
      title: 'Storage Permission Denied',
      message: 'Please enable storage permission from app settings.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    });
    return false;
  } catch {
    return false;
  }
};

// ─── File Validation ──────────────────────────────────────────────────────────

const validateFile = file => {
  if (!file) return null;

  // Validate File Size
  if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
    showAlert({
      type: 'warning',
      title: 'File Too Large',
      message: `Max allowed size is ${MAX_FILE_SIZE_MB}MB. Please choose a smaller file.`,
    });
    return null;
  }

  // Validate File Extension (extracted from name)
  const extension = file.name ? file.name.split('.').pop().toLowerCase() : '';
  const isExtensionAllowed = ALLOWED_EXTENSIONS.indexOf(extension) !== -1;

  // Validate MIME Type
  const mimeType = file.type ? file.type.toLowerCase() : '';
  const isMimeAllowed = ALLOWED_MIME_TYPES.indexOf(mimeType) !== -1 || (mimeType && mimeType.indexOf('image/') === 0);

  if (!isExtensionAllowed || !isMimeAllowed) {
    showAlert({
      type: 'error',
      title: 'Invalid File Type',
      message: 'Only PDF and image files (JPG, JPEG, PNG, WEBP, HEIC) are allowed.',
    });
    return null;
  }

  return file;
};

// ─── Pickers ─────────────────────────────────────────────────────────────────

export const pickFromGallery = async () => {
  const hasPermission = await requestStoragePermission();
  if (!hasPermission) return null;

  return new Promise(resolve => {
    launchImageLibrary(IMAGE_OPTIONS, response => {
      if (response.didCancel) { resolve(null); return; }

      if (response.errorCode) {
        showAlert({
          type: 'error',
          title: 'Gallery Error',
          message: response.errorMessage || 'Failed to open gallery.',
        });
        resolve(null);
        return;
      }

      const asset = response.assets?.[0];
      if (!asset?.uri) { resolve(null); return; }

      resolve(validateFile({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize,
      }));
    });
  });
};

export const pickFromCamera = async () => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  return new Promise(resolve => {
    launchCamera(IMAGE_OPTIONS, response => {
      if (response.didCancel) { resolve(null); return; }

      if (response.errorCode) {
        if (response.errorCode === 'camera_unavailable') {
          showAlert({
            type: 'error',
            title: 'Camera Unavailable',
            message: 'No camera found on this device.',
          });
        } else {
          showAlert({
            type: 'error',
            title: 'Camera Error',
            message: response.errorMessage || 'Failed to open camera.',
          });
        }
        resolve(null);
        return;
      }

      const asset = response.assets?.[0];
      if (!asset?.uri) { resolve(null); return; }

      resolve(validateFile({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize,
      }));
    });
  });
};

const pickDocument = async () => {
  try {
    const result = await pick({
      type: [types.pdf],
      copyTo: 'cachesDirectory',
    });

    if (!result || result.length === 0) return null;
    const doc = result[0];

    return validateFile({
      uri: doc.fileCopyUri || doc.uri,
      name: doc.name || `doc_${Date.now()}`,
      type: doc.type || 'application/pdf',
      size: doc.size,
    });
  } catch (err) {
    if (isErrorWithCode(err, errorCodes.DOCUMENT_PICKER_CANCELED)) return null;
    showAlert({
      type: 'error',
      title: 'Document Error',
      message: 'Failed to pick document. Try again.',
    });
    return null;
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

// Shows custom alert action picker and returns picked file { uri, name, type, size } or null
export const pickDocumentOrImage = () =>
  new Promise(resolve => {
    showAlert({
      type: 'info',
      title: 'Upload Document',
      message: 'Choose how to upload your document:',
      mode: 'action-sheet',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera-outline',
          description: 'Capture physical document with camera',
          onPress: () => pickFromCamera().then(resolve),
        },
        {
          text: 'Choose from Gallery',
          icon: 'image-outline',
          description: 'Pick an existing photo from gallery',
          onPress: () => pickFromGallery().then(resolve),
        },
        {
          text: 'Browse Files (PDF)',
          icon: 'document-text-outline',
          description: 'Select a PDF file up to 10MB',
          onPress: () => pickDocument().then(resolve),
        },
        {
          text: 'Cancel',
          icon: 'close-circle-outline',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      onDismiss: () => resolve(null),
    });
  });


// Normalize URI for FormData (Android content:// URIs need no change, iOS file:// fine as-is)
export const normalizeFileUri = uri => {
  if (!uri) return uri;
  if (Platform.OS === 'ios') return uri.replace('file://', '');
  return uri;
};

// Open a URL for viewing — handles http, https, file URIs
export const viewDocument = async url => {
  if (!url) {
    showAlert({
      type: 'error',
      title: 'Not Available',
      message: 'Document URL is not available.',
    });
    return;
  }

  try {
    // Attempt to open URL directly as canOpenURL often fails on Android 11+ due to package visibility rules
    await Linking.openURL(url);
  } catch (err) {
    console.warn('[viewDocument] Direct open failed, trying fallback check...', err);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showAlert({
          type: 'error',
          title: 'Cannot Open',
          message: 'No app found to open this document. Please install a PDF viewer.',
        });
      }
    } catch {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to open document.',
      });
    }
  }
};

import { getStoredToken } from '../../features/auth/auth.storage';

// Download / View a private file with Bearer Authorization header
export const downloadFile = async (url, fileName = 'download.pdf', token = null) => {
  if (!url) {
    showAlert({
      type: 'error',
      title: 'Error',
      message: 'File URL is not available.',
    });
    return;
  }

  // Ensure clean filename
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

  try {
    // 1. Get stored Auth token for private S3 path access
    let authToken = token;
    if (!authToken) {
      authToken = await getStoredToken();
    }

    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    const { dirs } = ReactNativeBlobUtil.fs;
    const targetDir = Platform.OS === 'android' ? dirs.DownloadDir : dirs.DocumentDir;
    const localPath = `${targetDir}/${cleanFileName}`;

    // 2. Fetch authenticated binary stream in-app process (bypassing unauthenticated OS DownloadManager 403 block)
    const res = await ReactNativeBlobUtil.config({
      fileCache: true,
      appendExt: 'pdf',
      path: localPath,
    }).fetch('GET', url, headers);

    const filePath = res.path();

    // 3. Automatically launch native PDF viewer intent or iOS document preview
    if (Platform.OS === 'android') {
      try {
        await ReactNativeBlobUtil.android.actionViewIntent(filePath, 'application/pdf');
      } catch (err) {
        console.warn('[downloadFile] ActionViewIntent warning:', err);
        showAlert({
          type: 'success',
          title: 'File Downloaded',
          message: `Purchase Order saved to Downloads as "${cleanFileName}".`,
        });
      }
    } else {
      ReactNativeBlobUtil.ios.previewDocument(filePath);
    }
  } catch (err) {
    console.error('[downloadFile] Authenticated fetch error:', err);
    showAlert({
      type: 'error',
      title: 'Download Failed',
      message: err?.message || 'Failed to download and open Purchase Order document.',
    });
  }
};
