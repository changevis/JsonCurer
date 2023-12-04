<template>
  <div class="section-wrapper">
    <div class="section-header">
      <span class="head-text">
        <span v-if="!diffStatus">Data View</span>
        <span v-else>Diff View</span>
        <div class="head-banner"></div>
      </span>
      <span class="toolbar">
        <span class="controller">
          <a-select
            ref="select"
            :value="currentCase"
            :options="caseOption"
            size="small"
            :getPopupContainer="(triggerNode) => triggerNode.parentNode"
            @change="handleCaseChange"
          ></a-select>
        </span>
        <span class="controller">
          <a-upload
            name="file"
            accept=".json"
            v-model:file-list="fileList"
            :customRequest="handleUpload"
            :showUploadList="false"
            :max-count="1"
            @change="handleUploadChange"
          >
            <a-button size="small">
              <upload-outlined></upload-outlined>
              Upload
            </a-button>
          </a-upload>
        </span>
        <span class="controller">
          <a-button
            size="small"
            @click="handleDownloadClick">
            <download-outlined />
            Download
          </a-button>
        </span>
      </span>

    </div>
    <div class="editor-container">
      <div ref="editorWrapper" class="editor"></div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent, onMounted, ref, watch,
} from 'vue';
import { useStore } from '@/store';
import { message } from 'ant-design-vue';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons-vue';
import type { UploadChangeParam } from 'ant-design-vue';
import * as monaco from 'monaco-editor';
import { SelectProps } from 'ant-design-vue/lib/vc-select';
import { areStringEqual, curateFormData } from '@/utils/util';

const editorDefaultOptions: any = {
  value: '',
  language: 'json',
  theme: 'vs',
  fontSize: 16,
  glyphMargin: false,
  automaticLayout: true,
  autoIndent: 'advanced',
  readOnly: false,
  lineNumbersMinChars: 1,
};

export default defineComponent({
  name: 'JSONEditor',
  components: {
    UploadOutlined,
    DownloadOutlined,
  },
  setup() {
    let editor: any;
    const editorWrapper = ref();
    const fileList = ref([]);
    const currentCase = ref('case1');
    let previousEditorContent: string;
    const store = useStore();
    const diffStatus = computed(() => store.state.editorDiffOn);
    let decorations: monaco.editor.IEditorDecorationsCollection | null = null;

    const caseOption = ref<SelectProps['options']>([
      {
        value: 'case1',
        label: 'case1',
      },
      {
        value: 'case2',
        label: 'case2',
      },
      {
        value: 'case3',
        label: 'case3',
      },
      {
        value: 'case4',
        label: 'case4',
      },
    ]);

    const showFileContent = (file: any) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result);
    });

    const initEditor = () => {
      if (editor) { // 销毁之前diff的实例
        editor.dispose();
      }
      const editorOptions = {
        ...editorDefaultOptions,
        value: store.state.jsonData || '',
      };
      editor = monaco.editor.create(editorWrapper.value, editorOptions);

      editor.onDidBlurEditorText(async () => { // 失焦触发
        if (monaco.editor.getModelMarkers({}).length !== 0) {
          message.error('Invalid JSON Syntax');
          return;
        }

        const value = editor.getValue();
        if (areStringEqual(previousEditorContent, value)) return; // 忽略换行还有空格之后比较字符串是否相等
        const formData = curateFormData(value, store.state.dictSim, store.state.arrSim);
        store.dispatch('updateJson', {
          formData,
          editorValue: value,
          type: 'handFix',
        });
        previousEditorContent = value;
      });
    };

    const initDiffEditor = () => {
      if (editor) {
        editor.dispose(); // 销毁之前非diff的实例
      }
      const editorDiffOptions = {
        ...editorDefaultOptions,
        readOnly: true,
        renderSideBySide: false,
      };
      editor = monaco.editor.createDiffEditor(editorWrapper.value, editorDiffOptions);
      editor.setModel({
        original: monaco.editor.createModel(store.state.jsonData, editorDiffOptions.language),
        modified:
          monaco.editor.createModel(store.state.editorDiffValue, editorDiffOptions.language),
      });
    };

    const updateDecoration = (mode: 'remove' | 'add' = 'add', shift = false) => {
      if (decorations) {
        decorations.clear();
      }

      if (mode === 'remove') {
        return;
      }

      const virtualDiv = document.createElement('div');
      const diffEditor = monaco.editor.createDiffEditor(virtualDiv);
      diffEditor.setModel({
        original: monaco.editor.createModel(store.state.jsonData, editorDefaultOptions.language),
        modified:
          monaco.editor.createModel(
            store.state.editorDecorationValue,
            editorDefaultOptions.language,
          ),
      });
      diffEditor.onDidUpdateDiff(() => {
        const lineChanges = diffEditor.getLineChanges();
        let startAndEnd = lineChanges?.map(
          ({ originalStartLineNumber, originalEndLineNumber }) => (
            {
              startRow: originalStartLineNumber,
              endRow: originalEndLineNumber,
            }),
        );
        if (startAndEnd && startAndEnd.length === 0) {
          startAndEnd = [
            {
              startRow: 1,
              endRow: 1,
            },
          ];
        }
        if (!startAndEnd) return;
        const startLine = startAndEnd[0].startRow;
        const collection = startAndEnd.map(
          ({ startRow, endRow }) => ({
            range: new monaco.Range(
              shift ? startRow - 1 : startRow,
              1,
              shift ? endRow - 1 : endRow,
              1,
            ),
            options: {
              isWholeLine: true,
              className: 'line-decoration',
              minimap: {
                color: '#ff0000',
                position: 1,
              },
            },
          }),
        );
        editor.revealLineInCenter(startLine, 0);
        decorations = editor.createDecorationsCollection(collection);
      });
    };

    // 用于preview与confirm、cancel之间的状态切换
    watch(() => store.state.editorDiffOn, (cur: boolean, prev: boolean) => {
      if (cur === true && prev === false) {
        initDiffEditor();
      } else if (cur === false && prev === true) {
        initEditor();
      }
    });

    watch(
      [() => store.state.editorDecorationOn, () => store.state.editorDecorationValue],
      ([mode, content]) => {
        if (diffStatus.value || !editor) return; // diff模式下无法开启decoration

        const { shift } = store.state;
        if (mode && content) {
          updateDecoration('add', shift);
        } else {
          updateDecoration('remove', shift);
        }
      },
      { immediate: true, deep: true },
    );

    watch(() => store.state.jsonData, (cur: any, prev: any) => {
      if (store.state.editorDiffOn || !editor) return;
      if (!(typeof cur === 'string') && !(typeof prev === 'string')) return;
      if (areStringEqual(cur, prev)) return;

      // 如果有decoration，移除
      if (store.state.editorDecorationOn) {
        updateDecoration('remove');
      }
      editor.setValue(cur);
      previousEditorContent = cur;
    });

    const handleUploadChange = (info: UploadChangeParam) => {
      if (info.file.status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (info.file.status === 'done') {
        message.success(`${info.file.name} file uploaded successfully`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    };

    const handleUpload = async (e: any) => {
      const isLt300M = (e.file.size / 1024 / 1024) < 300;
      if (!isLt300M) {
        message.error('File must smaller than 300MB!');
        e.onError('Json file must smaller than 300MB!');
        return;
      }
      const filecontent = await showFileContent(e.file);
      let editorValue = '';
      if (typeof filecontent === 'string') {
        previousEditorContent = filecontent;
        editor.setValue(filecontent);
        editorValue = filecontent;
      } else {
        message.error('invalid filereader result');
        return;
      }

      const formData = curateFormData(editorValue, store.state.dictSim, store.state.arrSim);

      store.dispatch('updateJson', {
        formData,
        editorValue,
        type: 'upload',
      });
    };

    const handleCaseChange = async (value: string) => {
      currentCase.value = value;
      await store.dispatch('updateCase', {
        case: currentCase.value,
      });
      previousEditorContent = store.state.jsonData;
      editor.setValue(store.state.jsonData);
    };

    onMounted(async () => {
      await store.dispatch('updateCase', {
        case: currentCase.value,
      });
      initEditor();
    });

    const handleDownloadClick = () => {
      const link = document.createElement('a');
      link.download = 'data.json';
      link.href = `data:text/plain,${store.state.jsonData}`;
      link.click();
    };

    return {
      editorWrapper,
      fileList,
      handleUploadChange,
      handleUpload,
      caseOption,
      handleCaseChange,
      currentCase,
      diffStatus,
      handleDownloadClick,
    };
  },
});
</script>

<style lang="less" scoped>
@import url('../utils/common-style.less');
.editor-container{
    flex: 1;
    padding: 1px 5px 5px 5px;
    .editor {
      height: 100%;
    }
  }

:deep(.ant-btn-sm) {
  height: 26px;
  font-size: @toolbarFontSize;
}

:deep(.ant-select-arrow) {
  font-size: 10px;
  margin-top: -3px;
}

:deep(.ant-select-selection-item) {
  font-size: @toolbarFontSize;
}

:deep(.ant-select-arrow) {
  margin-top: -2px;
}

:deep(.ant-select-single.ant-select-sm:not(.ant-select-customize-input) .ant-select-selector) {
  height: 24px;
}

:deep(.ant-select-item-option) {
  padding: 0px 14px;
  font-size: 14px;
  min-height: 14px;
}
</style>
