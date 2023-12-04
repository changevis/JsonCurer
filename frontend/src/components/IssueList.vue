<!-- eslint-disable vuejs-accessibility/click-events-have-key-events -->
<template>
  <div id="list-wrapper-box" class="list-wrapper">
  <el-tabs v-model="activeKey" class="demo-tabs">
    <el-tab-pane name="1">
      <template #label>
        <span class="custom-tabs-label">
          <span>Issues ({{ activeIssueCount }})</span>
        </span>
      </template>
      <div id="issue-scroll-box">
        <el-scrollbar style="height: 100%">
          <el-tree
            ref="treeRef"
            :current-node-key="selectedKey"
            :data="issueTree"
            node-key="id"
            show-checkbox
            show-icon
            highlight-current
            default-expand-all
            @node-click="issueNodeClick"
            @check-change="checkboxChange"
            >
            <template #default="{ node, data }">
            <span class="custom-tree-node">
              <el-tooltip
                :content="node.label"
                raw-content
                :disabled="showTooltip"
                :open-delay="300"
                placement="left-start"
              >
                <span
                  class="over-ellipsis"
                  v-html="node.label"
                  @mouseover="showLabel"
                  @focus="showLabel"
                >
                </span>
              </el-tooltip>
              <span class="right-icon">
                <span @click.stop="remove(node, data)">
                  <delete-outlined />
                </span>
              </span>
            </span>
          </template>
          </el-tree>
        </el-scrollbar>
      </div>
    </el-tab-pane>
    <el-tab-pane name="2">
      <template #label>
        <span class="custom-tabs-label">
          <span>Dismissed ({{ inactiveIssueCount }})</span>
        </span>
      </template>
      <div id="dismiss-scroll-box">
        <el-scrollbar style="height: 100%">
          <el-tree
            :data="dismissedIssueTree"
          >
          <template #default="{ node, data }">
            <span class="custom-tree-node dismiss-tree">
              <el-tooltip
                :content="node.label"
                raw-content
                :disabled="showTooltip"
                :open-delay="300"
                placement="top-start"
              >
                <span
                  class="over-ellipsis"
                  v-html="node.label"
                  @mouseover="showLabel"
                  @focus="showLabel"
                >
                </span>
              </el-tooltip>
              <span class="right-icon">
                <span @click.stop="restore(node, data)">
                  <undo-outlined />
                </span>
              </span>
            </span>
          </template>
          </el-tree>

        </el-scrollbar>
      </div>
    </el-tab-pane>
  </el-tabs>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import { useStore, issueNode } from '@/store';
import { specificIssueTypes } from '@/utils/types';
import {
  computed,
  defineComponent,
  nextTick,
  ref,
  watch,
  onMounted,
} from 'vue';
import elementResizeDetectorMarker from 'element-resize-detector';
import { DeleteOutlined, UndoOutlined } from '@ant-design/icons-vue';
import { ElTooltip, ElTree } from 'element-plus';
import type Node from 'element-plus/es/components/tree/src/model/node';

export default defineComponent({
  components: {
    DeleteOutlined,
    UndoOutlined,
    ElTooltip,
    ElTree,
  },
  setup() {
    const activeKey = ref('1');
    const store = useStore();
    const showTooltip = ref(false);
    const issueTree = computed<Array<issueNode>>(() => store.getters.activeIssue);
    const dismissedIssueTree = computed<Array<issueNode>>(() => store.getters.inactiveIssue);
    const selectedKey = ref<string>('0-0-0');
    const treeRef = ref<InstanceType<typeof ElTree>>();
    const activeIssueCount = computed(() => store.getters.activeIssueCount);
    const inactiveIssueCount = computed(() => store.getters.inactiveIssueCount);
    const erd = elementResizeDetectorMarker();

    onMounted(() => {
      const wrapperBox = document.getElementById('list-wrapper-box');
      if (!wrapperBox) return;
      erd.listenTo(wrapperBox, (element: HTMLElement) => {
        const issueScrollBox = document.getElementById('issue-scroll-box');
        const dismissScrollBox = document.getElementById('dismiss-scroll-box');
        if (!issueScrollBox || !dismissScrollBox) return;
        issueScrollBox.style.width = `${(element.offsetWidth - 8)}px`;
        issueScrollBox.style.height = `${(element.offsetHeight - 34)}px`;
        dismissScrollBox.style.width = `${(element.offsetWidth - 8)}px`;
        dismissScrollBox.style.height = `${(element.offsetHeight - 34)}px`;
      });
    });

    const issueNodeClick = ({ id }: issueNode) => {
      if ((Object.values(specificIssueTypes) as Array<string>).includes(id)) {
        return;
      }
      selectedKey.value = id;
    };

    const updateCliqueHighlight = (cur: string, prev: string, mode: 'issue2schema' | 'schema2issue') => {
      d3.select(`.clique.c${prev}`)
        .classed('clique-border', false);
      d3.select(`.clique.c${cur}`)
        .classed('clique-border', true);
      if (mode === 'issue2schema') {
        store.commit('setZoomToCenter', true);
      }
    };

    // 从issue list到schema view的交互
    watch(selectedKey, (cur, prev) => {
      store.commit('updateSelectedIssue', cur);
      updateCliqueHighlight(cur, prev, 'issue2schema');
    });

    // 从shcema view 到issue list的交互
    watch(() => store.state.selectedIssue, (cur, prev) => {
      updateCliqueHighlight(cur, prev, 'schema2issue');
      selectedKey.value = cur;
      const node = treeRef.value?.getNode(cur);
      if (node && node.parent) {
        nextTick(() => {
        // 渲染后再获取新的当前节点
          const nodeDom = document.querySelectorAll('.el-tree-node.is-expanded.is-current')[0];
          nodeDom.scrollIntoView({ block: 'center' });
        });
      }
    });

    const notParent = (dataId: string) => (!(Object.values(specificIssueTypes) as Array<string>)
      .includes(dataId));

    const remove = (node: Node, data: issueNode) => {
      const { parent } = node;
      const children: issueNode[] = parent.data.children || parent.data;
      const index = children.findIndex((d) => d.id === data.id);
      let shouldAssignKey;

      if (!notParent(children[index].id)) { // 当前删除的是大类
        children[index].children?.forEach(({ id }) => {
          if (id === selectedKey.value) shouldAssignKey = true;
          store.commit('addDismissedIssue', id);
        });
      } else { // 当前删除的是子类
        store.commit('addDismissedIssue', children[index].id);
        shouldAssignKey = selectedKey.value === children[index].id;
      }

      // 分类讨论 当前选中了a，但是删除的是b，需要指定selectedKey
      if (shouldAssignKey
      && issueTree.value
      && issueTree.value[0]
      && issueTree.value[0].children) { // 当先选中了a，同时也删除a,需要重新更新默认选中的
        const nextid = issueTree.value[0].children[0].id;
        selectedKey.value = nextid;
        treeRef.value?.setCurrentKey(selectedKey.value);
      }
    };

    const restore = (node: Node, data: issueNode) => {
      const { parent } = node;
      const children: issueNode[] = parent.data.children || parent.data;
      const index = children.findIndex((d) => d.id === data.id);
      if (!notParent(children[index].id)) { // 当前删除的是大类
        children[index].children?.forEach(({ id }) => {
          store.commit('removeDismissedIssue', id);
        });
      } else { // 当前删除的是子类
        store.commit('removeDismissedIssue', children[index].id);
      }
    };

    const showLabel = (event: any) => {
      showTooltip.value = event?.currentTarget.scrollWidth <= event?.currentTarget.clientWidth;
    };

    const checkboxChange = () => {
      // 此处默认用户不会跨类别选择
      const selectedChildren = treeRef.value?.getCheckedKeys(true)
        .map((item) => `${item}`);
      store.commit('setBatchIssue', selectedChildren);
    };

    return {
      issueTree,
      activeKey,
      treeRef,
      remove,
      restore,
      issueNodeClick,
      selectedKey,
      showLabel,
      showTooltip,
      dismissedIssueTree,
      activeIssueCount,
      inactiveIssueCount,
      checkboxChange,
    };
  },
});
</script>

<style scoped lang="less">
.list-wrapper {
  box-sizing: border-box;
  padding: 0 3px 0px 3px;
  height: calc(100% - 22px);
  border-right: 2px solid #90c1d760;
}

.custom-tabs-label {
  padding-left: 2px;
  padding-right: 4px;
  font-size: 16px;
}
.el-tabs {
    --el-tabs-header-height: 26px;
}

.custom-tree-node {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  box-sizing: border-box;
  max-width: 83%;
  min-width: 83%;

  &.dismiss-tree {
    max-width: 90%;
    min-width: 90%;
  }

  &:hover{
    .right-icon{
      visibility: visible;
    }
  }
}

.over-ellipsis {
  display: block;
  width: calc(100% - 22px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  -webkit-line-clamp: 1;
  font-size: 16px;
}

.right-icon {
  min-width: 20px;
  width: 20px;
  height: 20px;
  text-align: center;
  visibility: hidden;
}

:deep(.el-scrollbar__view) {
  height: 100%;
}

.el-scrollbar .el-scrollbar__wrap {
  overflow-x: hidden;
}

.el-tree {
  background: none;
  height: 100%;
}

:deep(.el-tabs__header) {
  margin: 0 0 4px;
}
</style>
