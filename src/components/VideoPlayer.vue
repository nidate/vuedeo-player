<template>
  <div class="parent">
    <div @keydown="keydown">
      <video
        ref="videoPlayer"
        class="video-js"
        @drop="dropFiles"
        @dragenter.prevent
        @dragover.prevent
      />
    </div>
    <div v-show="seekbarActive" class="thumb">
      <video ref="thumbnail" :src="resourceUrl" />
    </div>
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
  VOLUME_DOWN,
  SET_WINDOW_TITLE
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
      mimeType: null,
      startTime: 0,
      playbackRate: 1,
      seekUntil: 0, // 指定秒になるまで早送り再生する
      seekRate: 3,
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
      },
      history: [],
      historyIndex: 0,
      seekbarActive: false,
      seekTime: 0
    };
  },
  computed: {
    resourceUrl() {
      if (this.file) {
        return `local-resource://${this.file}`;
      }
      return '';
    }
  },
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
        volumeUpKey: () => {},
        forwardKey: (e) => {
          if (['ArrowRight'].includes(e.key)) {
            component.restorePlaybackRate(true);
            return true;
          }
          return false;
        },
        rewindKey: (e) => {
          if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
            component.restorePlaybackRate(true);
            return true;
          }
          return false;
        },
        playPauseKey: (e) => {
          if (e.key === ' ') {
            const seeking = component.seekUntil;
            component.restorePlaybackRate(true);
            if (seeking) {
              return false;
            }
            return true;
          }
        },
        seekStep: (e) => {
          let step = 5;
          // seek step up
          if (e.key === 'ArrowUp') {
            step = step * 3;
          }
          const rate = this.playbackRate || 1;
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
              component.restorePlaybackRate(true);
              let rate = Math.round(player.playbackRate() * 100) + 10;
              player.playbackRate(rate / 100);
            }
          },
          playbackRateDown: {
            key: (e) => e.key === '[',
            handler: (player) => {
              component.restorePlaybackRate(true);
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
              component.restorePlaybackRate(true);
              player.playbackRate(1);
            }
          },
          // 一定時間早送り
          seekForward: {
            key: (e) => {
              return ['ArrowDown', 'z', 'x', 'c', 'v', 'b'].includes(e.key);
            },
            handler: (player, options, e) => {
              if (e.key == 'z') {
                component.smoothSeek(1.5, 5);
              } else if (e.key == 'x') {
                component.smoothSeek(3, 15);
              } else if (e.key == 'c') {
                component.smoothSeek(6, 18);
              } else if (e.key == 'v') {
                component.smoothSeek(10, 30);
              } else if (['ArrowDown', 'b'].includes(e.key)) {
                component.smoothSeek(15, 45);
              }
            }
          }
        }
      });
      this.player.on('timeupdate', () => {
        component.restorePlaybackRate();
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
        // send OPEN_WINDOW event on electron/preload/index.js
        window.electron.openWindow({ files });
      }
    },
    pushHistory() {
      if (
        this.player &&
        this.file &&
        !this.history.find((h) => h.hash === this.hash)
      ) {
        this.history.push({
          hash: this.hash,
          file: this.file,
          fileInfo: this.fileInfo,
          mimeType: this.mimeType
        });
      }
    },
    updateHistory() {
      if (this.player && this.file) {
        this.player.pause();
        this.savePosition();
        this.history[this.historyIndex].fileInfo.position =
          this.player.currentTime();
      }
    },
    changeHistory() {
      const { hash, file, fileInfo, mimeType } =
        this.history[this.historyIndex];
      window.electron.send(SET_WINDOW_TITLE, { file, name: fileInfo.name });
      this.load({ file, hash, fileInfo, mimeType });
    },
    historyBack() {
      if (this.historyIndex + 1 < this.history.length) {
        this.updateHistory();
        this.historyIndex += 1;
        this.changeHistory();
      }
    },
    historyForward() {
      if (this.historyIndex > 0) {
        this.updateHistory();
        this.historyIndex -= 1;
        this.changeHistory();
      }
    },
    // called after videojs initialized
    playerReady() {
      this.state = STATE.READY;
      this.player.on('loadeddata', () => {
        this.loadedData();
      });
      const progressControl = this.player
        .getChild('ControlBar')
        ?.getChild('ProgressControl');
      const seekbar = progressControl?.getChild('SeekBar');
      if (seekbar) {
        progressControl.on('mousemove', (e) => {
          this.seekbarActive = true;
          this.seekTime =
            seekbar.calculateDistance(e) * seekbar.player_.duration();
          this.setThumbnail(this.seekTime);
        });
        progressControl.on('mouseleave', () => {
          this.seekbarActive = false;
        });
      }
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
      this.mimeType = mimeType;
      this.startTime = fileInfo.position;
      this.player.src({ src: this.resourceUrl, mimeType });
      this.player.load();
      this.pushHistory();
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
      } else if (e.key === ';') {
        e.preventDefault();
        this.historyBack();
        return false;
      } else if (e.key === "'") {
        e.preventDefault();
        this.historyForward();
        return false;
      }
      return true;
    },
    // 一定時間早送りにする
    smoothSeek(rate, second) {
      if (!rate || !this.player) {
        return;
      }
      if (!second) {
        second = rate;
      }
      if (this.seekUntil === 0) {
        this.playbackRate = this.player.playbackRate();
        this.seekUntil = this.player.currentTime() + second;
      } else {
        if (this.player.playbackRate() == rate) {
          this.seekUntil = this.seekUntil + second;
        } else {
          this.seekUntil = this.player.currentTime() + second;
        }
      }
      this.player.playbackRate(rate);
    },
    restorePlaybackRate(force) {
      if (this.seekUntil) {
        const currentTime = this.player.currentTime();
        if (force) {
          this.seekUntil = currentTime - 1;
        }
        const rate = this.player.playbackRate();
        if (
          (rate > 0 && this.seekUntil < currentTime) ||
          (rate < 0 && this.seekUntil > currentTime)
        ) {
          this.seekUntil = 0;
          this.player.playbackRate(this.playbackRate);
        }
      }
    },
    setThumbnail(time) {
      this.$refs.thumbnail.currentTime = time;
    }
  }
};
</script>
<style src="video.js/dist/video-js.css"></style>
<style>
.thumb {
  position: absolute;
  bottom: 30px;
  right: 0px;
  width: 30%;
  height: 30%;
  color: white;
  opacity: 90%;
  background-color: rgb(255 255 255 / 40%);
}
.thumb video {
  width: 100%;
  height: 100%;
}
</style>
