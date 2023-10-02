<template>
  <el-row>
    <el-col :span="6">
      <span class="label-style">Transform By</span>
    </el-col>
    <el-col :span="16">
      <el-select
          v-model="formData.transformBy"
        >
        <el-option key="delete" label="Delete" value="delete" />
        <el-option key="fill" label="Fill in" value="fill" />
      </el-select>
    </el-col>
  </el-row>
  <el-row v-if="formData.transformBy === 'delete'">
    <el-col :span="6">
      <span class="label-style">Delete</span>
    </el-col>
    <el-col :span="16">
      <el-input-number v-model="formData.deleteLevel" :step="1" :min="0"></el-input-number>
    </el-col>
  </el-row>
  <el-row v-else>
    <el-col :span="6">
      <span class="label-style">Fill in with</span>
    </el-col>
    <el-col :span="16">
      <el-input v-model="formData.fillIn"></el-input>
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
import { debounce } from 'lodash';

export default defineComponent({
  emits: ['paramChange'],
  setup(_, { emit }) {
    const formData = reactive({
      transformBy: 'delete',
      deleteLevel: 1,
      fillIn: 'null',
    });

    watch(formData, debounce(() => {
      emit('paramChange', JSON.stringify(formData));
    }, 1000));
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
