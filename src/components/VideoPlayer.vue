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
import { RESIZE_WINDOW, CLOSE_WINDOW, OPEN_FILE } from '../events';

export default {
  name: 'VideoPlayer',
  data() {
    return {
      player: null,
      originalSize: {},
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
      this.ready = true;
      this.player.on('loadeddata', () => {
        this.loadedData();
      });
      this.player.on('componentresize', () => {});
      this.player.on('ready', () => {
        console.log('ready');
      });
      window.electron.on(OPEN_FILE, files => {
        if (files && files.length) {
          this.load(files[0]);
        }
      });
    },
    loadedData() {
      // resize window size
      const dimensions = this.player.currentDimensions();
      this.originalSize = dimensions;
      this.resizeWindow(dimensions);
    },
    resizeWindow({ width, height }) {
      window.electron.send(RESIZE_WINDOW, {
        width: Math.ceil(width),
        height: Math.ceil(height),
        // fixme compute controller's mergin
        merginHeight: 21
      });
    },
    load(file) {
      const ext = extname(file).toLowerCase();
      let type = 'video/mp4';
      if (ext === '.mp4') {
        type = 'video/mp4';
      }
      this.player.src({ src: `local-resource://${file}`, type });
      this.player.load();
    },
    closeVideo() {
      window.electron.send(CLOSE_WINDOW);
    },
    keydown(e) {
      if (e.key === 'q') {
        // close window
        e.preventDefault();
        this.closeVideo();
        return;
      } else if (e.key === '1') {
        // change original video size
        e.preventDefault();
        this.resizeWindow(this.originalSize);
        return;
      } else if (e.key === '2') {
        // change 2x video size
        e.preventDefault();
        this.resizeWindow({
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
