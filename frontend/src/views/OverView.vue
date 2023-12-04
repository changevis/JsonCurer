<template>
  <div class="wrapper">
    <!-- <div class="headline">
      JsonCurer
    </div> -->
    <div class="sub-view">
      <panel-view />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import PanelView from './PanelView.vue';

export default defineComponent({
  name: 'overView',
  components: {
    PanelView,
  },
});
</script>

<style scoped lang="less">
.wrapper{
  display: flex;
  flex-flow: column;
  background-color: #fffffe;
  height: 100vh;
  width: 100vw;
  overflow-x: hidden;
  overflow-y: hidden;

  .sub-view {
    padding: 5px;
  }
}
</style>
