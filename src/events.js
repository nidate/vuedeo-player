'use strict'

module.exports = {
  // from the browser process to the main process
  OPEN_WINDOW: 'open-window',
  RESIZE_WINDOW: 'resize-window',
  STORE_DATA: 'store-data',
  // from the main process to the browser process
  CLOSE_WINDOW: 'close-window',
  OPEN_FILE: 'open-file',
};
