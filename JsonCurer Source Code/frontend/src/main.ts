import { createApp } from 'vue';
import {
  Upload,
  message,
  Button,
  Switch,
  InputNumber,
  Select,
  Drawer,
  Tooltip,
  Input,
  Dropdown,
  Menu,
} from 'ant-design-vue';
import {
  ElTabs,
  ElTree,
  ElTooltip,
  ElScrollbar,
  ElForm,
  ElRow,
  ElCol,
  ElSelect,
  ElButton,
  ElEmpty,
  ElInput,
  ElInputNumber,
  ElTable,
  ElLoading,
} from 'element-plus';
import App from './App.vue';
import router from './router';
import 'ant-design-vue/dist/antd.css';
import 'element-plus/dist/index.css';
import { store, key } from './store';

const app = createApp(App);
// app.config.productionTip = false;

app.use(router)
  .use(store, key)
  .use(Upload)
  .use(Button)
  .use(Switch)
  .use(InputNumber)
  .use(Select)
  .use(Drawer)
  .use(Tooltip)
  .use(Input)
  .use(Menu)
  .use(Dropdown)
  .use(ElTree)
  .use(ElTabs)
  .use(ElTooltip)
  .use(ElScrollbar)
  .use(ElForm)
  .use(ElRow)
  .use(ElCol)
  .use(ElSelect)
  .use(ElButton)
  .use(ElEmpty)
  .use(ElInput)
  .use(ElInputNumber)
  .use(ElTable)
  .use(ElLoading)
  .mount('#app');
app.config.globalProperties.$message = message;

message.config({
  duration: 2,
  maxCount: 2,
  top: '70px',
});
