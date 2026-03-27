import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExtractReceipt, useGetUploadUrl } from '@/hooks/useReceipts';
import { uploadToS3 } from '@/services/s3Upload';
import { Colors } from '@/theme/colors';
import type { RootStackParamList } from '../types';

type ScanScreenNavigation = NativeStackNavigationProp<RootStackParamList>;

type FlashMode = 'off' | 'on' | 'auto';

export function ScanScreen() {
  const navigation = useNavigation<ScanScreenNavigation>();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isProcessing, setIsProcessing] = useState(false);

  const getUploadUrl = useGetUploadUrl();
  const extractReceipt = useExtractReceipt();

  async function processImage(fileUri: string, mimeType: string) {
    setIsProcessing(true);
    try {
      const { url, key } = await getUploadUrl.mutateAsync();

      // Append extension to key so the service can infer MIME type
      const extension = mimeType === 'application/pdf' ? 'pdf' : (mimeType.split('/')[1] ?? 'jpg');
      const keyWithExtension = `${key}.${extension}`;

      await uploadToS3(url, fileUri, mimeType);
      const result = await extractReceipt.mutateAsync({ key: keyWithExtension });

      navigation.navigate('ReceiptReview', {
        items: result.items,
        sourceConfidence: result.sourceConfidence,
      });
    } catch {
      // Error boundary will catch unhandled errors; for user-facing errors we
      // could show an alert here — keeping it simple for now
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCapture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (!photo) return;
    await processImage(photo.uri, 'image/jpeg');
  }

  async function handleGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    await processImage(asset.uri, mimeType);
  }

  function cycleFlash() {
    setFlashMode((current) => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  }

  function flashIconName(): React.ComponentProps<typeof Ionicons>['name'] {
    if (flashMode === 'on') return 'flash';
    if (flashMode === 'auto') return 'flash-outline';
    return 'flash-off-outline';
  }

  // Permission not yet determined
  if (!cameraPermission) {
    return <View style={styles.root} />;
  }

  // Permission denied
  if (!cameraPermission.granted) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionSubtitle}>
          Allow camera access to scan receipts and add transactions automatically.
        </Text>
        <TouchableOpacity style={styles.enableButton} onPress={requestCameraPermission}>
          <Text style={styles.enableButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} flash={flashMode} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.topTitle}>Scan Receipt</Text>
        <TouchableOpacity style={styles.flashButton} onPress={cycleFlash}>
          <Ionicons name={flashIconName()} size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Viewfinder hint */}
      <View style={styles.viewfinderHint}>
        <View style={styles.viewfinderBox} />
        <Text style={styles.viewfinderText}>Position receipt within the frame</Text>
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={handleGallery}
          disabled={isProcessing}
        >
          <Ionicons name="images-outline" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
          onPress={handleCapture}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        {/* Spacer to balance the gallery button */}
        <View style={styles.galleryButton} />
      </View>

      {/* Processing overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={Colors.brandBlue} />
          <Text style={styles.processingText}>Analyzing receipt…</Text>
        </View>
      )}
    </View>
  );
}

const CAPTURE_SIZE = 72;
const GALLERY_SIZE = 48;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.navyBg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  topTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  flashButton: {
    position: 'absolute',
    right: 20,
    bottom: 0,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  viewfinderHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  viewfinderBox: {
    width: 260,
    height: 180,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  viewfinderText: {
    marginTop: 16,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 20,
  },
  galleryButton: {
    width: GALLERY_SIZE,
    height: GALLERY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: CAPTURE_SIZE,
    height: CAPTURE_SIZE,
    borderRadius: CAPTURE_SIZE / 2,
    borderWidth: 4,
    borderColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.4,
  },
  captureButtonInner: {
    width: CAPTURE_SIZE - 16,
    height: CAPTURE_SIZE - 16,
    borderRadius: (CAPTURE_SIZE - 16) / 2,
    backgroundColor: Colors.textPrimary,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  processingText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  permissionTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  enableButton: {
    backgroundColor: Colors.brandBlue,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  enableButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
