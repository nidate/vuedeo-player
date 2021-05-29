<template>
  <div v-on:keydown="keydown">
    <video ref="videoPlayer" class="video-js"></video>
  </div>
</template>
<style src="video.js/dist/video-js.css"></style>
<script>
import videojs from 'video.js';
import 'videojs-hotkeys';
import { extname } from 'path';
import { CLOSE_WINDOW, OPEN_FILE, STORE_DATA } from '../events';

const STATE = {
  INIT: 'INIT',
  READY: 'READY',
  LOADING: 'LOADING',
  ACTIVE: 'ACTIVE'
};

export default {
  name: 'VideoPlayer',
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
        playbackRates: [0.5, 0.75, 1, 1.5, 2, 3]
      }
    };
  },
  computed: {},
  methods: {
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
    load({ file, hash, fileInfo }) {
      // save last opend file position
      this.savePosition();
      // load new file
      this.state = STATE.LOADING;
      this.file = file;
      this.hash = hash;
      this.fileInfo = fileInfo;
      this.startTime = fileInfo.position;
      const ext = extname(file).toLowerCase();
      let type = 'video/mp4';
      if (ext === '.mp4') {
        type = 'video/mp4';
      }
      this.player.src({ src: `local-resource://${file}`, type });
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
      window.electron.send(CLOSE_WINDOW);
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
  },
  mounted() {
    const component = this;
    this.player = videojs(this.$refs.videoPlayer, this.options, () => {
      this.player.hotkeys({
        enableHoverScroll: true,
        alwaysCaptureHotkeys: true,
        enableNumbers: false,
        // override up, down
        volumeUpKey: () => {
          return false;
        },
        volumeDownKey: () => {
          return false;
        },
        forwardKey: e => {
          return ['ArrowUp', 'ArrowRight'].includes(e.key);
        },
        rewindKey: e => {
          return ['ArrowDown', 'ArrowLeft'].includes(e.key);
        },
        seekStep: e => {
          const step = 5;
          // seek step up
          if (e.key === 'ArrowUp' || e.which === 'ArrowDown') {
            return step * 3;
          }
          return step;
        },
        customKeys: {
          // change playback rate '[' ']' '\'
          // todo indicate current playback rate on the screen
          playbackRateUp: {
            key: e => {
              return e.key === '\\';
            },
            handler: player => {
              let rate = Math.round(player.playbackRate() * 100) + 10;
              player.playbackRate(rate / 100);
            }
          },
          playbackRateDown: {
            key: e => e.key === '[',
            handler: player => {
              let rate = Math.round(player.playbackRate() * 100) - 10;
              if (rate <= 0) {
                rate = player.playbackRate();
              }
              player.playbackRate(rate / 100);
            }
          },
          playbackRateReset: {
            key: e => e.key === ']',
            handler: player => {
              player.playbackRate(1);
            }
          }
        }
      });
      component.playerReady();
    });
  },
  beforeUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }
};
</script>
