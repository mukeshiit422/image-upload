/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import { config } from '../../config';
import { logger } from '../utils/logger';
import { FaceDetectionResult } from '../types';

let faceapi: any = null;
let modelsLoaded = false;
let initAttempted = false;

async function loadTensorflow(): Promise<boolean> {
  try {
    const tf = await import('@tensorflow/tfjs');
    await import('@tensorflow/tfjs-backend-wasm' as any);
    await (tf as any).setBackend('wasm');
    await (tf as any).ready();
    logger.info('TensorFlow backend: tfjs-wasm');
    return true;
  } catch {
    return false;
  }
}

async function initialize(): Promise<boolean> {
  if (initAttempted) return modelsLoaded;
  initAttempted = true;

  const tfLoaded = await loadTensorflow();
  if (!tfLoaded) {
    logger.warn('TensorFlow not available — face detection disabled');
    return false;
  }

  try {
    // face-api must be imported AFTER tensorflow so it binds to the loaded backend
    faceapi = await import('@vladmandic/face-api/dist/face-api.node-wasm.js' as any);
    // Set the tf backend explicitly on face-api
    if (faceapi.tf) await faceapi.tf.ready();
  } catch (err) {
    logger.warn('@vladmandic/face-api failed to load — face detection disabled', {
      error: (err as Error).message,
    });
    return false;
  }

  const fs = await import('fs');
  const requiredModelFile = path.join(
    config.storage.modelsDir,
    'ssd_mobilenetv1_model-weights_manifest.json'
  );

  if (!fs.existsSync(requiredModelFile)) {
    logger.warn(
      `Face detection models not found at ${config.storage.modelsDir}. ` +
        'Run "npm run download-models" to enable face validation.'
    );
    return false;
  }

  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(config.storage.modelsDir);
    modelsLoaded = true;
    logger.info('Face detection models loaded successfully');
    return true;
  } catch (err) {
    logger.warn('Failed to load face detection models', { error: (err as Error).message });
    return false;
  }
}

// Kick off initialization eagerly
initialize();

export async function detectFaces(imageBuffer: Buffer): Promise<FaceDetectionResult> {
  const available = await initialize();
  if (!available || !faceapi) {
    return { faceCount: -1, largestFaceAreaRatio: -1 };
  }

  let tensor: any = null;
  try {
    const sharp = (await import('sharp')).default;
    const { data: rawData, info } = await sharp(imageBuffer)
      .resize(640, undefined, { fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tf = (await import('@tensorflow/tfjs')) as any;
    tensor = tf.tensor3d(new Uint8Array(rawData), [info.height, info.width, 3]);

    const detections: any[] = await faceapi
      .detectAllFaces(
        tensor,
        new faceapi.SsdMobilenetv1Options({
          minConfidence: config.validation.faceConfidenceThreshold,
        })
      )
      .run();

    const imageArea = info.width * info.height;
    let largestFaceAreaRatio = 0;

    for (const det of detections) {
      const faceArea = det.box.width * det.box.height;
      const ratio = faceArea / imageArea;
      if (ratio > largestFaceAreaRatio) largestFaceAreaRatio = ratio;
    }

    return { faceCount: detections.length, largestFaceAreaRatio };
  } catch (err) {
    logger.error('Face detection inference failed', { error: (err as Error).message });
    return { faceCount: -1, largestFaceAreaRatio: -1 };
  } finally {
    if (tensor) {
      try {
        const tf = (await import('@tensorflow/tfjs')) as any;
        tf.dispose(tensor);
      } catch { /* ignore */ }
    }
  }
}

export function isFaceDetectionAvailable(): boolean {
  return modelsLoaded;
}
