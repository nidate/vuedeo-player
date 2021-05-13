<template>
  <div class="video-player">
    <video-player />
  </div>
</template>

<script>
import VideoPlayer from './components/VideoPlayer.vue';

export default {
  name: 'App',
  components: {
    VideoPlayer
  },
  mounted() {}
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
