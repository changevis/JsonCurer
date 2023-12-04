<template>
  <el-row>
    <el-col :span="6">
      <span class="label-style">New Key Name</span>
    </el-col>
    <el-col :span="18">
      <el-select
        v-model="formData.newKey"
        filterable
        allow-create
        :reserve-keyword="false"
      >
        <el-option
          v-for="item in options"
          :key="item"
          :label="item"
          :value="item"
        />
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
      newKey: options.value[0],
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
