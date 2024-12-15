<template>
  <div @keydown="keydown">
    <video
      ref="videoPlayer"
      class="video-js"
      @drop="dropFiles"
      @dragenter.prevent
      @dragover.prevent
    />
  </div>
</template>
<script>
import videojs from 'video.js';
import abLoopPlugin from 'videojs-abloop';
import 'videojs-hotkeys';
import {
  OPEN_FILE,
  STORE_DATA,
  VOLUME_DOWN_ANOTHER_WINDOW,
  VOLUME_DOWN
} from '../events';

const STATE = {
  INIT: 'INIT',
  READY: 'READY',
  LOADING: 'LOADING',
  ACTIVE: 'ACTIVE'
};
const VOLUME_RATE = 0.05;

export default {
  name: 'VideoPlayer',
  emits: ['resize-video', 'close-video', VOLUME_DOWN_ANOTHER_WINDOW],
  data() {
    return {
      state: STATE.INIT,
      player: null,
      originalSize: {},
      file: null,
      hash: null,
      fileInfo: {},
      startTime: 0,
      options: {
        autoplay: 'play',
        fluid: true,
        fill: true,
        responsive: true,
        controls: true,
        sources: [],
        playbackRates: [0.5, 0.75, 1, 1.5, 2, 3],
        plugins: {
          abLoopPlugin: {
            enabled: true,
            createButtons: true
          }
        }
      }
    };
  },
  computed: {},
  mounted() {
    const component = this;
    abLoopPlugin(window, videojs);
    this.player = videojs(this.$refs.videoPlayer, this.options, () => {
      this.player.hotkeys({
        enableHoverScroll: true,
        alwaysCaptureHotkeys: true,
        enableNumbers: false,
        // override up, down
        volumeDownKey: (e) => {
          return ['-', '_'].includes(e.key);
        },
        forwardKey: (e) => {
          return ['ArrowUp', 'ArrowRight'].includes(e.key);
        },
        rewindKey: (e) => {
          return ['ArrowDown', 'ArrowLeft'].includes(e.key);
        },
        seekStep: (e) => {
          const step = 5;
          // seek step up
          if (e.key === 'ArrowUp' || e.which === 'ArrowDown') {
            return step * 3;
          }
          const rate = this.player.playbackRate() || 1;
          return step * rate;
        },
        customKeys: {
          volumeUpKey: {
            key: (e) => {
              return ['=', '+'].includes(e.key);
            },
            handler: (player) => {
              let rate = VOLUME_RATE;
              player.volume(player.volume() + rate);
              if (player.volume() >= 1) {
                this.$emit(VOLUME_DOWN_ANOTHER_WINDOW, rate);
              }
            }
          },
          // change playback rate '[' ']' '\'
          // todo indicate current playback rate on the screen
          playbackRateUp: {
            key: (e) => {
              return e.key === '\\';
            },
            handler: (player) => {
              let rate = Math.round(player.playbackRate() * 100) + 10;
              player.playbackRate(rate / 100);
            }
          },
          playbackRateDown: {
            key: (e) => e.key === '[',
            handler: (player) => {
              let rate = Math.round(player.playbackRate() * 100) - 10;
              if (rate <= 0) {
                rate = player.playbackRate();
              }
              player.playbackRate(rate / 100);
            }
          },
          playbackRateReset: {
            key: (e) => e.key === ']',
            handler: (player) => {
              player.playbackRate(1);
            }
          }
        }
      });
      component.playerReady();
    });
    window.electron.on(VOLUME_DOWN, this.volumeDown);
  },
  beforeUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  },
  methods: {
    dropFiles(e) {
      e.preventDefault();
      e.stopPropagation();
      this.savePosition();
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        // e.dataTransfer.filesをcontextBridgeに渡すとObjectに変換されlengthプロパティがなくなる。
        const files = [];
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          files.push(e.dataTransfer.files.item(i));
        }
        window.electron.openWindow({ files });
      }
    },
    // called after videojs initialized
    playerReady() {
      this.state = STATE.READY;
      this.player.on('loadeddata', () => {
        this.loadedData();
      });
      window.electron.on(OPEN_FILE, this.load);
    },
    loadedData() {
      this.state = STATE.ACTIVE;
      if (this.startTime) {
        // todo confirm dialog or something indicate to user.
        this.player.currentTime(this.startTime);
      }
      // initialize window size
      this.originalSize = this.player.currentDimensions();
      this.resizeVideo(this.originalSize);
    },
    /**
     * request parent component to resize window
     */
    resizeVideo({ width, height }) {
      width = Math.ceil(width);
      height = Math.ceil(height);
      this.$emit('resize-video', { width, height });
    },
    load({ file, hash, fileInfo, mimeType }) {
      // load new file
      this.state = STATE.LOADING;
      this.file = file;
      this.hash = hash;
      this.fileInfo = fileInfo;
      this.startTime = fileInfo.position;
      this.player.src({ src: `local-resource://${file}`, mimeType });
      this.player.load();
    },
    savePosition() {
      if (!this.hash || !this.player) {
        return;
      }
      window.electron.send(STORE_DATA, {
        hash: this.hash,
        key: 'position',
        value: this.player.currentTime()
      });
    },
    closeVideo() {
      this.savePosition();
      this.$emit('close-video', this);
    },
    volumeDown(e, rate) {
      if (this.player) {
        if (!rate) {
          rate = VOLUME_RATE;
        }
        this.player.volume(this.player.volume() - rate);
      }
    },
    keydown(e) {
      if (e.key === 'q') {
        if (e.metaKey || e.ctrlKey || e.altKey) {
          return true;
        }
        // close window
        e.preventDefault();
        this.closeVideo();
        return;
      } else if (e.key === '1') {
        // change original video size
        e.preventDefault();
        this.resizeVideo(this.originalSize);
        return;
      } else if (e.key === '2') {
        // change 2x video size
        e.preventDefault();
        this.resizeVideo({
          width: this.originalSize.width * 2,
          height: this.originalSize.height * 2
        });
        return;
      }
      return true;
    }
  }
};
</script>
<style src="video.js/dist/video-js.css"></style>
