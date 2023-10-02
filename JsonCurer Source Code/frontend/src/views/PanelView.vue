<!-- eslint-disable vuejs-accessibility/click-events-have-key-events -->
<template>
  <div class="panel">
    <div class="left">
      <div class="headline">
        JsonCurer
       </div>
       <div class="view-style" style="height: calc(100vh - 40px);">
        <json-editor />
       </div>
    </div>
    <div class="mid view-style">
      <div class="tree-schema-view">
        <tree-schema />
      </div>
    </div>
    <div class="right view-style">
      <data-quality />
    </div>

    <a-tooltip placement="top">
        <template v-slot:title>
          <span>{{
            !visible ? 'Show History' : 'Hide Hository'
          }}</span>
        </template>
        <div class="handler" @click="showDrawer">
          <span>{{ !visible ? '>' : '<' }}</span>
        </div>
      </a-tooltip>
      <a-drawer
      v-model:visible="visible"
      class="custom-class"
      title="Cleansing History View"
      placement="left"
      @after-visible-change="afterVisibleChange"
    >
      <ol style="padding-inline: 10px;">
        <li
          v-for="(item, i) in historyLog"
          :key="i"
          v-html="item"
        >
        </li>
      </ol>
    </a-drawer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useStore } from '@/store';
import TreeSchema from '@/components/TreeSchema.vue';
import JsonEditor from '@/components/JsonEditor.vue';
import DataQuality from '@/components/DataQuality.vue';

export default defineComponent({
  name: 'panelView',
  components: { TreeSchema, JsonEditor, DataQuality },
  setup() {
    const store = useStore();
    const visible = ref<boolean>(false);
    const historyLog = computed(() => store.state.log);

    const afterVisibleChange = (bool: boolean) => {
      console.log('visible', bool);
    };

    const showDrawer = () => {
      visible.value = true;
    };
    return {
      visible,
      afterVisibleChange,
      showDrawer,
      historyLog,
    };
  },
});

</script>

<style scoped lang="less">
.panel {
  display: flex;
  flex-flow: row;
  width: calc(100vw - 10px);
  height: calc(100vh - 10px);
  column-gap: 5px;

  .left {
    flex: 5;
    height: calc(100vh - 40px);
  }
  .right{
    flex: 7;
  }
  .mid{
    flex: 12;
    display: flex;
    flex-flow: column;

    .tree-schema-view {
      flex: 1;
    }
  }

  .view-style{
    box-shadow: 0px 0px 0px 3px #90c1d760 inset;
    padding: 3px;
    background: #fffffe;
  }
}

.handler {
  background: #90c1d760;
  color: #90c1d7;
  cursor: pointer;
  font-size: 9px;
  height: 70px;
  line-height: 70px;
  position: absolute;
  text-align: center;
  top: 50%;
  transform: translateY(-100%);
  width: 12px;
  z-index: 101;
  margin-left: 3px;

  &::before,
  &::after {
    border: 6px solid #90c1d760;
    content: '';
    height: 0;
    left: 0;
    position: absolute;
    width: 0;
  }

  &::before {
    border-right-color: transparent;
    border-top-color: transparent;
    top: -12px;
  }

  &::after {
    border-bottom-color: transparent;
    border-right-color: transparent;
    bottom: -12px;
  }
}

.handler:hover {
  background: #90c1d760;
  color: #fff;

  &::before {
    border: 6px solid #90c1d760;
    border-right-color: transparent;
    border-top-color: transparent;
  }

  &::after {
    border: 6px solid #90c1d760;
    border-bottom-color: transparent;
    border-right-color: transparent;
  }
}

.highlight-line {
  background: #90c1d760;
  height: 100%;
  position: absolute;
  right: 0;
  top: 0;
  width: 0;
  z-index: 100;
}

.handler:hover + .highlight-line {
  background: #90c1d760;
  width: 1px;
}

.headline {
  font-size: 26px;
  font-weight: 700;
  line-height: 30px;
  color: whitesmoke;
  background-color: #90c1d7;
  padding-left: 7px;
}
</style>
