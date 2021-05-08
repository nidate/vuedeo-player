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
  mounted() {
    this.player = videojs(
      this.$refs.videoPlayer,
      this.options,
      function onPlayerReady() {
        console.log('onPlayerReady', this);
      }
    );
  },
  beforeUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }
};
</script>
