<template>
  <div>
    <video ref="videoPlayer" class="video-js"></video>
  </div>
</template>
<style src="video.js/dist/video-js.css"></style>
<script>
import videojs from 'video.js';

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
        sources: [
          {
            src:
              'local-resource:///Users/kunix/Documents/dev/vplayer/src/assets/video.mp4',
            type: 'video/mp4'
          }
        ]
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
      this.ready = true;
      this.player.on('loadeddata', () => {
        this.loadedData();
      });
      this.player.on('componentresize', () => {});
      this.player.on('ready', () => {});
    },
    loadedData() {
      window.electron.send('loaded-data', {});
    },
    loadMedia(file) {
      this.player.loadMedia({ src: `local-resource://${file}` }, e => {
        console.log(e);
      });
    }
  },
  mounted() {
    this.player = videojs(this.$refs.videoPlayer, this.options, () => {
      this.playerReady();
    });
    // fixme イベントを定数に
    window.electron.on('open-file', files => {
      console.log(files);
      if (files && files.length) {
        this.loadMedia(files[0]);
      }
    });
  },
  beforeUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }
};
</script>
