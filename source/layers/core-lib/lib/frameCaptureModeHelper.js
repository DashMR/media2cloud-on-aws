// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const FrameCaptureMode = require('./frameCaptureMode');

class FrameCaptureModeHelper {
  static suggestFrameCaptureRate(srcFramerate, frameCaptureMode) {
    if (typeof srcFramerate !== 'number') {
      return [];
    }
    if (Object.values(FrameCaptureMode).indexOf(frameCaptureMode) < 0
    || frameCaptureMode === FrameCaptureMode.MODE_NONE) {
      return [];
    }
    const denominator = (Number.parseInt(srcFramerate, 10) === srcFramerate)
      ? 1000
      : 1001;
    let numerator;
    switch (frameCaptureMode) {
      case FrameCaptureMode.MODE_1FPS:
      case FrameCaptureMode.MODE_2FPS:
      case FrameCaptureMode.MODE_3FPS:
      case FrameCaptureMode.MODE_4FPS:
      case FrameCaptureMode.MODE_5FPS:
      case FrameCaptureMode.MODE_10FPS:
      case FrameCaptureMode.MODE_12FPS:
      case FrameCaptureMode.MODE_15FPS:
        numerator = frameCaptureMode * 1000;
        break;
      case FrameCaptureMode.MODE_ALL:
        numerator = srcFramerate * 1000;
        break;
      case FrameCaptureMode.MODE_HALF_FPS:
        numerator = (srcFramerate * 1000) / 2;
        break;
      case FrameCaptureMode.MODE_1F_EVERY_2S:
        numerator = (1 * 1000) / 2;
        break;
      case FrameCaptureMode.MODE_1F_EVERY_5S:
        numerator = (1 * 1000) / 5;
        break;
      case FrameCaptureMode.MODE_1F_EVERY_10S:
        numerator = (1 * 1000) / 10;
        break;
      case FrameCaptureMode.MODE_1F_EVERY_30S:
        numerator = Math.floor((1 * 1000) / 30);
        break;
      case FrameCaptureMode.MODE_1F_EVERY_1MIN:
        numerator = Math.floor((1 * 1000) / 60);
        break;
      case FrameCaptureMode.MODE_1F_EVERY_2MIN:
        numerator = Math.floor((1 * 1000) / (60 * 2));
        break;
      case FrameCaptureMode.MODE_1F_EVERY_5MIN:
        numerator = Math.floor((1 * 1000) / (60 * 5));
        break;
      default:
        numerator = 0;
    }
    if (!numerator) {
      return [];
    }
    return [
      numerator,
      denominator,
    ];
  }
}

module.exports = FrameCaptureModeHelper;
