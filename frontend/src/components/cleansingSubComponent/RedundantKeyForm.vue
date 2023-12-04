<template>
  <el-row>
    <el-col :span="6">
      <span class="label-style">Transformation</span>
    </el-col>
    <el-col :span="16">
      <el-select
          v-model="formData.transformBy"
          disabled
        >
        <el-option key="delete" label="delete" value="delete" />
      </el-select>
    </el-col>
  </el-row>
   <el-row>
    <el-col :span="6">
      <span class="label-style">Keys To Delete</span>
    </el-col>
    <el-col :span="16">
      <el-select
          v-model="formData.keysToDelete"
          multiple
        >
        <el-option
          v-for="(item, i) in options"
           :key="item"
           :label="item"
           :value="i"
        ></el-option>
      </el-select>
    </el-col>
  </el-row>
</template>
<script lang="ts">
import { useStore } from '@/store';
import {
  defineComponent,
  reactive,
  watch,
  onMounted,
  computed,
} from 'vue';

export default defineComponent({
  emits: ['paramChange'],
  setup(_, { emit }) {
    const store = useStore();
    const options = computed(() => store.getters.getCurrentIssueDesc);
    const formData = reactive({
      transformBy: 'delete',
      keysToDelete: [],
    });

    watch(formData, () => {
      emit('paramChange', JSON.stringify(formData));
    });

    onMounted(() => {
      emit('paramChange', JSON.stringify(formData));
    });

    return {
      formData,
      options,
    };
  },
});
</script>

<style scoped>
@import url(@/components/cleansingSubComponent/form-style.less);
</style>
