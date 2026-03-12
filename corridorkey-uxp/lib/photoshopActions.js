/**
 * Photoshop batchPlay wrappers for common operations.
 *
 * These descriptors interact with the Photoshop document model to create
 * layer masks, channels, and new layers from keying results.
 *
 * NOTE: These are framework stubs. Full implementation requires testing
 * against specific Photoshop versions (25+) and their UXP imaging API
 * capabilities. The batchPlay descriptor format varies across versions.
 */

const { action } = require("photoshop");

/**
 * Create a layer mask on the active layer from an alpha matte image.
 *
 * Workflow:
 * 1. Create a temporary channel from the alpha data
 * 2. Load the channel as a selection
 * 3. Apply the selection as a layer mask
 * 4. Delete the temporary channel
 *
 * @param {number} layerId - Target layer ID
 * @param {ImageData} alphaImageData - Single-channel alpha data
 */
async function createLayerMask(layerId, alphaImageData) {
  // Step 1: Create temp channel
  await action.batchPlay(
    [
      {
        _obj: "make",
        new: {
          _obj: "channel",
          name: "CorridorKey_TempAlpha",
        },
      },
    ],
    { synchronousExecution: true }
  );

  // Step 2: Place alpha pixel data into the channel
  // (Requires UXP imaging.putPixels — available in PS 25.1+)

  // Step 3: Load channel as selection
  await action.batchPlay(
    [
      {
        _obj: "set",
        _target: [{ _ref: "channel", _property: "selection" }],
        to: {
          _ref: "channel",
          _name: "CorridorKey_TempAlpha",
        },
      },
    ],
    { synchronousExecution: true }
  );

  // Step 4: Apply selection as layer mask
  await action.batchPlay(
    [
      {
        _obj: "make",
        new: { _class: "channel" },
        at: { _ref: "channel", _enum: "channel", _value: "mask" },
        using: { _enum: "userMaskEnabled", _value: "revealSelection" },
      },
    ],
    { synchronousExecution: true }
  );

  // Step 5: Delete temp channel
  await action.batchPlay(
    [
      {
        _obj: "delete",
        _target: [{ _ref: "channel", _name: "CorridorKey_TempAlpha" }],
      },
    ],
    { synchronousExecution: true }
  );
}

/**
 * Create a new layer with the despilled foreground image.
 *
 * @param {string} name - Layer name
 * @param {ImageData} rgbImageData - RGB pixel data for the foreground
 */
async function createNewLayer(name, rgbImageData) {
  // Create new layer above current
  await action.batchPlay(
    [
      {
        _obj: "make",
        _target: [{ _ref: "layer" }],
        using: {
          _obj: "layer",
          name: name || "CorridorKey Foreground",
        },
      },
    ],
    { synchronousExecution: true }
  );

  // Place pixel data into the new layer
  // (Requires UXP imaging.putPixels — available in PS 25.1+)
}

/**
 * Create an alpha channel (spot channel) in the Channels panel.
 *
 * @param {string} name - Channel name
 * @param {ImageData} alphaImageData - Single-channel alpha data
 */
async function createAlphaChannel(name, alphaImageData) {
  await action.batchPlay(
    [
      {
        _obj: "make",
        new: {
          _obj: "channel",
          name: name || "CorridorKey Alpha",
          color: {
            _obj: "RGBColor",
            red: 255,
            grain: 0,
            blue: 0,
          },
          opacity: 50,
        },
      },
    ],
    { synchronousExecution: true }
  );

  // Place alpha pixel data into the channel
  // (Requires UXP imaging.putPixels — available in PS 25.1+)
}

module.exports = {
  createLayerMask,
  createNewLayer,
  createAlphaChannel,
};
