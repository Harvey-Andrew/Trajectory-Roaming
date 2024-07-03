import { createApp } from "vue";
import App from "./App.vue";
import ElementPlus from "element-plus";
import "element-plus/theme-chalk/index.css";
import locale from "element-plus/lib/locale/lang/zh-cn";
import "./assets/tailwind.css";
const app = createApp(App);
app.config.globalProperties.$viewer = null;

app.use(ElementPlus, { locale }).mount("#app");
