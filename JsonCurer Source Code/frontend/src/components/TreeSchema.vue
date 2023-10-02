<template>
  <div v-loading="loading" class="section-wrapper">
    <div class="section-header">
      <span class="head-text">
        Schema View
        <div class="head-banner"></div>
      </span>
      <span class="toolbar">
        <span class="controller">
          <span>Dict Similarity:</span>
            <a-input-number
              v-model:value="dictSim"
              size="small"
              :controls="false"
              :min="0"
              :max="1"
              @blur="handleDictSimChange"
              @pressEnter="handleEnter"
            />
        </span>
        <span class="controller">
          <span>Array Similarity:</span>
          <a-input-number
            v-model:value="arrSim"
            size="small"
            :controls="false"
            :min="0"
            :max="1"
            @blur="handleArrSimChange"
            @pressEnter="handleEnter"
          />
        </span>
        <div class="controller">
          <span>Summary Visulization:</span>
          <a-switch v-model:checked="showAttrView" size="small" @change="handleSwitchChange"/>
        </div>
      </span>
    </div>
    <a-dropdown
    :trigger="['contextmenu']"
    :visible="contextMenuVisible"
    @visibleChange="contextMenuVisibleChange"
    >
    <template #overlay>
      <a-menu
        @click="closeMenuAndAddIssue"
      >
        <a-sub-menu
          v-for="(menu) in abledMenu"
          :key="menu.item"
          :title="menu.item"
        >
          <a-menu-item
            v-for="(item) in menu.subItem"
            :key="item.issue"
            :disabled="!item.disabled"
          >
          {{ item.issue }}
          </a-menu-item>
      </a-sub-menu>
      </a-menu>
    </template>
    <div class="schema-tree-container"></div>
    </a-dropdown>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import {
  defineComponent, watch, ref, computed, onMounted, nextTick, onUnmounted,
} from 'vue';
import { issueSpec, useStore } from '@/store';
import {
  customIssue,
  generalIssueTypes,
  specificIssueTypes,
  TypeNode,
  undetectedIssueTypes,
} from '@/utils/types';
import {
  TreeChart, dataProcessWithId, nodeDrawData,
} from '@/utils/treeDraw';
import { message } from 'ant-design-vue';
import { bubbleFill, bubbleOpacity } from '@/utils/style';

export default defineComponent({
  name: 'treeSchema',
  setup() {
    const loading = ref<boolean>(false);
    const showAttrView = ref<boolean>(true);
    const dictSim = ref<number>(0.5);
    const arrSim = ref<number>(0.5);
    const store = useStore();
    const contextMenuVisible = computed(() => store.state.contextMenuVisible);
    const abledMenu = computed(() => store.getters.abledContextMenu);
    let chartInstance: any = null;

    function loadSchema():void {
      const treeDescription: TypeNode = JSON.parse(store.state.jsonSchema);
      const datawithId = dataProcessWithId(treeDescription);
      store.commit('setFlattenedNode', datawithId);
      const curatedData = nodeDrawData(datawithId, store.state.showAttr);
      const cliqueData = store.getters.activeClique;
      chartInstance = new TreeChart([2, 1], '.schema-tree-container', curatedData, store, cliqueData);
      chartInstance.render();
    }

    watch(() => store.state.loading, (cur) => {
      loading.value = cur;
    });

    watch(() => store.getters.generateBubbleData, (cur) => {
      // activeClique有三个触发变化的依赖
      // 第一是点击legend触发某一类的隐藏与消失
      // 第二是contextmenu声明某个issue
      // 第三是dismissIssue的确认与撤销

      // 初次渲染和节点收起展开不走这里的逻辑
      if (d3.selectAll('path.clique')
        .empty() && store.state.treeInitialRender) {
        return;
      }
      d3.select('.group-mask')
        .selectAll('path.clique')
        .data(cur, (d: any) => `${d.issueId}${d.pathd}`)
        .join(
          (enter: any) => enter.append('path')
            .attr('class', (d: any) => `clique c${d.issueId}`)
            .attr('d', (d: any) => d.pathd)
            .classed('clique-border', (d: any) => (d.issueId === store.state.selectedIssue))
            .attr('fill-opacity', 0)
            .transition()
            .duration(500)
            .attr('fill', (d: any) => bubbleFill[d.cliqueIssueType as keyof typeof bubbleFill])
            .attr('fill-opacity', bubbleOpacity)
            .attr('cursor', 'pointer'),
          (update: any) => update,
          (exit: any) => exit.transition()
            .duration(500)
            .attr('opacity', 0)
            .remove(),
        );
      // 如果新增了issue
    }, { deep: true, immediate: true });

    watch(() => store.state.jsonSchema, () => {
      store.commit('setTreeInitialRender', true);
      loadSchema();
    });

    watch(showAttrView, () => {
      store.commit('setTreeInitialRender', true);
      loadSchema();
    });

    watch(() => store.state.zoomToCenter, (cur, prev) => {
      if (cur === false) return;
      // 将当前bubble移到画布中心
      const bubble = d3.select(`.clique.c${store.state.selectedIssue}`);
      if (bubble.empty() || !chartInstance) {
        store.commit('setZoomToCenter', false);
        return;
      }
      const bbox = (bubble?.node() as SVGGraphicsElement).getBBox();
      chartInstance.triggerZoom(
        {
          targetx: bbox.x,
          targety: bbox.y,
          width: bbox.width,
          height: bbox.height,
        },
      );
      store.commit('setZoomToCenter', false);
    });

    const clearEditorHighlight = () => {
      store.commit('updateDecorationMode', {
        mode: false,
        decorationContent: '',
        shift: false,
      });
    };

    const handleDictSimChange = async () => {
      store.commit('updateDictSim', dictSim.value);
      await store.dispatch('updateSim', {
        dictSim: dictSim.value,
        arrSim: arrSim.value,
      });
      clearEditorHighlight();
    };
    const handleArrSimChange = async () => {
      store.commit('updateArrSim', arrSim.value);
      await store.dispatch('updateSim', {
        dictSim: dictSim.value,
        arrSim: arrSim.value,
      });
      clearEditorHighlight();
    };

    const handleEnter = (e: any) => {
      e.target.blur();
    };

    const handleSwitchChange = (value: any) => {
      store.commit('toggleShowAttr', value);
      clearEditorHighlight();
    };

    const contextMenuVisibleChange = (value: boolean) => {
      if (store.state.selectedNode.length === 0 && value === true) return;
      store.commit('setContextMenuVisibility', value);
    };

    const alreadyExisted = (cIssue: customIssue): boolean => {
      // 依据gType sType 以及location是否相同来判断
      const idx = store.state.issues.findIndex((issue: issueSpec) => issue.type === cIssue.gType);
      if (idx === -1) return true;
      const currentGT = store.state.issues[idx];
      const subIdx = currentGT.details.findIndex((t) => t === cIssue.sType);
      if (subIdx === -1) return false;
      const already = currentGT.locations[subIdx].map(
        (v) => v.sort()
          .toString(),
      );
      const target = cIssue.location.sort()
        .toString();
      if (already.findIndex((s) => s === target) !== -1) {
        return true;
      }
      return false;
    };

    const clearSelectedNodeAndUnstyle = () => {
      d3.selectAll('.full-rect')
        .classed('selected', false);
      store.commit('clearSelectedNode');
    };

    const closeMenuAndAddIssue = (e: any) => {
      store.commit('setContextMenuVisibility', false);

      const gType: generalIssueTypes = e.keyPath[0];
      const sType: specificIssueTypes | undetectedIssueTypes = e.keyPath[1];
      const sNode = store.state.selectedNode;
      const sortedsNode = sNode.sort((a, b) => a.depth - b.depth);
      const description = sortedsNode
        .map(({ name }) => name);
      const location = sortedsNode
        .map(({ id }) => id);
      const representation = sortedsNode
        .map(({ id }) => store.state.flattenedNode[id].data)
        .reduce((a, b) => [...a, ...b], []);
      const cIssue: customIssue = {
        gType,
        sType,
        location,
        description,
        representation,
      };
      // 需要判断一下完全相同的issue已经存在
      if (alreadyExisted(cIssue)) {
        message.error('Issue Already Existed! Please Reselect!');
        store.commit('clearSelectedNode');
        return;
      }
      store.commit('addCustomIssue', cIssue);
      clearSelectedNodeAndUnstyle();
    };

    const hanldeKeyDown = (e: any) => {
      if (e.code !== 'Escape') {
        return;
      }
      store.commit('clearSelectedNode');
      d3.selectAll('.full-rect')
        .classed('selected', false);

      store.commit('updateDecorationMode', {
        mode: false,
        decorationContent: '',
        shift: false,
      });
    };

    onMounted(() => {
      nextTick(() => {
        document.addEventListener('keydown', hanldeKeyDown);
      });
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', hanldeKeyDown);
    });

    return {
      showAttrView,
      dictSim,
      arrSim,
      handleSwitchChange,
      handleDictSimChange,
      handleArrSimChange,
      handleEnter,
      contextMenuVisible,
      contextMenuVisibleChange,
      abledMenu,
      closeMenuAndAddIssue,
      loading,
    };
  },

});
</script>

<style lang="less" scoped>
@import url('../utils/common-style.less');
.schema-tree-container {
    flex: 1;
}

:deep(.ant-input-number-sm) {
  width: 40px;
  height: 20px;
  font-size: 10px;
  input {
    height: 18px;
  }
}

.section-wrapper .head-banner {
  width: 145px;
}
</style>
