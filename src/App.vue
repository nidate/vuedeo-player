<template>
  <div class="video-player">
    <video-player @resize-video="resizeWindow" @close-video="closeWindow" />
  </div>
</template>

<script>
import VideoPlayer from './components/VideoPlayer.vue';
import { RESIZE_WINDOW, CLOSE_WINDOW } from './events';

export default {
  name: 'App',
  components: {
    VideoPlayer
  },
  mounted() {},
  methods: {
    resizeWindow({ width, height }) {
      window.electron.send(RESIZE_WINDOW, {
        width,
        height,
        // fixme compute controller's margin
        marginHeight: 21
      });
    },
    closeWindow() {
      window.electron.send(CLOSE_WINDOW);
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
  margin: 0;
}
</style>
