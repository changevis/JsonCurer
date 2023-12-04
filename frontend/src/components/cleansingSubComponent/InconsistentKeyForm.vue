<template>
  <el-row>
    <el-col :span="6">
      <span class="label-style">Target Key</span>
    </el-col>
    <el-col :span="16">
      <el-input v-model="formData.targetKey"/>
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
import { useStore } from '@/store';

export default defineComponent({
  emits: ['paramChange'],
  setup(_, { emit }) {
    const store = useStore();
    const formData = reactive({
      targetKey: store.getters.getCurrentIssueDesc?.[0]
        .split('#;')
        .join(',') || '',
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
