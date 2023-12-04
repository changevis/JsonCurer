<template>
  <el-row>
    <el-col :span="6">
      <span class="label-style">Transformation</span>
    </el-col>
    <el-col :span="16">
      <el-select
          v-model="formData.transformBy"
        >
        <el-option label="Turn To Dict" :key="1" value="dict"></el-option>
        <el-option label="Join To String" :key="2" value="string"></el-option>
      </el-select>
    </el-col>
  </el-row>
  <el-row>
    <el-col :span="6">
      <span class="label-style">New Key Name</span>
    </el-col>
    <el-col :span="16">
      <el-input v-model="formData.newKeyName" />
    </el-col>
  </el-row>
  <el-row v-show="formData.transformBy === 'string'">
    <el-col :span="6">
      <span class="label-style">Join By</span>
    </el-col>
    <el-col :span="16">
      <el-input v-model="formData.joinBy" placeholder="e.g. -,." />
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
      transformBy: 'dict',
      newKeyName: '',
      joinBy: '',
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
