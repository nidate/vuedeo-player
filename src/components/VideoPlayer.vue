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
      this.player.on('loadeddata', e => {
        console.log(e);
        this.aspectChanged();
      });
      this.player.on('componentresize', e => {
        console.log(e);
      });
      this.player.on('ready', e => {
        console.log(e);
      });
    },
    aspectChanged() {
      window.electron.changeAspect(this.aspectRatio);
    }
  },
  mounted() {
    this.player = videojs(this.$refs.videoPlayer, this.options, () => {
      this.playerReady();
    });
  },
  beforeUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }
};
</script>
