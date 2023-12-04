<template>
  <el-row>
    <el-col :span="6">
      <span class="label-style">Transformation</span>
    </el-col>
    <el-col :span="16">
      <el-select
          v-model="formData.transformBy"
        >
        <el-option key="delete" label="delete" value="delete" />
        <el-option key="replace" label="replace" value="replace" />
      </el-select>
    </el-col>
  </el-row>
  <el-row v-if="formData.transformBy === 'delete'">
    <el-col :span="4">
      <span class="label-style">Delete its</span>
    </el-col>
    <el-col :span="6">
      <el-input-number v-model="formData.deleteLevel" :step="1" :min="0"></el-input-number>
    </el-col>
    <el-col :span="7">
      <span class="label-style">level ancestor node</span>
    </el-col>
  </el-row>
  <el-row v-else>
    <el-col :span="6">
      <span class="label-style">Replace by</span>
    </el-col>
    <el-col :span="16">
      <el-input v-model="formData.replaceBy"></el-input>
    </el-col>
  </el-row>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  watch,
  onMounted,
} from 'vue';

export default defineComponent({
  emits: ['paramChange'],
  setup(_, { emit }) {
    const formData = reactive({
      transformBy: 'delete',
      deleteLevel: 0,
      replaceBy: 'null',
    });

    watch(formData, () => {
      emit('paramChange', JSON.stringify(formData));
    });

    onMounted(() => {
      emit('paramChange', JSON.stringify(formData));
    });

    return {
      formData,
    };
  },
});
</script>

<style scoped>
@import url(@/components/cleansingSubComponent/form-style.less);
</style>
