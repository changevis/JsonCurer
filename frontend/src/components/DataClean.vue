<template>
  <div id="transform-wrapper-box" class="transform-wrapper">
    <component
      v-if="transformationForm.length > 0"
      :is="transformationForm"
      @param-change="handleIssueParamChange"
    >
    </component>

    <el-row
      v-if="transformationForm.length > 0 && transformationForm !== 'not-support'"
      justify="end" style="padding-bottom:11px"
    >
      <el-button type="primary" :disabled="disableClean" @click="showPreView"> Preview </el-button>
      <el-button :disabled="disableClean" @click="confirmTransformation"> Confirm </el-button>
      <el-button :disabled="disableClean" @click="cancelTransformation" class="button">
        Cancel
      </el-button>
    </el-row>
  </div>
</template>
<script lang="ts">
import {
  defineComponent, onMounted, ref, watch, computed,
} from 'vue';
import elementResizeDetectorMarker from 'element-resize-detector';
import { useStore } from '@/store';
import db from '@/store/db';
import InconsistentTypeForm from '@/components/cleansingSubComponent/InconsistentTypeForm.vue';
import NotSupport from '@/components/cleansingSubComponent/NotSupport.vue';
import AllDupForm from '@/components/cleansingSubComponent/AllDupForm.vue';
import EmptyForm from '@/components/cleansingSubComponent/EmptyForm.vue';
import HierKeyForm from '@/components/cleansingSubComponent/HierKeyForm.vue';
import RedundantInteriorForm from '@/components/cleansingSubComponent/RedundantInteriorForm.vue';
import InconsistentValueForm from '@/components/cleansingSubComponent/InconsistentValueForm.vue';
import InconsistentKeyForm from '@/components/cleansingSubComponent/InconsistentKeyForm.vue';
import MissingKeyForm from '@/components/cleansingSubComponent/MissingKeyForm.vue';
import InconsistentStructureForm from '@/components/cleansingSubComponent/InconsistentStructureForm.vue';
import IncorrectTypeForm from '@/components/cleansingSubComponent/IncorrectTypeForm.vue';
import DataAssociationForm from '@/components/cleansingSubComponent/DataAssociationForm.vue';
import RedundantPaddingForm from '@/components/cleansingSubComponent/RedundantPaddingForm.vue';
import RedundantKeyForm from '@/components/cleansingSubComponent/RedundantKeyForm.vue';
import { curateFormData, generateDescription, generateLogInfo } from '@/utils/util';

export default defineComponent({
  components: {
    InconsistentTypeForm,
    NotSupport,
    AllDupForm,
    EmptyForm,
    HierKeyForm,
    RedundantInteriorForm,
    InconsistentValueForm,
    InconsistentKeyForm,
    MissingKeyForm,
    InconsistentStructureForm,
    IncorrectTypeForm,
    DataAssociationForm,
    RedundantPaddingForm,
    RedundantKeyForm,
  },
  emits: ['heightChange'],
  setup(_, { emit }) {
    const store = useStore();
    const transformationForm = ref('');
    const disableClean = computed(() => store.getters.banButton);
    const erd = elementResizeDetectorMarker();
    let paramJson = '';

    watch(
      () => store.getters.getCurrentForm,
      () => {
        transformationForm.value = store.getters.getCurrentForm;
      },
    );

    function showPreView() {
      store.dispatch('transPreview', {
        issueType: store.getters.getCurrentIssue,
        parameters: paramJson,
        modeDiff: true,
      });
    }

    async function confirmTransformation() {
      // 判断是用户触发了preview之后再点击的confirm
      // 还是配置完表单之后直接confirm的
      if (!store.state.editorDiffOn) {
        await store.dispatch('transPreview', {
          issueType: store.getters.getCurrentIssue,
          parameters: paramJson,
          modeDiff: false,
        });
      }
      const targetEditorValue = store.state.editorDiffValue;
      const currentEditorValue = store.state.jsonData;
      const logLen = store.state.log.length;
      // 还需要加一个处理逻辑负责记录当前dismissedIssue，返回的issue又将已经dismiss的返回
      store.commit(
        'addLog',
        generateLogInfo(
          store.getters.getCurrentIssue,
          generateDescription(store.getters.getCurrentIssueDesc, store.getters.getCurrentIssue),
          store.state.transformationDesc,
        ),
      );
      db.add({ id: logLen + 1, value: currentEditorValue });
      const formData = curateFormData(targetEditorValue, store.state.dictSim, store.state.arrSim);
      await store.dispatch('updateJson', {
        formData,
        editorValue: targetEditorValue,
        type: 'transform',
      });
      store.commit('updateDiffMode', {
        mode: false,
        diffContent: '',
      });
      store.commit('updateTransformationDesc', '');
    }

    function cancelTransformation() {
      store.commit('updateDiffMode', {
        mode: false,
        diffContent: '',
      });

      store.commit('updateTransformationDesc', '');
    }

    function handleIssueParamChange(value: string) {
      paramJson = value;
    }

    onMounted(() => {
      const wrapperBox = document.getElementById('transform-wrapper-box');
      if (!wrapperBox) return;
      erd.listenTo(wrapperBox, (element: HTMLElement) => {
        const contentHeight = element.offsetHeight;
        emit('heightChange', contentHeight);
      });
    });

    return {
      transformationForm,
      showPreView,
      confirmTransformation,
      cancelTransformation,
      handleIssueParamChange,
      disableClean,
    };
  },
});
</script>

<style lang="less" scoped>
.transform-wrapper {
  width: 100%;
}

.button {
  margin-right: 20px;
}
</style>
