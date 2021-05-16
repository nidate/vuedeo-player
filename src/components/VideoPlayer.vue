<template>
  <div>
    <video ref="videoPlayer" class="video-js"></video>
  </div>
</template>
<style src="video.js/dist/video-js.css"></style>
<script>
import videojs from 'video.js';
import 'videojs-hotkeys';
import { extname } from 'path';
import { RESIZE_WINDOW, OPEN_FILE } from '../events';

export default {
  name: 'VideoPlayer',
  data() {
    return {
      player: null,
      options: {
        fluid: true,
        fill: true,
        responsive: true,
        controls: true,
        sources: []
      }
    };
  },
  computed: {},
  methods: {
    playerReady() {
      console.log('playerReady');
      this.ready = true;
      this.player.on('loadeddata', () => {
        this.loadedData();
      });
      this.player.on('componentresize', () => {});
      this.player.on('ready', () => {
        console.log('ready');
      });
    },
    loadedData() {
      const dimensions = this.player.currentDimensions();
      window.electron.send(RESIZE_WINDOW, {
        width: Math.ceil(dimensions.width),
        height: Math.ceil(dimensions.height),
        // fixme compute controller's mergin
        merginHeight: 21
      });
    },
    load(file) {
      console.log('load');
      const ext = extname(file).toLowerCase();
      let type = 'video/mp4';
      if (ext === '.mp4') {
        type = 'video/mp4';
      }
      this.player.src({ src: `local-resource://${file}`, type });
      this.player.load();
    }
  },
  mounted() {
    console.log('mounted');
    this.player = videojs(this.$refs.videoPlayer, this.options, () => {
      this.player.hotkeys();
      this.playerReady();
      window.electron.on(OPEN_FILE, files => {
        if (files && files.length) {
          this.load(files[0]);
        }
      });
    });
  },
  beforeUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }
};
</script>
