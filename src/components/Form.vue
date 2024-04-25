<template>
  <el-form
    ref="form"
    class="form"
    :model="formData"
    :rules="rules"
    label-position="top"
  >
    <!-- <el-form-item label="开发指南">
      <a
        href="https://bytedance.feishu.cn/docx/HazFdSHH9ofRGKx8424cwzLlnZc"
        target="_blank"
        rel="noopener noreferrer"
      >
        多维表格插件开发指南
      </a>
    </el-form-item> -->
    <el-form-item label="上传书签html文件">
      <el-upload
        ref="upload"
        class="upload-box"
        drag
        :auto-upload="false"
        :show-file-list="false"
        :accept="'.html'"
        :on-change="handleUploadChange"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">拖动文件到此或者<em>点击选择</em></div>
      </el-upload>
    </el-form-item>
    <el-form-item label="选择书签文件夹" size="large" prop="treeId">
      <el-tree-select
        v-model="formData.treeId"
        :data="bookmarksArray"
        :props="customProps"
        :value-consists-of="valueConsistsOf"
        check-strictly
        :render-after-expand="true"
        show-checkbox
        node-key="id"
        :multiple="false"
        @current-change="handleCurrentChange"
        placeholder="请选择书签文件夹"
        style="width: 100%"
      />
    </el-form-item>
    <el-form-item label="选择数据表" size="large" prop="table">
      <el-select
        v-model="formData.table"
        placeholder="请选择数据表"
        style="width: 100%"
      >
        <el-option
          v-for="meta in tableMetaList"
          :key="meta.id"
          :label="meta.name"
          :value="meta.id"
        />
      </el-select>
    </el-form-item>
  </el-form>
  <el-form-item>
    <el-button
      type="primary"
      size="large"
      @click="addRecord(form)"
      style="width: 100%"
      >导入选中的书签组</el-button
    >
    <div>只包含当前文件夹内书签，不包含子文件夹内的书签</div>
  </el-form-item>
</template>

<script setup>
import { bitable } from "@lark-base-open/js-sdk";
import { ref, reactive, onMounted } from "vue";
import {
  ElMessage,
  ElMessageBox,
  ElButton,
  ElForm,
  ElFormItem,
  ElSelect,
  ElOption,
  ElUpload,
} from "element-plus";
import {
  parseBookmarksHtml,
  addDisabledProperty,
  getHeaderList,
  findObjectByName,
  addRecordsWithTitlesAndUrls,
  findNodeById,
} from "../utils.js";

const formData = ref({ table: "", treeId: "" });
const form = ref();
const rules = reactive({
  table: [
    {
      required: true,
      message: "请选择数据表",
      trigger: "blur",
    },
  ],
  treeId: [
    {
      required: true,
      message: "请选择书签文件夹",
      trigger: "change",
    },
  ],
});

const bookmarksArray = ref([]);

/**
 * 处理上传文件的变化事件
 * @param {Object} param - 包含上传文件信息的对象
 * @param {File} param.raw - 上传的文件
 */
const handleUploadChange = ({ raw }) => {
  console.log("选择文件", raw);
  if (raw) {
    const reader = new FileReader();
    reader.readAsText(raw); // 读取上传文件的内容
    reader.onload = (e) => {
      try {
        let htmlContent = e.target.result;

        // 解析HTML内容，提取书签信息
        let list = parseBookmarksHtml(htmlContent); // 根据实际HTML结构调整选择器

        // 将解析得到的书签信息存储到变量中
        bookmarksArray.value = addDisabledProperty(list);
        // bookmarksArray.value = addDisabledProperty(list[0].children);
        console.log(list, "bookmarksArray", bookmarksArray.value);
        ElMessage({
          message: "书签导入成功！",
          type: "success",
        });
      } catch (err) {
        // 如果解析过程中出现错误，则记录错误并清空书签信息
        console.error("解析书签时出错", err);
        bookmarksArray.value = [];
        ElMessage({
          message: "解析书签时出错",
          type: "error",
        });
      }
    };
  }
};

// 定义如何将内部值映射到组件属性
const valueConsistsOf = ["value"];

// 定义自定义的 `props` 来匹配你的数据字段
const customProps = {
  label: "title",
  value: "id",
  children: "children",
};
const handleCurrentChange = (value, node) => {
  console.log(value, "树控件选择变化", node);
  console.log(formData.value.treeId, "树控件选择变化", formData.value);
  // 处理当前节点变化的逻辑
};

// 添加记录
const addRecord = async (formEl) => {
  // let list = await getHeaderList();
  // let titleObj = findObjectByName(list, "标题");
  // let urlObj = findObjectByName(list, "网址");
  // console.log(titleObj, "指定表头信息", urlObj);

  if (!formEl) return;
  // await formEl.validate((valid, fields) => {
  //   if (valid) {
  //     console.log("submit!");
  //   } else {
  //     console.log("error submit!", fields);
  //   }
  // });

  try {
    // 尝试验证表单
    await formEl.validate();
    // 如果没有抛出错误，说明验证通过，继续执行提交逻辑
    console.log("submit!");
    // 在这里编写表单提交的代码
  } catch (errors) {
    // 如果在验证过程中抛出了错误，说明验证失败
    console.error("error submit!", errors);
    // 打印或处理错误信息
  }

  const tableId = formData.value.table;
  if (tableId) {
    const table = await bitable.base.getTableById(tableId);

    const treeId = formData.value.treeId;
    const dataArray = bookmarksArray.value;

    // 调用递归函数并打印结果
    const childrenArray = findNodeById(dataArray[0], treeId);

    if (!childrenArray.length) {
      ElMessage({
        message: "当前选中文件夹没有书签",
        type: "error",
      });
      return;
    }

    // 调用函数并传入 tableId 和 childrenArray
    addRecordsWithTitlesAndUrls(tableId, childrenArray)
      .then((recordIds) => {
        console.log("记录添加成功，记录 ID：", recordIds);
        ElMessage({
          message: "导入成功！",
          type: "success",
        });
      })
      .catch((error) => {
        console.error("记录添加失败：", error);
        ElMessage({
          message: "导入出错",
          type: "error",
        });
      });
  }
};

const tableMetaList = ref([]);
onMounted(async () => {
  const [tableList, selection] = await Promise.all([
    bitable.base.getTableMetaList(),
    bitable.base.getSelection(),
  ]);
  formData.value.table = selection.tableId;
  tableMetaList.value = tableList;
  console.log(tableList, "当前表格数据", selection);
});
</script>

<style lang="less" scoped>
.form :deep(.el-form-item__label) {
  font-size: 16px;
  color: var(--el-text-color-primary);
  margin-bottom: 0;
}
.form :deep(.el-form-item__content) {
  font-size: 16px;
}
.upload-box {
  width: 100%;
}

:deep(.el-upload-dragger) {
  padding: 20px;
}
</style>
