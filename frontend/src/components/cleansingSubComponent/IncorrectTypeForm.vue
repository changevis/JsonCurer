<template>
  <el-row>
    <el-col :span="6">
      <span class="label-style">Target Type</span>
    </el-col>
    <el-col :span="16">
      <el-select
          v-model="formData.targetType"
        >
        <el-option
          v-for="(v, k) in typeShortMapFull"
          :key="v"
          :label="v"
          :value="k" />
      </el-select>
    </el-col>
  </el-row>
</template>

<script lang="ts">
import {
  defineComponent,
  onMounted,
  reactive,
  watch,
} from 'vue';
import { typeShortMapFull } from '@/utils/types';

export default defineComponent({
  emits: ['paramChange'],
  setup(_, { emit }) {
    const formData = reactive({
      targetType: 'n',
    });

    watch(formData, () => {
      emit('paramChange', JSON.stringify(formData));
    });

    onMounted(() => {
      emit('paramChange', JSON.stringify(formData));
    });

    return {
      typeShortMapFull,
      formData,
    };
  },
});
</script>

<style scoped>
@import url(@/components/cleansingSubComponent/form-style.less);
</style>
