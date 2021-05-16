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
  computed: {
    aspectRatio() {
      const dimensions = this.player.currentDimensions();
      if (!(dimensions && dimensions.width && dimensions.height)) {
        return 16 / 9;
      }
      return dimensions.width / dimensions.height;
    }
  },
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
      window.electron.send('loaded-data', {});
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
      // fixme イベントを定数に
      window.electron.on('open-file', files => {
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
