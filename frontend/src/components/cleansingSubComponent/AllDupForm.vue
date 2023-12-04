<template>
  <el-row>
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
      deleteLevel: 0,
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
