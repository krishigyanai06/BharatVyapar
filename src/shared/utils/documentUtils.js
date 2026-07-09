// Utility: document/image pick, permission and view helpers — production level (Force reload)
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick, types, isCancel } from '@react-native-documents/picker';
import {
  Alert,
  Linking,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { showAlert } from '../components/CustomAlertBox';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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
  if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
    showAlert({
      type: 'warning',
      title: 'File Too Large',
      message: `Max allowed size is ${MAX_FILE_SIZE_MB}MB. Please choose a smaller file.`,
    });
    return null;
  }
  return file;
};

// ─── Pickers ─────────────────────────────────────────────────────────────────

const pickFromGallery = async () => {
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

const pickFromCamera = async () => {
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
      type: [types.pdf, types.images],
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
    if (isCancel(err)) return null;
    showAlert({
      type: 'error',
      title: 'Document Error',
      message: 'Failed to pick document. Try again.',
    });
    return null;
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

// Shows action sheet and returns picked file { uri, name, type, size } or null
export const pickDocumentOrImage = () =>
  new Promise(resolve => {
    Alert.alert(
      'Upload Document',
      'Choose source',
      [
        { text: '📷 Camera', onPress: () => pickFromCamera().then(resolve) },
        { text: '🖼️ Gallery', onPress: () => pickFromGallery().then(resolve) },
        { text: '📄 Document (PDF)', onPress: () => pickDocument().then(resolve) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
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

// Download a file to local device Downloads (Android) or Documents (iOS)
export const downloadFile = async (url, fileName = 'download.pdf') => {
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
    if (Platform.OS === 'android') {
      const { dirs } = ReactNativeBlobUtil.fs;
      ReactNativeBlobUtil.config({
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: cleanFileName,
          path: `${dirs.DownloadDir}/${cleanFileName}`,
          description: 'Downloading document',
          mime: 'application/pdf',
          mediaScannable: true,
        },
      })
      .fetch('GET', url)
      .then((res) => {
        const filePath = res.path();
        // Automatically open the downloaded file via actionViewIntent
        ReactNativeBlobUtil.android.actionViewIntent(filePath, 'application/pdf')
          .catch((err) => {
            console.warn('[downloadFile] Failed to open PDF automatically:', err);
            showAlert({
              type: 'success',
              title: 'Download Complete',
              message: `File saved to Downloads folder as "${cleanFileName}".`,
            });
          });
      })
      .catch((err) => {
        console.error('Download error:', err);
        showAlert({
          type: 'error',
          title: 'Download Failed',
          message: 'Failed to download file. Please try again.',
        });
      });
    } else {
      // iOS
      const { dirs } = ReactNativeBlobUtil.fs;
      const localPath = `${dirs.DocumentDir}/${cleanFileName}`;
      
      ReactNativeBlobUtil.config({
        fileCache: true,
        path: localPath,
      })
      .fetch('GET', url)
      .then((res) => {
        ReactNativeBlobUtil.ios.previewDocument(localPath);
      })
      .catch((err) => {
        console.error('Download error:', err);
        showAlert({
          type: 'error',
          title: 'Download Failed',
          message: 'Failed to preview/save document.',
        });
      });
    }
  } catch (err) {
    console.error('Download setup error:', err);
    showAlert({
      type: 'error',
      title: 'Download Failed',
      message: 'Could not initialize download manager.',
    });
  }
};
