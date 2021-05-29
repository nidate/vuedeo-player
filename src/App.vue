<template>
  <div
    class="video-player"
    @drop="dropFiles"
    @dragenter.prevent
    @dragover.prevent
  >
    <video-player />
  </div>
</template>

<script>
import VideoPlayer from './components/VideoPlayer.vue';
import { OPEN_WINDOW } from './events';

export default {
  name: 'App',
  components: {
    VideoPlayer
  },
  mounted() {},
  methods: {
    dropFiles(e) {
      e.preventDefault();
      e.stopPropagation();
      const files = [];
      for (const file of e.dataTransfer.files) {
        files.push(file.path);
      }
      window.electron.send(OPEN_WINDOW, { files });
    }
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  mergin: 0;
}
</style>
