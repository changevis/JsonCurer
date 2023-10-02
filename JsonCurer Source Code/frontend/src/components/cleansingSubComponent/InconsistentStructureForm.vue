<template>
  <el-row>
    <el-col :span="6" class="label-style">Target Structure</el-col>
    <el-col :span="12">
      <el-select
          v-model="formData.targetStructure"
          popper-class="select-popper"
        >
        <el-option
          v-for="(item) in inconsistentChildNodes"
          :key="item.id"
          :label="item.path.slice(0, item.path.length-1).join('->')"
          :value="item.id"
        >
        </el-option>
      </el-select></el-col>
  </el-row>
  <el-row>
    <el-col :span="6" class="label-style">Structure Mapping</el-col>
    <el-col :span="12">
      <el-table
        :data="tableData"
        size="small"
      >
        <el-table-column
          :label="`target structure`"
          prop="target">
        </el-table-column>
        <el-table-column
          v-for="(item, index) in columnMappingOptions"
          :key="item.id"
          :label="`sub-structure ${index+1}`"
        >
          <template #default="scope">
            <el-select
              v-model="formData.mappings[
                `${item.id}:${formData.targetStructure}:${tableData[scope.$index].target}`
              ]"
              size="small"
            >
            <el-option
              v-for="(opt, idx) in item.relaPath"
              :key="idx"
              :label="opt"
              :value="opt.endsWith('.key') ? `${item.truePos[idx]}.key` : item.truePos[idx]"
            >
            </el-option>
          </el-select>
          </template>
        </el-table-column>
      </el-table>
    </el-col>
  </el-row>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  watch,
  onMounted,
  computed,
} from 'vue';
import { useStore } from '@/store';

export default defineComponent({
  emits: ['paramChange'],
  setup(_, { emit }) {
    const store = useStore();

    const inconsistentChildNodes = store.getters.getCurrentIssueIds
      .slice(1)
      .map((id: number) => {
        const path = [];
        const pathids = [];
        const nodes: any = store.state.flattenedNode;
        const childPath = nodes[id].children
          .map((item: any) => item.key)
          .join(', ');
        const childIds = nodes[id].children
          .map((item: any) => item.id)
          .join(', ');
        path.push(childPath);
        pathids.push(childIds);

        let tmp = id;
        while (tmp !== null) { // id为0是根
          if (nodes[tmp].key) {
            path.push(nodes[tmp].key.split('#;')
              .join('/'));
          } else if (nodes[tmp].type.length === 1 && nodes[tmp].type[0] === 'd') {
            path.push('{}');
          } else if (nodes[tmp].type.length === 1 && nodes[tmp].type[0] === 'a') {
            path.push('[]');
          } else {
            path.push('Unamed Target');
          }
          pathids.push(nodes[tmp].id);
          tmp = nodes[tmp].parentId;
        }
        path.reverse();
        pathids.reverse();
        return {
          id,
          path,
          pathids,
        };
      });

    const formData = reactive({
      targetStructure: inconsistentChildNodes[0].id,
      mappings: {},
    });

    // 以下两个全部依赖formData.targetStructure
    const tableData = computed(() => {
      const targetSP = inconsistentChildNodes.filter(
        (item: any) => item.id === formData.targetStructure,
      )[0].path;
      const path = targetSP.slice(-1)[0].split(', ')
        .map((key: string) => ({ target: key }));
      if (targetSP.length >= 2 && !['[]', '{}'].includes(targetSP.slice(-2)[0])) {
        const keyName = targetSP.slice(-2)[0];
        const pathWithPrefix = path.map(({ target: item } : {target: string}) => ({ target: `${keyName}.${item}` }));
        pathWithPrefix.push({ target: `${keyName}.key` });
        return pathWithPrefix;
      }
      return path;
    });

    const columnMappingOptions = computed(() => inconsistentChildNodes.filter(
      (item: any) => item.id !== formData.targetStructure,
    )
      .map((item: any) => ({
        ...item, // 保留id
        path: item.path.slice(-2),
        pathids: item.pathids.slice(-2),
      })) // [问题strcuture的起点，它的孩子们]
      .map(({ path, id, pathids } : any) => ({
        id,
        relaPath: [
          `${path[0]}.key`,
          ...path[1].split(', ')
            .map((key: string) => `${path[0]}.${key}`),
        ],
        truePos: [
          `${pathids[0]}`,
          ...path[1].split(', ')
            .map((key: string) => `${pathids[0]}.${key}`),
        ],
      })));

    watch(formData, () => {
      emit('paramChange', JSON.stringify(formData));
    });

    onMounted(() => {
      emit('paramChange', JSON.stringify(formData));
    });

    return {
      formData,
      inconsistentChildNodes,
      tableData,
      columnMappingOptions,
    };
  },
});
</script>

<style scoped>
@import url(@/components/cleansingSubComponent/form-style.less);
</style>
